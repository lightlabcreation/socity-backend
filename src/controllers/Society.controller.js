const prisma = require('../lib/prisma');

class SocietyController {
  static async getUnits(req, res) {
    try {
      const units = await prisma.unit.findMany({
        where: { societyId: req.user.societyId },
        include: { owner: true, tenant: true }
      });
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateOwnership(req, res) {
    try {
      const { id } = req.params;
      const { ownerId, tenantId } = req.body;
      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: { ownerId, tenantId }
      });
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async postNotice(req, res) {
    try {
      const { title, content, audience, expiresAt } = req.body;
      const notice = await prisma.notice.create({
        data: {
          title,
          content,
          audience,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          societyId: req.user.societyId
        }
      });
      res.status(201).json(notice);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get Society Members (Residents Directory)
   */
  static async getMembers(req, res) {
    try {
      const { type } = req.query;
      const societyId = req.user.societyId;

      const whereClause = { societyId };
      if (type === 'directory') {
        whereClause.role = 'RESIDENT';
        // Only show users who are either owners or tenants
        whereClause.OR = [
          { ownedUnits: { some: {} } },
          { rentedUnits: { some: {} } }
        ];
      }

      // Privacy: Residents can only see their own data
      if (req.user.role === 'RESIDENT') {
        whereClause.id = req.user.id;
      }

      const members = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          profileImg: true,
          createdAt: true,
          ownedUnits: {
            select: {
              id: true, block: true, number: true,
              _count: { select: { members: true, vehicles: true } }
            }
          },
          rentedUnits: {
            select: {
              id: true, block: true, number: true,
              _count: { select: { members: true, vehicles: true } }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      const formatted = members.map(m => {
        const isOwner = m.ownedUnits.length > 0;
        const isTenant = m.rentedUnits.length > 0;

        // Aggregate counts from all units (usually just one)
        const unitsList = [...m.ownedUnits, ...m.rentedUnits];
        const membersCount = unitsList.reduce((sum, u) => sum + (u._count?.members || 0), 0);
        const vehiclesCount = unitsList.reduce((sum, u) => sum + (u._count?.vehicles || 0), 0);

        return {
          ...m,
          role: isOwner ? 'OWNER' : (isTenant ? 'TENANT' : 'RESIDENT'),
          unit: unitsList[0] || null,
          avatar: m.profileImg,
          familyMembersCount: membersCount,
          vehiclesCount: vehiclesCount
        };
      });

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addMember(req, res) {
    try {
      const { name, email, phone, role, unitId, status } = req.body;
      const societyId = req.user.societyId;
      const bcrypt = require('bcryptjs');

      // Check for duplicate email
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create User
        // Map 'owner'/'tenant' to 'RESIDENT' for role enum compliance if needed, 
        // OR use the role as is if we update the enum. 
        // For now, let's keep it flexible but ensure it's a valid enum value.
        const validRoles = ['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'GUARD', 'VENDOR', 'ACCOUNTANT'];
        let userRole = role?.toUpperCase() || 'RESIDENT';
        if (!validRoles.includes(userRole)) {
          userRole = 'RESIDENT'; // Default to RESIDENT if it's 'OWNER' or 'TENANT' which are relations
        }

        const user = await tx.user.create({
          data: {
            name,
            email,
            phone,
            role: userRole,
            status: status?.toUpperCase() || 'ACTIVE',
            password: await bcrypt.hash('password123', 10), // Default password
            societyId
          }
        });

        // 2. Link to Unit
        if (unitId) {
          const isTenant = role?.toLowerCase() === 'tenant';
          await tx.unit.update({
            where: { id: parseInt(unitId) },
            data: {
              ownerId: isTenant ? undefined : user.id,
              tenantId: isTenant ? user.id : undefined,
              status: 'OCCUPIED'
            }
          });
        }
        return user;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Add Member Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllSocieties(req, res) {
    try {
      const societies = await prisma.society.findMany({
        include: {
          _count: {
            select: { units: true, users: true }
          },
          users: {
            where: { role: 'ADMIN' },
            select: { name: true, email: true },
            take: 1
          }
        }
      });

      const formattedSocieties = societies.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        status: s.status.toLowerCase(),
        subscriptionPlan: s.subscriptionPlan,
        createdAt: s.createdAt,
        city: s.city,
        state: s.state,
        pincode: s.pincode,
        expectedUnits: s.expectedUnits,
        unitsCount: s._count.units,
        usersCount: s._count.users,
        admin: s.users[0] || { name: 'N/A', email: 'N/A', phone: 'N/A' }
      }));

      res.json(formattedSocieties);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSocietyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const society = await prisma.society.update({
        where: { id: parseInt(id) },
        data: { status: status.toUpperCase() }
      });
      res.json(society);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSociety(req, res) {
    try {
      const {
        name,
        address,
        city,
        state,
        pincode,
        units,
        plan,
        adminName,
        adminEmail,
        adminPassword,
        adminPhone
      } = req.body;

      // Generate a unique code
      const code = name.toUpperCase().substring(0, 3) + Math.floor(1000 + Math.random() * 9000);

      const bcrypt = require('bcryptjs');
      const hashedPassword = adminPassword ? await bcrypt.hash(adminPassword, 10) : null;

      const data = {
        name,
        address,
        city,
        state,
        pincode,
        code,
        status: 'PENDING',
        subscriptionPlan: plan.toUpperCase(),
        expectedUnits: parseInt(units) || 0,
      };

      if (adminEmail && adminName) {
        data.users = {
          create: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword || await bcrypt.hash('password123', 10),
            phone: adminPhone,
            role: 'ADMIN'
          }
        };
      }

      const society = await prisma.society.create({
        data,
        include: {
          users: true
        }
      });

      res.status(201).json(society);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSociety(req, res) {
    try {
      const { id } = req.params;
      const { name, address, city, state, pincode, subscriptionPlan } = req.body;
      const society = await prisma.society.update({
        where: { id: parseInt(id) },
        data: {
          name,
          address,
          city,
          state,
          pincode,
          subscriptionPlan: subscriptionPlan?.toUpperCase()
        }
      });
      res.json(society);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteSociety(req, res) {
    try {
      const { id } = req.params;
      const societyId = parseInt(id);

      await prisma.$transaction(async (tx) => {
        // 1. Delete platform invoices
        await tx.platformInvoice.deleteMany({ where: { societyId } });

        // 2. Delete related complaints (and comments)
        const complaintIds = (await tx.complaint.findMany({
          where: { societyId },
          select: { id: true }
        })).map(c => c.id);

        await tx.complaintComment.deleteMany({ where: { complaintId: { in: complaintIds } } });
        await tx.complaint.deleteMany({ where: { societyId } });

        // 3. Delete visitors
        await tx.visitor.deleteMany({ where: { societyId } });

        // 4. Delete transactions
        await tx.transaction.deleteMany({ where: { societyId } });

        // 5. Delete notices
        await tx.notice.deleteMany({ where: { societyId } });

        // 6. Delete Amenity bookings and Amenities
        const amenityIds = (await tx.amenity.findMany({
          where: { societyId },
          select: { id: true }
        })).map(a => a.id);

        await tx.amenityBooking.deleteMany({ where: { amenityId: { in: amenityIds } } });
        await tx.amenity.deleteMany({ where: { societyId } });

        // 7. Delete parking slots
        await tx.parkingSlot.deleteMany({ where: { societyId } });

        // 8. Delete units
        await tx.unit.deleteMany({ where: { societyId } });

        // 9. Unlink or delete vendors
        await tx.vendor.deleteMany({ where: { societyId } });

        // 10. Delete User sessions and Users
        const userIds = (await tx.user.findMany({
          where: { societyId },
          select: { id: true }
        })).map(u => u.id);

        await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await tx.user.deleteMany({ where: { societyId } });

        // 11. Finally delete the society
        await tx.society.delete({
          where: { id: societyId }
        });
      });

      res.json({ message: 'Society and all related data deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = await prisma.society.groupBy({
        by: ['status'],
        _count: true
      });

      const formattedStats = {
        ACTIVE: 0,
        PENDING: 0,
        INACTIVE: 0
      };

      stats.forEach(item => {
        formattedStats[item.status] = item._count;
      });

      res.json(formattedStats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get Admin Dashboard Statistics
   * Aggregated data for the main Admin Dashboard overview
   */
  static async getAdminDashboardStats(req, res) {
    try {
      const societyId = req.user.societyId;
      const society = await prisma.society.findUnique({ where: { id: societyId } });

      // ========== USER COUNTS ==========
      const [totalUsers, activeUsers, inactiveUsers, pendingUsers, owners, tenants, staff, totalResidentUsers, totalFamilyMembers] = await Promise.all([
        prisma.user.count({ where: { societyId } }),
        prisma.user.count({ where: { societyId, status: 'ACTIVE' } }),
        prisma.user.count({ where: { societyId, status: 'SUSPENDED' } }),
        prisma.user.count({ where: { societyId, status: 'PENDING' } }),
        prisma.user.count({ where: { societyId, ownedUnits: { some: {} } } }),
        prisma.user.count({ where: { societyId, rentedUnits: { some: {} } } }),
        prisma.user.count({ where: { societyId, role: { in: ['GUARD', 'VENDOR', 'ACCOUNTANT'] } } }),
        prisma.user.count({
          where: {
            societyId,
            role: 'RESIDENT',
            OR: [
              { ownedUnits: { some: {} } },
              { rentedUnits: { some: {} } }
            ]
          }
        }),
        prisma.unitMember.count({ where: { unit: { societyId } } }),
      ]);

      // ========== UNIT COUNTS ==========
      const units = await prisma.unit.findMany({
        where: { societyId },
        select: { id: true, ownerId: true, tenantId: true }
      });
      const totalUnits = units.length;
      const occupiedUnits = units.filter(u => u.ownerId || u.tenantId).length;
      const vacantUnits = totalUnits - occupiedUnits;

      // ========== FINANCIAL DATA ==========
      const transactions = await prisma.transaction.findMany({
        where: { societyId },
        select: { amount: true, type: true, status: true, createdAt: true, category: true, receivedFrom: true }
      });

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Total revenue (all income)
      const totalRevenue = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      // Pending dues
      const pendingDues = transactions
        .filter(t => t.status === 'PENDING')
        .reduce((sum, t) => sum + t.amount, 0);

      // Collected this month
      const collectedThisMonth = transactions
        .filter(t => {
          const d = new Date(t.createdAt);
          return t.type === 'INCOME' && t.status === 'PAID' &&
            d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Total expenses
      const totalExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      // Parking income
      const parkingIncome = transactions
        .filter(t => t.type === 'INCOME' && t.category.toUpperCase() === 'PARKING' && t.status === 'PAID')
        .reduce((sum, t) => sum + t.amount, 0);

      // Amenity income
      const amenityIncome = transactions
        .filter(t => t.type === 'INCOME' && t.category.toUpperCase() === 'AMENITY' && t.status === 'PAID')
        .reduce((sum, t) => sum + t.amount, 0);

      // Pending vendor payments (Expences Pending)
      const pendingVendorPayments = transactions
        .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING')
        .reduce((sum, t) => sum + t.amount, 0);

      // Late fees (calculated as a subset of pending income or specific category)
      const lateFees = transactions
        .filter(t => t.type === 'INCOME' && t.category.toUpperCase() === 'LATE_FEE')
        .reduce((sum, t) => sum + t.amount, 0);

      // Monthly income data (last 3 months)
      const monthlyIncome = [];
      for (let i = 2; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - i);
        const month = targetDate.toLocaleString('default', { month: 'short' });
        const monthNum = targetDate.getMonth();
        const year = targetDate.getFullYear();

        const amount = transactions
          .filter(t => {
            const d = new Date(t.createdAt);
            return t.type === 'INCOME' && d.getMonth() === monthNum && d.getFullYear() === year;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        monthlyIncome.push({ month, amount });
      }

      // ========== ACTIVITY COUNTS ==========
      const [
        openComplaints,
        pendingVisitors,
        upcomingMeetings,
        activeVendors,
        todayVisitors,
        openPurchaseRequests,
        unfinalizedPurchaseRequests,
        escalatedComplaints
      ] = await Promise.all([
        prisma.complaint.count({ where: { societyId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.visitor.count({ where: { societyId, status: 'PENDING' } }),
        prisma.meeting.count({ where: { societyId, status: 'SCHEDULED', date: { gte: new Date() } } }),
        prisma.vendor.count({ where: { societyId, status: 'ACTIVE' } }),
        prisma.visitor.count({
          where: {
            societyId,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        prisma.purchaseRequest.count({ where: { societyId, status: 'PENDING' } }),
        prisma.purchaseRequest.count({ where: { societyId, status: 'REJECTED' } }), // Mapping Rejected as "Unfinalized" for now
        prisma.complaint.count({ where: { societyId, status: 'OPEN', escalatedToTech: true } }),
      ]);

      // ========== DEFAULTERS ==========
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const defaultersList = await prisma.transaction.findMany({
        where: {
          societyId,
          status: 'PENDING',
          createdAt: { lt: thirtyDaysAgo }
        },
        select: {
          receivedFrom: true,
          amount: true,
          category: true,
          createdAt: true
        },
        orderBy: { amount: 'desc' },
        take: 10
      });

      // ========== RECENT ACTIVITIES ==========
      const recentActivities = [];

      // Recent payments
      const recentPayments = await prisma.transaction.findMany({
        where: { societyId, type: 'INCOME', status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { receivedFrom: true, amount: true, createdAt: true, category: true }
      });
      recentPayments.forEach(p => {
        recentActivities.push({
          type: 'payment',
          user: p.receivedFrom || 'Unknown',
          action: `Paid ${p.category} of Rs. ${p.amount.toLocaleString()}`,
          time: p.createdAt,
          status: 'success'
        });
      });

      // Recent complaints
      const recentComplaints = await prisma.complaint.findMany({
        where: { societyId },
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: { reportedBy: { select: { name: true } } }
      });
      recentComplaints.forEach(c => {
        recentActivities.push({
          type: 'complaint',
          user: c.reportedBy?.name || 'Unknown',
          action: `Reported ${c.title} - ${c.priority} Priority`,
          time: c.createdAt,
          status: 'warning'
        });
      });

      // Sort by time
      recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      res.json({
        societyName: society?.name || 'Your Community',
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          pending: pendingUsers,
          owners,
          tenants,
          staff,
          totalResidents: totalResidentUsers + totalFamilyMembers,
        },
        units: {
          total: totalUnits,
          occupied: occupiedUnits,
          vacant: vacantUnits,
        },
        finance: {
          totalRevenue,
          pendingDues,
          collectedThisMonth,
          totalExpenses,
          defaultersCount: defaultersList.length,
          monthlyIncome,
          incomePeriod: {
            start: firstDayOfCurrentMonth,
            end: now
          },
          parkingIncome,
          amenityIncome,
          pendingVendorPayments,
          lateFees,
        },
        activity: {
          openComplaints,
          pendingVisitors,
          upcomingMeetings,
          activeVendors,
          todayVisitors,
          openPurchaseRequests,
          unfinalizedPurchaseRequests,
          escalatedComplaints,
        },
        defaulters: defaultersList,
        recentActivities: recentActivities.slice(0, 5),
      });

    } catch (error) {
      console.error('Admin Dashboard Stats Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ========== GUIDELINES MANAGEMENT (Super Admin) ==========

  static async getGuidelines(req, res) {
    try {
      const { societyId } = req.query;
      const where = societyId ? { societyId: parseInt(societyId) } : {};

      const guidelines = await prisma.communityGuideline.findMany({
        where,
        include: {
          society: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(guidelines);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createGuideline(req, res) {
    try {
      const { societyId, title, content, category } = req.body;

      if (!societyId || !title || !content || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const guideline = await prisma.communityGuideline.create({
        data: {
          societyId: parseInt(societyId),
          title,
          content,
          category: category.toUpperCase()
        },
        include: {
          society: {
            select: { id: true, name: true }
          }
        }
      });

      res.status(201).json(guideline);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateGuideline(req, res) {
    try {
      const { id } = req.params;
      const { title, content, category } = req.body;

      const guideline = await prisma.communityGuideline.update({
        where: { id: parseInt(id) },
        data: {
          title,
          content,
          category: category.toUpperCase()
        },
        include: {
          society: {
            select: { id: true, name: true }
          }
        }
      });

      res.json(guideline);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteGuideline(req, res) {
    try {
      const { id } = req.params;

      await prisma.communityGuideline.delete({
        where: { id: parseInt(id) }
      });

      res.json({ success: true, message: 'Guideline deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = SocietyController;

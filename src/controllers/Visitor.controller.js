const prisma = require('../lib/prisma');
const cloudinary = require('../config/cloudinary');

class VisitorController {
  static async list(req, res) {
    try {
      const { status, search, unitId, date, block } = req.query;
      const where = {
        societyId: req.user.societyId
      };

      // Status filter
      if (status && status !== 'all') {
        const statusMap = {
          'checked-in': 'CHECKED_IN',
          'checked-out': 'CHECKED_OUT',
          'approved': 'APPROVED',
          'pending': 'PENDING',
          'rejected': 'DENIED' // or REJECTED
        };
        where.status = statusMap[status] || status.toUpperCase();
      }

      // Unit filter
      if (unitId) where.visitingUnitId = parseInt(unitId);

      // Block filter
      if (block && block !== 'all-blocks') {
        where.unit = {
          block: block
        };
      }

      // Date filter
      if (date) {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (date === 'today') {
          where.createdAt = { gte: startOfDay };
        } else if (date === 'yesterday') {
          const yesterdayStart = new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(new Date().setDate(new Date().getDate() - 1)).setHours(23, 59, 59, 999);
          where.createdAt = { gte: new Date(yesterdayStart), lte: new Date(yesterdayEnd) };
        } else if (date === 'week') {
          where.createdAt = { gte: startOfWeek };
        } else if (date === 'month') {
          where.createdAt = { gte: startOfMonth };
        }
      }

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          { purpose: { contains: search } },
          { unit: { block: { contains: search } } },
          { unit: { number: { contains: search } } }
        ];
      }

      const visitors = await prisma.visitor.findMany({
        where,
        include: {
          unit: {
            include: {
              owner: true,
              tenant: true
            }
          },
          resident: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(visitors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const societyId = req.user.societyId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [totalToday, activeNow, preApproved, totalMonth] = await Promise.all([
        prisma.visitor.count({
          where: {
            societyId,
            createdAt: { gte: today }
          }
        }),
        prisma.visitor.count({
          where: {
            societyId,
            status: 'CHECKED_IN'
          }
        }),
        prisma.visitor.count({
          where: {
            societyId,
            status: { in: ['APPROVED', 'PRE_APPROVED'] },
            createdAt: { gte: today } // Assuming pre-approved for today? or just general
          }
        }),
        prisma.visitor.count({
          where: {
            societyId,
            createdAt: { gte: firstDayOfMonth }
          }
        })
      ]);

      res.json({
        totalToday,
        activeNow,
        preApproved,
        totalMonth
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async checkIn(req, res) {
    try {
      const { name, phone, visitingUnitId, purpose, vehicleNo, idType, idNumber } = req.body;
      let photoUrl = null;

      // Handle Photo Upload
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'socity_visitors',
          resource_type: 'auto'
        });
        photoUrl = uploadResponse.secure_url;
      }

      // Auto-assign resident if unit is provided
      let residentId = null;
      if (visitingUnitId) {
        const unit = await prisma.unit.findUnique({
          where: { id: parseInt(visitingUnitId) },
          include: { owner: true, tenant: true }
        });
        if (unit) {
          residentId = unit.tenantId || unit.ownerId;
        }
      }

      const visitor = await prisma.visitor.create({
        data: {
          name,
          phone,
          visitingUnitId: parseInt(visitingUnitId),
          residentId,
          purpose,
          vehicleNo,
          idType,
          idNumber,
          photo: photoUrl, // Save URL
          status: 'CHECKED_IN',
          entryTime: new Date(),
          societyId: req.user.societyId
        }
      });
      res.status(201).json(visitor);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async preApprove(req, res) {
    try {
      const { name, phone, purpose, visitingUnitId, vehicleNo } = req.body;
      let photoUrl = null;

      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'socity_visitors',
          resource_type: 'auto'
        });
        photoUrl = uploadResponse.secure_url;
      }

      let unitId = visitingUnitId;
      if (req.user.role === 'RESIDENT' && !unitId) {
        const userUnit = await prisma.unit.findFirst({
          where: { OR: [{ ownerId: req.user.id }, { tenantId: req.user.id }] }
        });
        if (userUnit) unitId = userUnit.id;
      }

      const visitor = await prisma.visitor.create({
        data: {
          name,
          phone,
          purpose,
          vehicleNo,
          visitingUnitId: unitId ? parseInt(unitId) : null,
          residentId: req.user.role === 'RESIDENT' ? req.user.id : null,
          status: 'APPROVED',
          photo: photoUrl,
          societyId: req.user.societyId
        }
      });
      res.status(201).json(visitor);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  static async checkOut(req, res) {
    try {
      const { id } = req.params;
      const visitor = await prisma.visitor.update({
        where: { id: parseInt(id) },
        data: {
          status: 'CHECKED_OUT',
          exitTime: new Date()
        }
      });
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const visitor = await prisma.visitor.update({
        where: { id: parseInt(id) },
        data: { status: status.toUpperCase() }
      });
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = VisitorController;

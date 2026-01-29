const prisma = require('../lib/prisma');

class ServiceInquiryController {
  static async listInquiries(req, res) {
    try {
      let { page = 1, limit = 10, search, status, societyId } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      const where = {};
      const role = (req.user.role || '').toUpperCase();

      // Vendor: only inquiries assigned to this vendor (match Vendor by user email)
      if (role === 'VENDOR') {
        const vendor = await prisma.vendor.findFirst({
          where: { email: req.user.email }
        });
        if (!vendor) {
          return res.json({
            data: [],
            meta: { total: 0, page: 1, limit: parseInt(limit) || 10, totalPages: 0 }
          });
        }
        where.vendorId = vendor.id;
      }
      // Role based filtering (non-vendor)
      else if (role === 'INDIVIDUAL') {
        // Individual users: only see their own inquiries (by residentId, no societyId)
        where.residentId = req.user.id;
        where.societyId = null; // Individual users have no society
      } else if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'super_admin') {
        where.societyId = req.user.societyId;
      } else if (societyId && societyId !== 'all') {
        where.societyId = parseInt(societyId);
      }

      // Filter by status
      if (status && status !== 'all') {
        where.status = status;
      }

      // Search
      if (search) {
        where.OR = [
          { residentName: { contains: search } },
          { serviceName: { contains: search } },
          { unit: { contains: search } }
        ];
      }

      const [total, inquiries] = await Promise.all([
        prisma.serviceInquiry.count({ where }),
        prisma.serviceInquiry.findMany({
          where,
          skip,
          take: limit,
          include: {
            society: {
              select: { name: true, pincode: true }
            },
            resident: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const withResidentName = inquiries.map(i => ({
        ...i,
        residentName: i.resident?.name ?? i.residentName ?? '—'
      }));

      res.json({
        data: withResidentName,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('List Inquiries Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async createInquiry(req, res) {
    try {
      const { 
        residentName, 
        unit, 
        phone, 
        serviceName, 
        serviceId, 
        type, 
        preferredDate, 
        preferredTime, 
        notes 
      } = req.body;

      const role = (req.user.role || '').toUpperCase();
      const inquiry = await prisma.serviceInquiry.create({
        data: {
          residentName,
          unit: unit || 'N/A',
          phone,
          serviceName,
          serviceId,
          type: type || 'service',
          preferredDate,
          preferredTime,
          notes,
          societyId: role === 'INDIVIDUAL' ? null : req.user.societyId,
          residentId: req.user.id
        }
      });

      res.status(201).json(inquiry);
    } catch (error) {
      console.error('Create Inquiry Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async assignVendor(req, res) {
    try {
      const { id } = req.params;
      const { vendorId, vendorName } = req.body;
      console.log('Assign Vendor Request:', { id, vendorId, vendorName, userRole: req.user.role });

      const inquiry = await prisma.serviceInquiry.update({
        where: { id: parseInt(id) },
        data: {
          vendorId: parseInt(vendorId),
          vendorName,
          status: 'booked'
        },
        include: {
          resident: { select: { name: true } }
        }
      });

      // Notify the vendor's User every time (so they see it in header notifications)
      const vendor = await prisma.vendor.findUnique({
        where: { id: parseInt(vendorId) }
      });
      const vendorEmail = (vendor?.email || '').trim();
      if (vendorEmail) {
        const vendorUser = await prisma.user.findFirst({
          where: { email: vendorEmail }
        });
        if (vendorUser) {
          const residentLabel = inquiry.resident?.name || 'Customer';
          try {
            await prisma.notification.create({
              data: {
                userId: vendorUser.id,
                title: 'New lead assigned',
                description: `You have been assigned: ${inquiry.serviceName || 'Service'} for ${residentLabel}`,
                type: 'lead_assigned',
                read: false
              }
            });
          } catch (notifErr) {
            console.error('AssignVendor: notification create failed', notifErr);
            // Don't fail the whole assign – inquiry is already updated
          }
        }
      }

      res.json(inquiry);
    } catch (error) {
      console.error('Assign Vendor Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /** Vendor updates status of an inquiry assigned to them (confirmed, done, completed, etc.) */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const role = (req.user.role || '').toUpperCase();
      if (role !== 'VENDOR') {
        return res.status(403).json({ error: 'Only vendors can update inquiry status' });
      }
      const vendor = await prisma.vendor.findFirst({
        where: { email: req.user.email }
      });
      if (!vendor) {
        return res.status(403).json({ error: 'Vendor profile not found' });
      }
      const existing = await prisma.serviceInquiry.findUnique({
        where: { id: parseInt(id) }
      });
      if (!existing) {
        return res.status(404).json({ error: 'Inquiry not found' });
      }
      if (existing.vendorId !== vendor.id) {
        return res.status(403).json({ error: 'You can only update inquiries assigned to you' });
      }
      const inquiry = await prisma.serviceInquiry.update({
        where: { id: parseInt(id) },
        data: { status: String(status || existing.status) }
      });
      res.json(inquiry);
    } catch (error) {
      console.error('Update Inquiry Status Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceInquiryController;

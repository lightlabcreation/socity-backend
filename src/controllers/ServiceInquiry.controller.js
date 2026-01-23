const prisma = require('../lib/prisma');

class ServiceInquiryController {
  static async listInquiries(req, res) {
    try {
      console.log('List Inquiries Request:', { role: req.user.role, societyId: req.user.societyId });
      const where = {};
      if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'super_admin') {
        where.societyId = req.user.societyId;
      }

      const inquiries = await prisma.serviceInquiry.findMany({
        where,
        include: {
          society: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(inquiries);
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

      const inquiry = await prisma.serviceInquiry.create({
        data: {
          residentName,
          unit,
          phone,
          serviceName,
          serviceId,
          type: type || 'service',
          preferredDate,
          preferredTime,
          notes,
          societyId: req.user.societyId,
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
        }
      });
      res.json(inquiry);
    } catch (error) {
      console.error('Assign Vendor Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceInquiryController;

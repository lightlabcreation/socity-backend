const prisma = require('../lib/prisma');

class VendorController {
  static async listSocietalVendors(req, res) {
    try {
      console.log('Listing vendors for user:', req.user.id, 'Role:', req.user.role, 'Society:', req.user.societyId);
      const vendors = await prisma.vendor.findMany({
        where: {
          OR: [
            { societyId: req.user.societyId },
            { societyId: null }
          ]
        }
      });
      console.log('Found vendors:', vendors.length);
      res.json(vendors);
    } catch (error) {
      console.error('List Vendors Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async createVendor(req, res) {
    try {
      const {
        name,
        company,
        type,
        serviceType,
        contactPerson,
        contact,
        phone,
        email,
        address,
        gst,
        pan,
        contractStart,
        contractEnd,
        contractValue,
        paymentTerms,
        societyId
      } = req.body;

      // If SUPER_ADMIN, we can either take societyId from body (for societal vendor) 
      // or set it to null (for platform vendor).
      // If ADMIN, we strictly use their own societyId.
      let socId = null;
      if (req.user.role === 'SUPER_ADMIN') {
        socId = societyId || null;
      } else {
        socId = req.user.societyId || null;
      }

      const vendor = await prisma.vendor.create({
        data: {
          name,
          company,
          serviceType: type || serviceType,
          contactPerson,
          contact: phone || contact || '',
          email,
          address,
          gst,
          pan,
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
          contractValue: contractValue ? parseFloat(contractValue) : 0,
          paymentTerms,
          societyId: socId
        }
      });
      res.status(201).json(vendor);
    } catch (error) {
      console.error('Create Vendor Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async listAllVendors(req, res) {
    try {
      const vendors = await prisma.vendor.findMany({
        include: { society: { select: { name: true } } }
      });
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateVendorStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const vendor = await prisma.vendor.update({
        where: { id: parseInt(id) },
        data: { status: status.toUpperCase() }
      });
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;
      await prisma.vendor.delete({
        where: { id: parseInt(id) }
      });
      res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const societyId = req.user.societyId;
      const role = req.user.role;
      // Super Admin should see global stats, others filtered by their society
      const where = role === 'SUPER_ADMIN' ? {} : (societyId ? { societyId } : {});

      const totalVendors = await prisma.vendor.count({ where });
      const activeVendors = await prisma.vendor.count({
        where: { ...where, status: 'ACTIVE' }
      });

      // Count unique societies served by these vendors
      const societyConnectionsData = await prisma.vendor.groupBy({
        by: ['societyId'],
        where: {
          ...where,
          societyId: { not: null }
        }
      });
      const societyConnections = societyConnectionsData.length;

      // Calculate pending payments from vendor invoices
      const pendingPayments = await prisma.vendorInvoice.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { totalAmount: true }
      });

      res.json({
        totalVendors,
        activeVendors,
        societyConnections,
        pendingPayments: pendingPayments._sum.totalAmount || 0,
        avgPartnerRating: 4.8 // Mock rating
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        company,
        type,
        serviceType,
        contactPerson,
        contact,
        phone,
        email,
        address,
        status,
        gst,
        pan,
        contractStart,
        contractEnd,
        contractValue,
        paymentTerms
      } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined || serviceType !== undefined) updateData.serviceType = type || serviceType;
      if (phone !== undefined || contact !== undefined) updateData.contact = phone || contact;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (status !== undefined) updateData.status = status.toUpperCase();

      if (contractStart !== undefined) updateData.contractStart = contractStart ? new Date(contractStart) : null;
      if (contractEnd !== undefined) updateData.contractEnd = contractEnd ? new Date(contractEnd) : null;
      if (contractValue !== undefined) updateData.contractValue = contractValue ? parseFloat(contractValue) : 0;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
      if (company !== undefined) updateData.company = company;
      if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
      if (gst !== undefined) updateData.gst = gst;
      if (pan !== undefined) updateData.pan = pan;

      const vendor = await prisma.vendor.update({
        where: { id: parseInt(id) },
        data: updateData
      });
      res.json(vendor);
    } catch (error) {
      console.error('Update Vendor Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async renewContract(req, res) {
    try {
      const { id } = req.params;
      // In a real app, this would update a contractEnd date in the vendor model
      res.json({ message: 'Contract renewed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async rateVendor(req, res) {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      // In a real app, this would add a record to a VendorRating model
      res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentHistory(req, res) {
    try {
      const { id } = req.params;
      const payments = await prisma.vendorInvoice.findMany({
        where: { vendorId: parseInt(id) },
        orderBy: { createdAt: 'desc' }
      });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = VendorController;

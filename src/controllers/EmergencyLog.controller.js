const prisma = require('../lib/prisma');

class EmergencyLogController {
  static async listLogs(req, res) {
    try {
      const where = {};
      
      if (req.user.role === 'RESIDENT') {
        // Residents only see logs for their own barcodes
        const userBarcodes = await prisma.emergencyBarcode.findMany({
          where: { phone: req.user.phone, societyId: req.user.societyId },
          select: { id: true }
        });
        const barcodeIds = userBarcodes.map(b => b.id);
        where.barcodeId = { in: barcodeIds };
      } else if (req.user.role !== 'SUPER_ADMIN') {
        where.societyId = req.user.societyId;
      }

      const logs = await prisma.emergencyLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 50 // Limit results for performance
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = EmergencyLogController;

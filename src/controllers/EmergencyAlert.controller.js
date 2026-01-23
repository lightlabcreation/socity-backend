const prisma = require('../lib/prisma');

class EmergencyAlertController {
  static async createAlert(req, res) {
    try {
      const { type, description, unit } = req.body;
      const societyId = req.user.societyId;
      const userId = req.user.id;

      const alert = await prisma.emergencyAlert.create({
        data: {
          type,
          description,
          unit,
          societyId,
          userId,
          status: 'active'
        },
        include: {
          user: {
            select: {
              name: true,
              phone: true
            }
          },
          society: {
            select: {
              name: true
            }
          }
        }
      });

      // Also create an entry in the Master EmergencyLog for monitoring
      try {
        await prisma.emergencyLog.create({
          data: {
            visitorName: 'RESIDENT SOS',
            visitorPhone: alert.user.phone || 'N/A',
            residentName: alert.user.name,
            unit: unit || 'N/A',
            isEmergency: true,
            societyId: societyId,
            reason: `${type.toUpperCase()} - ${description}`,
            barcodeId: 'SOS_TRIGGER'
          }
        });
      } catch (logError) {
        console.error('Failed to create EmergencyLog entry:', logError);
      }

      // Emit socket event for real-time notification
      try {
        const { getIO } = require('../lib/socket');
        const io = getIO();
        
        // Notify local society (Admins/Security/Residents)
        io.to(`society_${societyId}`).emit('new_emergency_alert', alert);
        
        // Notify Super Admins globally
        io.to('platform_admin').emit('new_emergency_alert', alert);
        
        console.log(`Real-time alert emitted for society_${societyId} and platform_admin`);
      } catch (err) {
        console.warn('Socket emit failed:', err.message);
      }

      res.status(201).json(alert);
    } catch (error) {
      console.error('Create Alert Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async listAlerts(req, res) {
    try {
      const { status } = req.query;
      const societyId = req.user.societyId;

      const where = { societyId };
      if (status) {
        where.status = status;
      }

      const alerts = await prisma.emergencyAlert.findMany({
        where,
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAlertDetails(req, res) {
    try {
      const { id } = req.params;
      const alert = await prisma.emergencyAlert.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              name: true,
              phone: true
            }
          }
        }
      });

      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      const alert = await prisma.emergencyAlert.update({
        where: { id: parseInt(id) },
        data: {
          status: 'resolved',
          resolution,
          updatedAt: new Date()
        }
      });

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = EmergencyAlertController;

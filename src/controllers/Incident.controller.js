const prisma = require('../lib/prisma');

// Get all incidents (with filters)
const getAll = async (req, res) => {
  try {
    const { societyId } = req.user;
    const { status, severity, search } = req.query;

    const where = {
      societyId,
      ...(status && status !== 'all' ? { status } : {}),
      ...(severity && severity !== 'all' ? { severity } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { location: { contains: search } }
        ]
      } : {})
    };

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        reportedBy: {
          select: { id: true, name: true, role: { select: { name: true } } }
        },
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new incident
const create = async (req, res) => {
  try {
    const { title, description, location, severity, images } = req.body;
    const { societyId, id: userId } = req.user;

    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        location,
        severity: severity || 'medium',
        societyId,
        reportedById: userId,
        images: images || [],
        status: 'open'
      }
    });

    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update incident status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedToId } = req.body;

    const incident = await prisma.incident.update({
      where: { id: parseInt(id) },
      data: {
        status,
        ...(assignedToId ? { assignedToId: parseInt(assignedToId) } : {})
      }
    });

    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get incident stats
const getStats = async (req, res) => {
  try {
    const { societyId } = req.user;

    const [total, open, resolved, critical] = await Promise.all([
      prisma.incident.count({ where: { societyId } }),
      prisma.incident.count({ where: { societyId, status: 'open' } }),
      prisma.incident.count({ where: { societyId, status: 'resolved' } }),
      prisma.incident.count({ where: { societyId, severity: 'critical' } })
    ]);

    res.json({
      success: true,
      data: { total, open, resolved, critical }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAll,
  create,
  updateStatus,
  getStats
};

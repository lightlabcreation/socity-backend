const prisma = require('../lib/prisma');

class UnitController {
  static async list(req, res) {
    try {
      const where = {};
      if (req.user.role !== 'SUPER_ADMIN') {
        where.societyId = req.user.societyId;
      }
      const units = await prisma.unit.findMany({
        where,
        include: { owner: true, tenant: true },
        orderBy: [{ block: 'asc' }, { number: 'asc' }]
      });
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req, res) {
    try {
       const { id } = req.params;
       const unit = await prisma.unit.findUnique({
           where: { id: parseInt(id) },
           include: { owner: true, tenant: true, parkingSlots: true, visitors: true }
       });
       if (!unit) return res.status(404).json({ error: 'Unit not found' });
       res.json(unit);
    } catch (error) {
       res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { block, number, floor, type, areaSqFt, societyId } = req.body;
      const unit = await prisma.unit.create({
        data: {
          block,
          number,
          floor: parseInt(floor),
          type,
          areaSqFt: parseFloat(areaSqFt),
          societyId: parseInt(societyId || req.user.societyId)
        }
      });
      res.status(201).json(unit);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: req.body
      });
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.unit.delete({ where: { id: parseInt(id) } });
      res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UnitController;

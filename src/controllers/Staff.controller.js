const prisma = require('../lib/prisma');

const StaffController = {
  // List all staff (can filter by role)
  list: async (req, res) => {
    try {
      const { role, status, shift } = req.query;
      const societyId = req.user.societyId;

      const where = { societyId };
      if (role && role !== 'all') where.role = role.toUpperCase();
      if (status && status !== 'all') where.status = status;
      if (shift && shift !== 'all') where.shift = shift;

      // Ensure we fetch inclusive of filters
      const staff = await prisma.staff.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Calculate stats based on the role filter
      const statsWhere = { societyId };
      if (role && role !== 'all') statsWhere.role = role.toUpperCase();

      const total = await prisma.staff.count({ where: statsWhere });
      const onDuty = await prisma.staff.count({ where: { ...statsWhere, status: 'ON_DUTY' } });
      const onLeave = await prisma.staff.count({ where: { ...statsWhere, status: 'ON_LEAVE' } });
      const offDuty = await prisma.staff.count({ where: { ...statsWhere, status: 'OFF_DUTY' } });

      res.json({
        success: true,
        data: staff,
        stats: {
          total,
          onDuty,
          onLeave,
          vacant: offDuty // Using OFF_DUTY count as vacant/available
        }
      });
    } catch (error) {
      console.error('List staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
  },

  // Create new staff
  create: async (req, res) => {
    try {
      const { name, phone, email, shift, gate, role, address, emergencyContact, idProof, idNumber, password, workingDays } = req.body;
      const societyId = req.user.societyId;
      const bcrypt = require('bcryptjs');

      // Hash password (use provided password or default)
      const hashedPassword = await bcrypt.hash(password || 'Guard@123', 10);

      const userEmail = email || `${phone}@staff.local`;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      let user;
      if (existingUser) {
        // Update existing user instead of creating
        user = await prisma.user.update({
          where: { email: userEmail },
          data: {
            name,
            phone,
            password: hashedPassword,
            role: role === 'GUARD' ? 'GUARD' : 'VENDOR',
          }
        });
      } else {
        // Create User record first (for login capability)
        user = await prisma.user.create({
          data: {
            name,
            email: userEmail,
            phone,
            password: hashedPassword,
            role: role === 'GUARD' ? 'GUARD' : 'VENDOR',
            societyId,
            status: 'ACTIVE'
          }
        });
      }

      // Then create Staff record
      const staff = await prisma.staff.create({
        data: {
          name,
          phone,
          password: hashedPassword,
          email,
          shift,
          gate,
          workingDays,
          role: role || 'GUARD',
          address,
          emergencyContact,
          idProof,
          idNumber,
          societyId,
          status: 'OFF_DUTY',
          attendanceStatus: 'UPCOMING'
        }
      });

      // Remove password from response
      const { password: _, ...staffData } = staff;
      res.status(201).json({
        success: true,
        data: staffData,
        loginCredentials: {
          email: user.email,
          message: 'Helper can now login with this email and the password provided'
        }
      });
    } catch (error) {
      console.error('Create staff error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create staff',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Update staff details
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const staff = await prisma.staff.update({
        where: { id: parseInt(id) },
        data
      });

      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Update staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to update staff' });
    }
  },

  // Delete staff
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.staff.delete({ where: { id: parseInt(id) } });
      res.json({ success: true, message: 'Staff removed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete staff' });
    }
  }
};

module.exports = StaffController;

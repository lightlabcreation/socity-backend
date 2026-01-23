const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');

class UserController {
  static async uploadPhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      // Convert buffer to data URI
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'socity_profiles',
        resource_type: 'auto'
      });

      // Update user profile image
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { profileImg: uploadResponse.secure_url }
      });

      res.json({ 
        message: 'Photo uploaded successfully', 
        profileImg: user.profileImg,
        avatar: user.profileImg
      });
    } catch (error) {
      console.error('Upload Photo Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async register(req, res) {
    try {
      let { email, password, name, phone, role, societyCode } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Handle optional password
      const actualPassword = password || `SOCITY${Date.now().toString().slice(-6)}`;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(actualPassword, 10);

      // Find society if code provided
      let societyId = null;
      if (societyCode) {
        const society = await prisma.society.findUnique({ where: { code: societyCode } });
        if (!society) {
          return res.status(400).json({ error: 'Invalid society code' });
        }
        societyId = society.id;
      }

      // Create User
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: role || 'RESIDENT',
          societyId
        }
      });

      res.status(201).json({ 
        message: 'User registered successfully', 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          password: actualPassword // Return plain password for one-time display
        } 
      });
    } catch (error) {
      console.error('Register Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find User
      const user = await prisma.user.findUnique({
        where: { email },
        include: { society: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, societyId: user.societyId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create Session Record
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          device: req.headers['user-agent'] || 'Unknown',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
        }
      });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.toLowerCase(),
          society: user.society,
          avatar: user.profileImg
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { society: true }
      });
      if (user) {
        user.role = user.role.toLowerCase();
        user.avatar = user.profileImg; // Alias for frontend compatibility
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, phone, profileImg, password } = req.body;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (profileImg !== undefined) updateData.profileImg = profileImg;

      // If password is provided, hash it and add to update data
      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        include: { society: true }
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        include: { society: true },
        orderBy: { createdAt: 'desc' }
      });

      const formattedUsers = await Promise.all(users.map(async (u) => {
        let activeBarcodes = 0;
        let serviceRequests = 0;

        if (u.phone) {
             activeBarcodes = await prisma.emergencyBarcode.count({
                where: { phone: u.phone, status: 'active' }
             });
             // Fixed: Query by residentId instead of removed residentName/source fields
             serviceRequests = await prisma.serviceInquiry.count({
                where: { 
                    residentId: u.id
                }
             });
        }

        return {
          ...u,
          role: u.role.toLowerCase(),
          societyName: u.society?.name || 'N/A',
          activeBarcodes,
          serviceRequests,
          registeredAt: u.createdAt.toISOString().split('T')[0]
        };
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error('Get All Users Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getB2CStats(req, res) {
    try {
      // 1. Total B2C Users
      const totalUsers = await prisma.user.count({
        where: { role: 'INDIVIDUAL' }
      });

      // 2. Active Scans (Daily) - EmergencyLogs for B2C users today
      // First get all B2C phones
      const b2cUsers = await prisma.user.findMany({
        where: { role: 'INDIVIDUAL' },
        select: { phone: true }
      });
      const phones = b2cUsers.map(u => u.phone).filter(p => p);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeScans = await prisma.emergencyLog.count({
        where: {
            timestamp: { gte: today },
            visitorPhone: { in: phones }
        }
      });

      // 3. Total Bookings (Service Inquiries from Individuals)
      // Fixed: source field removed, query via resident relation
      const totalBookings = await prisma.serviceInquiry.count({
        where: { 
          resident: {
            role: 'INDIVIDUAL'
          }
        }
      });

      res.json({
        totalUsers,
        activeScans,
        totalBookings
      });
    } catch (error) {
      console.error('Get B2C Stats Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: { status: status.toUpperCase() }
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUserStats(req, res) {
    try {
      const totalAdmins = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      });

      const pendingAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'PENDING' }
      });

      const suspendedAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'SUSPENDED' }
      });

      res.json({
        totalAdmins,
        activeAdmins,
        pendingAdmins,
        suspendedAdmins
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listAdmins(req, res) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { society: true }
      });

      const formattedAdmins = admins.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        society: u.society?.name || 'N/A',
        societyId: u.societyId,
        status: u.status.toLowerCase(),
        joinedDate: u.createdAt.toISOString().split('T')[0],
        lastLogin: '2 hours ago', // Mock for now as we don't track'
        role: u.role
      }));

      res.json(formattedAdmins);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createAdmin(req, res) {
    try {
      const { name, email, phone, password, societyId, designation } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'ADMIN',
          status: 'ACTIVE',
          societyId: parseInt(societyId)
        },
        include: { society: true }
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, societyId, status } = req.body;

      const data = { name, email, phone };
      if (societyId) data.societyId = parseInt(societyId);
      if (status) data.status = status.toUpperCase();

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data,
        include: { society: true }
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      await prisma.user.delete({
        where: { id: parseInt(id) }
      });
      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Clean up sessions
      await prisma.userSession.deleteMany({
        where: { userId }
      });

      // Delete the user
      await prisma.user.delete({
        where: { id: userId }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete User Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  static async getUserActivity(req, res) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const activityData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          role: user.role,
          createdAt: user.createdAt
        },
        logs: [],
        barcodes: []
      };

      if (user.phone) {
        // Fetch emergency logs where visitorPhone matches user phone
        const logs = await prisma.emergencyLog.findMany({
          where: { visitorPhone: user.phone },
          orderBy: { timestamp: 'desc' }
        });
        activityData.logs = logs;

        // Fetch barcodes
        const barcodes = await prisma.emergencyBarcode.findMany({
          where: { phone: user.phone },
          orderBy: { createdAt: 'desc' }
        });
        activityData.barcodes = barcodes;
      }

      res.json(activityData);
    } catch (error) {
      console.error('Get Activity Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;

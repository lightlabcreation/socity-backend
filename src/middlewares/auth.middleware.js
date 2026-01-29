const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');

// Use Artifact Directory for guaranteed access
const DEBUG_LOG_PATH = 'C:/Users/asus/.gemini/antigravity/brain/3e4b1eee-c599-4e39-8db8-c1189d4781a8/backend_debug.log';

const logToFile = (msg) => {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(DEBUG_LOG_PATH, `[${timestamp}] [AUTH] ${msg}\n`);
    } catch(e) {}
};

const authenticate = async (req, res, next) => {
  logToFile(`Request received: ${req.method} ${req.originalUrl}`);
  const authHeader = req.headers.authorization;
  logToFile(`Auth Header present: ${!!authHeader}`);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    logToFile('No token found');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);

    // Check if user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.id) }
    });

    if (!user) {
      console.log('User not found in DB');
      return res.status(401).json({ error: 'User not found or session invalid. Please log in again.' });
    }

    req.user = { ...decoded, id: user.id, societyId: user.societyId };
    console.log('User authenticated:', req.user.id);
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role?.toUpperCase();
    const authorizedRoles = roles.map(r => r.toUpperCase());

    if (!authorizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };

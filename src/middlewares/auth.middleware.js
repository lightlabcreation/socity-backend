const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.id) }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or session invalid. Please log in again.' });
    }

    req.user = { ...decoded, id: user.id, societyId: user.societyId };
    next();
  } catch (error) {
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all meetings for a society
const getAll = async (req, res) => {
  try {
    const societyId = req.user.societyId;
    const meetings = await prisma.meeting.findMany({
      where: { societyId },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single meeting
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await prisma.meeting.findUnique({
      where: { id: parseInt(id) }
    });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create meeting
const create = async (req, res) => {
  try {
    const { title, description, date, time, location, attendees } = req.body;
    const societyId = req.user.societyId;
    
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        location,
        attendees,
        societyId
      }
    });
    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update meeting
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, attendees, status } = req.body;
    
    const meeting = await prisma.meeting.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
        time,
        location,
        attendees,
        status
      }
    });
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete meeting
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.meeting.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };

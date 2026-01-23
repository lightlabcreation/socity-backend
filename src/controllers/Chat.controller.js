const prisma = require('../lib/prisma');
const { getIO } = require('../lib/socket');

class ChatController {
  static async listConversations(req, res) {
    try {
      let { role, id, societyId } = req.user;

      // Ensure societyId is present (fetch if missing from token)
      if (!societyId) {
        const user = await prisma.user.findUnique({
          where: { id },
          select: { societyId: true }
        });
        societyId = user?.societyId;
      }

      if (!societyId) {
        return res.status(400).json({ error: 'User is not linked to any society' });
      }

      let where = { societyId };

      if (role === 'RESIDENT' || role === 'resident') {
        where.participantId = id;
      } else if (['ADMIN', 'COMMITTEE', 'admin', 'committee'].includes(role)) {
        // Admins see all support conversations for their society
        // Optional: Filter by specific support type if needed
      }

      const conversations = await prisma.conversation.findMany({
        where,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { name: true } } }
          },
          participant: { select: { name: true, profileImg: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      res.json(conversations);
    } catch (error) {
      console.error('List Conversations Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getMessages(req, res) {
    try {
      const { id } = req.params;
      const messages = await prisma.chatMessage.findMany({
        where: { conversationId: parseInt(id) },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { i: true, name: true, role: true } } }
      });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { conversationId, content, attachments } = req.body;
      const { id: senderId, societyId } = req.user;

      const message = await prisma.chatMessage.create({
        data: {
          conversationId: parseInt(conversationId),
          senderId,
          content,
          attachments: attachments || [],
        },
        include: { 
          sender: { select: { id: true, name: true, role: true } },
          conversation: true
        }
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { updatedAt: new Date() }
      });

      // Emit via socket
      const io = getIO();
      io.to(`conversation_${conversationId}`).emit('new-message', message);
      
      // Notify society room for global updates
      io.to(`society_${societyId}`).emit('conversation-updated', {
        conversationId,
        lastMessage: content,
        senderName: message.sender.name
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async startConversation(req, res) {
    try {
      const { type } = req.body; // e.g. SUPPORT_ADMIN, SUPPORT_MAINTENANCE
      const { id: participantId, societyId } = req.user;

        let conversation;
        // Direct chat handling
        if (type.startsWith('DIRECT_')) {
          const targetUserId = parseInt(type.split('_')[1]);
          // Check if conversation already exists between the two users
          conversation = await prisma.conversation.findFirst({
            where: {
              societyId,
              OR: [
                { participantId: participantId, directParticipantId: targetUserId },
                { participantId: targetUserId, directParticipantId: participantId }
              ]
            }
          });
          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                societyId,
                type: 'DIRECT',
                participantId,
                directParticipantId: targetUserId
              }
            });
          }
        } else {
          conversation = await prisma.conversation.findFirst({
            where: {
              societyId,
              type,
              participantId
            }
          });
          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                societyId,
                type,
                participantId
              }
            });
          }
        }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ChatController;

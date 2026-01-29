const prisma = require('../lib/prisma');
const { getIO } = require('../lib/socket');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Use Artifact Directory for guaranteed access
const DEBUG_LOG_PATH = 'C:/Users/asus/.gemini/antigravity/brain/3e4b1eee-c599-4e39-8db8-c1189d4781a8/backend_debug.log';

const logToFile = (msg) => {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(DEBUG_LOG_PATH, `[${timestamp}] [CHAT] ${msg}\n`);
    } catch(e) {
        // Fallback to console if file write fails
        console.error('LOG_TO_FILE_FAILED', e);
    }
};

class ChatController {
  static async listConversations(req, res) {
    try {
      logToFile('listConversations called');
      const { id, societyId, role } = req.user;

      // Only conversations where I am participant
      const baseWhere = {
        OR: [
          { participantId: id },
          { directParticipantId: id }
        ]
      };
      // Society users (ADMIN, RESIDENT, COMMITTEE, etc.) see only convos in their society
      // Super Admin sees all convos they are part of (no society filter)
      const where = societyId
        ? { ...baseWhere, societyId }
        : baseWhere;

      const conversations = await prisma.conversation.findMany({
        where,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { name: true } } }
          },
          participant: { select: { id: true, name: true, profileImg: true, role: true, phone: true } },
          directParticipant: { select: { id: true, name: true, profileImg: true, role: true, phone: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      // Format for frontend
      const formatted = conversations.map(c => {
        // For support channels (directParticipantId is null), use type as identifier
        // For direct chats, use otherUser
        const otherUser = c.participantId === id ? c.directParticipant : c.participant;
        return {
          id: c.id,
          type: c.type, // Include type so frontend can identify support channels
          otherUser: c.type === 'DIRECT' ? otherUser : null, // Support channels don't have otherUser
          lastMessage: c.messages[0],
          updatedAt: c.updatedAt
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('List Conversations Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getMessages(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const conversationId = parseInt(id);

      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { participantId: true, directParticipantId: true, societyId: true, type: true }
      });
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      // Support channels: participantId must match, or direct chats: either participant matches
      const isParticipant = conv.participantId === userId || (conv.directParticipantId && conv.directParticipantId === userId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'You do not have access to this conversation' });
      }
      // Society users can only access conversations in their society
      if (req.user.societyId != null && conv.societyId !== req.user.societyId) {
        return res.status(403).json({ error: 'You do not have access to this conversation' });
      }

      const messages = await prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true, role: true, profileImg: true } } }
      });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadAttachment(req, res) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'chat_attachments',
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      res.json({
        url: result.secure_url,
        type: result.resource_type || 'image',
        name: result.original_filename || 'file'
      });
    } catch (error) {
      console.error('Chat upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { conversationId, content, attachments } = req.body;
      const { id: senderId, societyId } = req.user;
      const cid = parseInt(conversationId);

      const conv = await prisma.conversation.findUnique({
        where: { id: cid },
        select: { participantId: true, directParticipantId: true, societyId: true, type: true }
      });
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      // Support channels: participantId must match (directParticipantId is null)
      // Direct chats: either participantId or directParticipantId must match
      const isParticipant = conv.participantId === senderId || (conv.directParticipantId && conv.directParticipantId === senderId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'You cannot send messages in this conversation' });
      }
      // Society users can only send in conversations of their society
      if (req.user.societyId != null && conv.societyId !== req.user.societyId) {
        return res.status(403).json({ error: 'You cannot send messages in this conversation' });
      }

      const message = await prisma.chatMessage.create({
        data: {
          conversationId: cid,
          senderId,
          content,
          attachments: attachments || [],
        },
        include: { 
          sender: { select: { id: true, name: true, role: true, profileImg: true } },
          conversation: true
        }
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: cid },
        data: { updatedAt: new Date() }
      });

      // Emit via socket
      const io = getIO();
      io.to(`conversation_${cid}`).emit('new-message', message);
      io.to(`conversation_${cid}`).emit('conversation-updated', {
        conversationId: cid,
        senderName: message.sender.name
      });

      // Notify the other participant(s) – create notification and emit to user room for real-time bell + toast
      const recipientId = conv.participantId === senderId ? conv.directParticipantId : conv.participantId;
      if (recipientId) {
        const preview = (typeof content === 'string' && content.length > 80) ? content.slice(0, 80) + '…' : (content || '(attachment)');
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: recipientId,
              title: `New message from ${message.sender.name}`,
              description: preview,
              type: 'chat_message',
              read: false
            }
          });
          io.to(`user_${recipientId}`).emit('new-chat-message', {
            notificationId: notification.id,
            title: notification.title,
            description: notification.description,
            conversationId: cid,
            senderName: message.sender.name
          });
        } catch (notifErr) {
          console.error('Chat notification create failed:', notifErr.message);
        }
      }

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async startConversation(req, res) {
    try {
      logToFile(`Start Conversation Request. Body: ${JSON.stringify(req.body)}`);
      const { targetUserId, type, listingItem } = req.body; 
      const { id: myId, societyId } = req.user;
      logToFile(`User: ${JSON.stringify(req.user)}`);

      // Support channel types (SUPPORT_ADMIN, SUPPORT_MAINTENANCE, etc.) don't need targetUserId
      const isSupportChannel = type && ['SUPPORT_ADMIN', 'SUPPORT_MAINTENANCE', 'SUPPORT_SECURITY', 'SUPPORT_COMMITTEE', 'SUPPORT_ACCOUNTS'].includes(type);
      
      if (isSupportChannel) {
        // Support channel: create conversation with type = SUPPORT_ADMIN, etc.
        if (!societyId) {
          return res.status(400).json({ error: 'Society context required for support channels' });
        }

        // Check if support channel conversation already exists
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: type,
            participantId: myId,
            societyId: societyId,
            directParticipantId: null // Support channels don't have direct participants
          }
        });

        if (!conversation) {
          try {
            conversation = await prisma.conversation.create({
              data: {
                societyId: societyId,
                type: type,
                participantId: myId,
                directParticipantId: null
              }
            });
            console.log('Support channel conversation created:', conversation);
          } catch (createErr) {
            // Race: another request created same support channel; fetch and return it
            if (createErr.code === 'P2002' || (createErr.meta && createErr.meta.code === 'P2002')) {
              conversation = await prisma.conversation.findFirst({
                where: {
                  type: type,
                  participantId: myId,
                  societyId: societyId,
                  directParticipantId: null
                }
              });
              if (conversation) {
                return res.json(conversation);
              }
            }
            throw createErr;
          }
        }

        return res.json(conversation);
      }

      // Direct chat: requires targetUserId
      if (!targetUserId) {
          return res.status(400).json({ error: 'Target user ID is required' });
      }

      const tid = parseInt(targetUserId, 10);
      // Resolve finalSocietyId first (needed for findFirst + create to match unique constraint)
      let finalSocietyId = societyId;
      if (!finalSocietyId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: tid },
          select: { societyId: true }
        });
        finalSocietyId = targetUser?.societyId;
      }
      if (!finalSocietyId) {
        return res.status(400).json({ error: 'Cannot create conversation: No linked society found.' });
      }

      // Society users can start chat with same-society users OR with Super Admin (platform support)
      if (societyId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: tid },
          select: { societyId: true, role: true }
        });
        if (!targetUser) {
          return res.status(403).json({ error: 'User not found.' });
        }
        const sameSociety = targetUser.societyId === societyId;
        const isSuperAdmin = targetUser.role === 'SUPER_ADMIN';
        if (!sameSociety && !isSuperAdmin) {
          return res.status(403).json({ error: 'You can only start conversations with users in your society or with platform support.' });
        }
      }

      logToFile('Checking existing conversation...');
      const uidA = Math.min(myId, tid);
      const uidB = Math.max(myId, tid);
      // Find by same fields as unique constraint: societyId, type, participantId, directParticipantId
      let conversation = await prisma.conversation.findFirst({
        where: {
          societyId: finalSocietyId,
          type: 'DIRECT',
          participantId: uidA,
          directParticipantId: uidB
        }
      });

      if (!conversation) {
        console.log('No existing conversation found. Creating new one...');
        try {
          conversation = await prisma.conversation.create({
            data: {
              societyId: finalSocietyId,
              type: 'DIRECT',
              participantId: uidA,
              directParticipantId: uidB
            }
          });
          console.log('Conversation created:', conversation);
        } catch (createErr) {
          // Race: another request created same conversation; fetch and return it
          if (createErr.code === 'P2002' || (createErr.meta && createErr.meta.code === 'P2002')) {
            conversation = await prisma.conversation.findFirst({
              where: {
                societyId: finalSocietyId,
                type: 'DIRECT',
                participantId: uidA,
                directParticipantId: uidB
              }
            });
            if (conversation) {
              return res.json(conversation);
            }
          }
          throw createErr;
        }
      } else {
        console.log('Found existing conversation:', conversation);
      }

      // If opened from marketplace, add one "listing" message so both buyer and seller see the product in chat (only if not already present)
      if (listingItem && listingItem.itemTitle) {
        const existingListing = await prisma.chatMessage.findFirst({
          where: {
            conversationId: conversation.id,
            content: { startsWith: '📎 Listing:' }
          }
        });
        if (!existingListing) {
          const priceStr = listingItem.itemPrice != null ? `₹${Number(listingItem.itemPrice).toLocaleString()}` : '';
          const content = `📎 Listing: ${listingItem.itemTitle}${priceStr ? ` - ${priceStr}` : ''}`;
          const attachments = (listingItem.itemImage && listingItem.itemImage.trim()) 
            ? [{ url: listingItem.itemImage, type: 'image', name: listingItem.itemTitle }] 
            : [];
          await prisma.chatMessage.create({
            data: {
              conversationId: conversation.id,
              senderId: myId,
              content,
              attachments: attachments.length ? attachments : []
            }
          });
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() }
          });
        }
      }

      res.json(conversation);
    } catch (error) {
      console.error('Start Conversation Error Stack:', error.stack);
      console.error('Start Conversation Error Message:', error.message);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  }
}

module.exports = ChatController;

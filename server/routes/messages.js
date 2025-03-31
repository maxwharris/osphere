const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notifications");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Dynamic getter to avoid circular import issue
const getSocketContext = () => {
  const server = require("../../server");
  return {
    io: server.io,
    connectedUsers: server.connectedUsers,
  };
};

router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const recentMessages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender recipient", "username");

    const uniqueChats = [];
    const chatMap = new Map();

    recentMessages.forEach((msg) => {
      if (!msg.sender || !msg.recipient) return;

      const otherUser =
        msg.sender._id.toString() === userId.toString()
          ? msg.recipient
          : msg.sender;

      if (!otherUser || !otherUser._id) return;
      if (otherUser._id.toString() === userId.toString()) return;

      if (!chatMap.has(otherUser._id.toString())) {
        chatMap.set(otherUser._id.toString(), true);
        uniqueChats.push({
          _id: otherUser._id.toString(),
          username: otherUser.username,
        });
      }
    });

    res.json(uniqueChats);
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const validObjectId = mongoose.Types.ObjectId.isValid(userId);

    if (!validObjectId)
      return res.status(400).json({ error: "Invalid user ID" });

    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, recipient: userId },
        { sender: userId, recipient: req.user.userId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { recipient, content } = req.body;
    if (!recipient || !content.trim()) {
      return res
        .status(400)
        .json({ error: "Recipient and message content required." });
    }

    const message = new Message({
      sender: req.user.userId,
      recipient,
      content,
    });
    await message.save();

    const senderUser = await User.findById(req.user.userId);
    const senderUsername = senderUser?.username || "Someone";

    const linkToChat = `https://osphere.io/messages`;
    const notificationMessage = `${senderUsername} sent you a message`;

    let userNotifications = await Notification.findOne({ user: recipient });
    const newNotification = {
      message: notificationMessage,
      type: "message",
      link: linkToChat,
      fromUser: senderUser._id.toString(),
      timestamp: new Date(),
      opened: false,
    };

    if (!userNotifications) {
      userNotifications = new Notification({
        user: recipient,
        notifications: [newNotification],
      });
    } else {
      userNotifications.notifications.unshift(newNotification);
    }

    await userNotifications.save();

    // ✅ Use dynamic socket context
    const { io, connectedUsers } = getSocketContext();

    if (connectedUsers && typeof connectedUsers.get === "function") {
      const recipientSocket = connectedUsers.get(recipient.toString());
      if (recipientSocket && io) {
        io.to(recipientSocket).emit("new_message", {
          from: senderUsername,
          senderId: senderUser._id.toString(),
          recipientId: recipient.toString(),
          content,
          link: linkToChat,
        });

        io.to(recipientSocket).emit("new_notification", {
          type: "message",
          message: notificationMessage,
          link: linkToChat,
          fromUser: senderUser._id.toString(),
        });
      } else {
        console.warn("Recipient not connected to socket:", recipient);
      }
    } else {
      console.error("connectedUsers or .get is undefined!");
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

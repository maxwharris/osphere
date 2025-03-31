const express = require("express");
const Notification = require("../models/Notifications");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// ✅ Get all notifications for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.findOne({ user: req.user.userId });
    res.json(notifications?.notifications || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add a new notification to a user and emit via socket
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, type, link, fromUser, icon } = req.body;
    const userId = req.user.userId;

    const newNotification = {
      message,
      type,
      link,
      icon: icon || null,
      fromUser: fromUser || null,
      timestamp: new Date(),
      opened: false,
    };

    let userNotifications = await Notification.findOne({ user: userId });

    if (!userNotifications) {
      userNotifications = new Notification({ user: userId, notifications: [newNotification] });
    } else {
      userNotifications.notifications.unshift(newNotification); // add to beginning
    }

    await userNotifications.save();

    // ✅ Emit notification via socket
    const { io, connectedUsers } = require("../../server");
    const recipientSocket = connectedUsers?.get(userId.toString());

    if (recipientSocket && io) {
      io.to(recipientSocket).emit("new_notification", newNotification);
    }

    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Mark a specific notification as opened
router.patch("/:notificationId/open", authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const userNotifications = await Notification.findOne({ user: req.user.userId });
    if (!userNotifications) return res.status(404).json({ error: "Notifications not found" });

    const notif = userNotifications.notifications.id(notificationId);
    if (!notif) return res.status(404).json({ error: "Notification not found" });

    notif.opened = true;
    notif.readAt = new Date();
    await userNotifications.save();

    res.json({ message: "Marked as opened" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Clear all notifications for the logged-in user
router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userNotifications = await Notification.findOne({ user: userId });

    if (userNotifications) {
      userNotifications.notifications = [];
      await userNotifications.save();
    }

    // Optionally emit a socket event (not required unless others observe your inbox)
    const { io, connectedUsers } = require("../../server");
    const socketId = connectedUsers?.get(userId.toString());
    if (socketId && io) {
      io.to(socketId).emit("notifications_cleared");
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error clearing notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete a specific notification
router.delete("/:notificationId", authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const userNotifications = await Notification.findOne({ user: req.user.userId });
    if (!userNotifications) return res.status(404).json({ error: "Notifications not found" });

    userNotifications.notifications = userNotifications.notifications.filter(
      (n) => n._id.toString() !== notificationId
    );

    await userNotifications.save();
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

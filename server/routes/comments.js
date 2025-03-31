const express = require("express");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notifications");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const getSocketContext = () => {
  const server = require("../../server");
  return {
    io: server.io,
    connectedUsers: server.connectedUsers,
  };
};

const router = express.Router();

// Add a comment to a post
router.post("/:postId", authMiddleware, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required." });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found." });

    const newComment = new Comment({
      text: content,
      user: req.user.userId,
      post: req.params.postId,
      parent: parentId || null,
    });
    await newComment.save();

    const populatedComment = await newComment.populate("user", "username");

    try {
      const postAuthorId = post.user._id?.toString?.() || post.user.toString();
      if (postAuthorId !== req.user.userId && !parentId) {
        const commenter = await User.findById(req.user.userId);
        const link = `https://osphere.io/p?id=${post._id}`;
        const message = `${commenter.username} replied to your post`;

        let userNotifications = await Notification.findOne({ user: post.user });
        const newNotification = {
          message,
          type: "reply",
          link,
          fromUser: commenter._id,
          timestamp: new Date(),
          opened: false,
        };

        if (!userNotifications) {
          userNotifications = new Notification({
            user: post.user,
            notifications: [newNotification],
          });
        } else {
          userNotifications.notifications.unshift(newNotification);
        }

        await userNotifications.save();

        const { io, connectedUsers } = getSocketContext();
        const recipientSocket = connectedUsers?.get?.(post.user.toString());
        if (recipientSocket && io) {
          io.to(recipientSocket).emit("new_notification", newNotification);
        }
      }
    } catch (err) {}

    try {
      const tagMatches = content.match(/\.[a-zA-Z0-9_]+/g);
      const mentionedUsernames = [...new Set(tagMatches || [])];

      const taggedUsers = await User.find({ username: { $in: mentionedUsernames } });

      for (const taggedUser of taggedUsers) {
        if (taggedUser._id.toString() === req.user.userId) continue;

        const link = `https://osphere.io/p?id=${post._id}`;
        const message = `${populatedComment.user.username} mentioned you in a comment`;

        let userNotifications = await Notification.findOne({ user: taggedUser._id });
        const newNotification = {
          message,
          type: "mention",
          link,
          fromUser: populatedComment.user._id,
          timestamp: new Date(),
          opened: false,
        };

        if (!userNotifications) {
          userNotifications = new Notification({
            user: taggedUser._id,
            notifications: [newNotification],
          });
        } else {
          userNotifications.notifications.unshift(newNotification);
        }

        await userNotifications.save();

        const { io, connectedUsers } = getSocketContext();
        const recipientSocket = connectedUsers?.get?.(taggedUser._id.toString());
        if (recipientSocket && io) {
          io.to(recipientSocket).emit("new_notification", newNotification);
        }
      }
    } catch (err) {}

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:postId", async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;

    const comments = await Comment.find({ post: req.params.postId })
      .populate("user", "username")
      .sort({ createdAt: -1 })
      .lean();

    const updatedComments = comments.map(comment => ({
      ...comment,
      userLiked: userId ? comment.likes.includes(userId) : false,
      userDisliked: userId ? comment.dislikes.includes(userId) : false,
      replies: comments
        .filter(reply => reply.parent && reply.parent.toString() === comment._id.toString())
        .map(reply => ({
          ...reply,
          userLiked: userId ? reply.likes.includes(userId) : false,
          userDisliked: userId ? reply.dislikes.includes(userId) : false
        }))
    }));

    res.json(updatedComments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:commentId/vote", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const { voteType } = req.body;
    const userId = req.user.userId;

    if (voteType === "like") {
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
      if (!comment.likes.includes(userId)) {
        comment.likes.push(userId);
      } else {
        comment.likes = comment.likes.filter(id => id.toString() !== userId);
      }
    } else if (voteType === "dislike") {
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
      if (!comment.dislikes.includes(userId)) {
        comment.dislikes.push(userId);
      } else {
        comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
      }
    }

    await comment.save();

    res.json({
      likes: comment.likes.length,
      dislikes: comment.dislikes.length,
      userLiked: comment.likes.includes(userId),
      userDisliked: comment.dislikes.includes(userId),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:commentId", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const post = await Post.findById(comment.post);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (comment.user.toString() !== req.user.userId && post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
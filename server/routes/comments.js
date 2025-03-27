const express = require("express");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Create a comment on a post
router.post("/:postId", authMiddleware, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const newComment = new Comment({
      post: post._id,
      user: req.user.userId,
      text,
      parent: parentId || null, // Null if top-level comment
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get comments for a post
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

// ✅ Like or Dislike a Comment
router.post("/:commentId/vote", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const { voteType } = req.body; // "like" or "dislike"
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

// ✅ Delete a comment (Comment author OR Post author)
router.delete("/:commentId", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const post = await Post.findById(comment.post);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // ✅ Allow deletion if user is either the comment author OR the post author
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

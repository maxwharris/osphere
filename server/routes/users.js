const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Follow/Unfollow a user
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.userId);

    if (!userToFollow) return res.status(404).json({ error: "User not found" });

    if (userToFollow._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    let isFollowing = false;
    if (currentUser.following.includes(userToFollow._id)) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== userToFollow._id.toString());
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUser._id.toString());
      await currentUser.save();
      await userToFollow.save();
    } else {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      await currentUser.save();
      await userToFollow.save();
      isFollowing = true;
    }

    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get a user's posts
router.get("/:id/posts", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get user profile, posts, and follow status
router.get("/:username", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate("followers following", "username");

    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });

    const loggedInUser = await User.findById(req.user.userId);
    const isFollowing = loggedInUser.following.includes(user._id); // ✅ Check if logged-in user follows this profile

    res.json({ ...user.toObject(), posts, isFollowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ New Endpoint: Check if logged-in user follows another user
router.get("/:id/follow-status", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const isFollowing = currentUser.following.includes(req.params.id);
    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get Current User Data
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("username email");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

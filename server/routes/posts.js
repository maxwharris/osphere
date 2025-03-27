const express = require("express");
const multer = require("multer");
const Post = require("../models/Post");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// ✅ Ensure 'uploads/' directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure Multer Storage (Accept Image & Video)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// ✅ Allow image, video, and audio uploads
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images, videos, and audio files are allowed."));
    }
  },
});

// ✅ Handle creating a new post with multiple files
router.post("/", authMiddleware, upload.array("files", 10), async (req, res) => {
  try {
    const { title, text, group } = req.body;
    const userId = req.user.userId;

    const files = req.files?.map(file => "/uploads/" + file.filename) || [];
    const fileTypes = req.files?.map(file => {
      if (file.mimetype.startsWith("image")) return "image";
      if (file.mimetype.startsWith("video")) return "video";
      if (file.mimetype.startsWith("audio")) return "audio";
    }) || [];

    const newPost = new Post({
      user: userId,
      title,
      text,
      files,
      fileTypes,
      group: group || null,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ✅ Upload File (Image or Video)
router.post("/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = "/uploads/" + req.file.filename;
  res.json({ filePath });
});

// ✅ Like or Dislike a Post
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.userId;

    post.dislikes = post.dislikes.filter((id) => id.toString() !== userId);
    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
    } else {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, dislikes: post.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Dislike a post
router.post("/:id/dislike", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.userId;

    post.likes = post.likes.filter((id) => id.toString() !== userId);
    if (!post.dislikes.includes(userId)) {
      post.dislikes.push(userId);
    } else {
      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, dislikes: post.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get a post
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("user", "username");
    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//
// ✅ Get posts from a user and followed users
router.get("/feed/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: { $in: [...user.following, user._id] } })
      .populate("user", "username")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all posts from a specific user
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id })
      .populate("user", "username")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete a post (Only owner can delete)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all posts in a specific group
router.get("/group/:id", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ group: req.params.id })
      .populate("user", "username")
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;

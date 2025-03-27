const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();

// ✅ Search for users when query starts with '.', otherwise search for posts
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query is required" });

    let users = [];
    let posts = [];

    if (q.startsWith(".")) {
      const usernameQuery = q;

      users = await User.find({
        username: new RegExp(`^${usernameQuery}`, "i"), // Case-insensitive match
      }).select("_id username followers following"); // ✅ Ensure correct fields are returned
    } else {
      posts = await Post.find({
        $or: [{ title: new RegExp(q, "i") }, { text: new RegExp(q, "i") }]
      }).populate("user", "username").limit(10); // ✅ Ensure user field is populated
    }

    res.json({ users, posts });
  } catch (error) {
    console.error("Error in search API:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

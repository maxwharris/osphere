const express = require("express");
const router = express.Router();

const Post = require("../models/Post");
const User = require("../models/User");
const Group = require("../models/Group"); // 👈 Import Group model

// ✅ Search for users (".username"), groups ("groupname."), or posts
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query is required" });

    let users = [];
    let posts = [];
    let groups = [];

    if (q.startsWith(".")) {
      // User search
      users = await User.find({
        username: new RegExp(`^${q}`, "i"),
      }).select("_id username followers following");

    } else if (q.endsWith(".")) {
      // Group search
      const groupQuery = q.slice(0, -1); // Remove trailing dot

      const foundGroups = await Group.find({
        name: new RegExp(groupQuery, "i"),
      }).select("name members description");

      groups = foundGroups.map(group => ({
        name: group.name,
        description: group.description,
        memberCount: group.members.length,
      }));

    } else {
      // Post search
      posts = await Post.find({
        $or: [
          { title: new RegExp(q, "i") },
          { text: new RegExp(q, "i") }
        ]
      }).populate("user", "username").limit(10);
    }

    res.json({ users, posts, groups });

  } catch (error) {
    console.error("Error in search API:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

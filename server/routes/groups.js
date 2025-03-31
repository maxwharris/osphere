const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/auth");

// ✅ Create a new group
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const { name, description, isPrivate, admin } = req.body;

        if (!name || !admin) {
            return res.status(400).json({ error: "Group name and admin are required" });
        }

        // Check if the group name already exists
        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ error: "Group name already exists" });
        }

        // Create the new group and set the creator as admin
        const newGroup = new Group({
            name,
            description,
            isPrivate,
            admin: req.user.userId, // Assign the admin
            moderators: [],
            members: [req.user.userId], // Automatically add admin as a member
        });

        await newGroup.save();

        res.status(201).json({ message: "Group created successfully", group: newGroup });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Fetch a group name by ID
router.get("/id/:groupId", async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json({ name: group.name });
    } catch (error) {
        console.error("Error fetching group by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Fetch all public groups
router.get("/", async (req, res) => {
    try {
        const groups = await Group.find({ isPrivate: false });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Fetch a specific group by name
router.get("/:groupName", authMiddleware, async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.groupName })
            .populate("admin", "username")
            .populate("moderators", "username") // ✅ Include moderators
            .populate("members", "username");

        if (!group) return res.status(404).json({ error: "Group not found" });

        if (group.isPrivate && !group.members.includes(req.user.userId)) {
            return res.status(403).json({ error: "You do not have permission to view this group" });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Join a group
router.post("/:groupName/join", authMiddleware, async (req, res) => {
    try {

        const group = await Group.findOne({ name: req.params.groupName });
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!group.members.includes(req.user.userId)) {
            group.members.push(req.user.userId);
            await group.save();
        }

        res.json({ message: "Joined the group successfully", group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Leave a group
router.post("/:groupName/leave", authMiddleware, async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.groupName });
        if (!group) return res.status(404).json({ error: "Group not found" });

        group.members = group.members.filter(
            (member) => member && member.toString() !== req.user.userId
          );
        await group.save();

        res.json({ message: "Left the group successfully", group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Delete a group (Only Admin)
router.delete("/:groupName", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const group = await Group.findOne({ name: req.params.groupName });

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (group.admin.toString() !== userId) {
            return res.status(403).json({ error: "Only the admin can delete this group" });
        }

        await Group.deleteOne({ _id: group._id });

        res.json({ message: "Group deleted successfully" });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post("/:groupName/moderators/add", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findOne({ name: req.params.groupName });

        if (!group) return res.status(404).json({ error: "Group not found" });
        if (group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ error: "Only the admin can assign moderators" });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ error: "User must be a member before becoming a moderator" });
        }

        if (!group.moderators.includes(userId)) {
            group.moderators.push(userId);
            await group.save();
        }

        res.json({ message: "Moderator added successfully", group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/:groupName/moderators/remove", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findOne({ name: req.params.groupName });

        if (!group) return res.status(404).json({ error: "Group not found" });

        if (group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ error: "Only the admin can remove moderators" });
        }

        group.moderators = group.moderators.filter((mod) => mod.toString() !== userId);
        await group.save();

        res.json({ message: "Moderator removed successfully", group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Fetch all groups a user is in
router.get("/user/groups", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        

        // Find all groups where the user is a member, moderator, or admin
        const groups = await Group.find({
            $or: [{ members: userId }, { moderators: userId }, { admin: userId }],
        }).populate("admin", "_id").populate("moderators", "_id");

        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/:subdomain", async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.subdomain });

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

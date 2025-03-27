const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  text: { type: String, required: function () { return !this.files || this.files.length === 0; } },
  files: {
    type: [String],
    validate: [arr => arr.length <= 10, 'Maximum of 10 files allowed'],
    default: [],
  },
  fileTypes: {
    type: [String],
    enum: ["image", "video", "audio"],
    validate: [arr => arr.length <= 10, 'Maximum of 10 file types allowed'],
    default: [],
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", PostSchema);
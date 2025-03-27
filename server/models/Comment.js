const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // ✅ Parent comment ID for replies
  likes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  dislikes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Comment", CommentSchema);

const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isPrivate: { type: Boolean, default: false },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ✅ New field
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Group", GroupSchema);

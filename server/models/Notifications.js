const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notifications: [
    {
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      opened: { type: Boolean, default: false },
      type: { type: String, required: true },
      link: { type: String, required: true },
      fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    },
  ],
});

module.exports = mongoose.model("Notification", NotificationSchema);

require("dotenv").config({ path: "./.env" });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const socketIo = require("socket.io");
const session = require("express-session");
const passport = require("passport");
require("./server/auth/google"); // <-- ✅ Import the Google strategy

const authRoutes = require("./server/routes/auth");
const postRoutes = require("./server/routes/posts");
const userRoutes = require("./server/routes/users");
const commentRoutes = require("./server/routes/comments");
const messageRoutes = require("./server/routes/messages");
const groupRoutes = require("./server/routes/groups");
const searchRoutes = require("./server/routes/search");
const notifRoutes = require("./server/routes/notifications");

const app = express();
const server = http.createServer(app);

// ✅ Ensure 'uploads/' directory exists
const uploadDir = path.join(__dirname, "server/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Allow requests from osphere.io & all subdomains
const allowedOrigins = [
  "https://osphere.io",
  "https://www.osphere.io",
  "https://api.osphere.io",
  "https://*.osphere.io",
  "http://localhost:3000",
  "http://localhost:5000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(domain => origin.endsWith("osphere.io"))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(require("cookie-parser")());

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// ✅ Session middleware for Passport
app.use(session({
  secret: "keyboard cat", // ⚠️ Replace with strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: "lax",
    domain: ".osphere.io"
  }
}));

// ✅ Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// ✅ Serve images & uploads as static files
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});
app.use("/uploads", express.static(uploadDir));

// ✅ Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Check your .env file!");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ✅ API Routes
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notifRoutes);

// ✅ WebSocket setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const connectedUsers = new Map();

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🔴 Disconnected ${userId}`);
        break;
      }
    }
  });
});

module.exports.io = io;
module.exports.connectedUsers = connectedUsers;

app.get("/", (req, res) => {
  res.send("Circles API Running on osphere.io");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

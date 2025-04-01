const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const nodemailer = require("nodemailer");
const passport = require("passport");
require("../auth/google"); // import passport strategy

const router = express.Router();
const JWT_SECRET = "your_secret_key"; // Use environment variable for production
const TOKEN_EXPIRATION = "24h"; // Tokens expire in 1 hour

// Set up Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,  // Use 465 for SSL, 587 for TLS
  secure: false,
  auth: {
    user: "fuzegamingtv@gmail.com",  // Replace with your email
    pass: "krlwdvpltrszbncx",   // Replace with your email password or app password
  },
});

// ✅ Register a new user
router.post("/register", async (req, res) => {
  try {
    let { username, email, password } = req.body;

    // Validate username format
    if (!username.startsWith(".")) {
      return res.status(400).json({ error: "Username must start with a period (e.g., .john)" });
    }

    // Check if username or email is already taken
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already taken" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    console.log("")

    // Generate verification token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1d" });

    // Send verification email
    const verificationUrl = `https://api.osphere.io/api/auth/verify-email/${token}`;

    const mailOptions = {
      to: email,
      subject: "verify your Email",
      html: `<p>click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: "Email not sent" });
      }
      res.status(200).json({ message: "Verification email sent" });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Email Endpoint
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, JWT_SECRET);

    await User.findByIdAndUpdate(decoded.userId, { isVerified: true });
    res.redirect("https://osphere.io/login"); 

  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// ✅ User Login - Generate Token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Login attempt:", email); // ✅ Debug log

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Incorrect password");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log("✅ Login successful. Token generated.");

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,              // required for HTTPS
      sameSite: "lax",
      domain: ".osphere.io",     // ✅ this allows sharing the cookie across all subdomains
    });
    
    res.json({
      user: {
        username: user.username,
        email: user.email,
        id: user._id,
        isVerified: user.isVerified,
      }
    });
    
  } catch (error) {
    console.error("⚠️ Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get Current User Data (for Settings Page)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("username email");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update Profile
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }
    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete Account
router.delete("/delete", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Token Verification Route
router.get("/verify", (req, res) => {
  try {
    const token = req.header("Authorization").split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ✅ Logout (Client-Side Only: Just clear the token from localStorage)
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    domain: ".osphere.io",
    path: "/"
  });
  res.json({ message: "Logged out successfully" });
});

module.exports = router;

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      domain: ".osphere.io",
    });

    res.redirect("https://osphere.io"); // Redirect after successful login
  }
);
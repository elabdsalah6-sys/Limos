const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { generateOtp, saveOtp, verifyOtp } = require("../utils/otpService"); // 👈 add
const { sendVerificationEmail } = require("../utils/emailService"); // 👈 add

const pendingRegistrations = new Map(); // 👈 add

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// 👇 Replace the old register with these two functions
const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    pendingRegistrations.set(email, { name, email, password, phone, address });

    const code = generateOtp();
    saveOtp(email, code);
    await sendVerificationEmail(email, code, "verify");

    res.status(200).json({ message: "Verification code sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = verifyOtp(email, code);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const userData = pendingRegistrations.get(email);
    if (!userData) {
      return res
        .status(400)
        .json({ message: "Session expired. Please register again." });
    }

    const user = await User.create(userData);
    pendingRegistrations.delete(email);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account with that email" });
    }

    const code = generateOtp();
    saveOtp(email, code);
    await sendVerificationEmail(email, code, "reset"); // 👈 "reset" sends the reset-themed email

    res.json({ message: "Reset code sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = verifyOtp(email, code);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    res.json({ message: "Code verified.", email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body; // 👈 now takes email + password, no token

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      message: "Password reset successful.",
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, currentPassword, newPassword } =
      req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ message: "Incorrect password." });

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    if (newPassword) {
      if (newPassword.length < 6)
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters." });
      user.password = newPassword;
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  verifyResetCode,
};

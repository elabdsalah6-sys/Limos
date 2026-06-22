const express = require("express");
const router = express.Router();
const {
  getFeatured,
  setFeatured,
  getInstapay,
  setInstapay,
  getStoreStatus,
  setStoreStatus,
} = require("../controllers/settingsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/featured", getFeatured);
router.put("/featured", protect, adminOnly, setFeatured);

router.get("/instapay", getInstapay);
router.put("/instapay", protect, adminOnly, setInstapay);

router.get("/store-status", getStoreStatus);
router.put("/store-status", protect, adminOnly, setStoreStatus);

// GET /settings/notification
const Settings = require("../models/Settings");

// GET /settings/notification
router.get("/notification", async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "notification" });
    res.json({ message: setting?.value ?? "" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /settings/notification
router.put("/notification", protect, adminOnly, async (req, res) => {
  try {
    const { message } = req.body;
    await Settings.findOneAndUpdate(
      { key: "notification" },
      { value: message ?? "" },
      { upsert: true },
    );
    res.json({ message: message ?? "" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

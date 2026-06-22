const express = require("express");
const router = express.Router();
const PickupLocation = require("../models/PickupLocation");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/* ── GET all active pickup locations (public, used at checkout) ── */
router.get("/", async (req, res) => {
  try {
    const locations = await PickupLocation.find({ isActive: true });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pickup locations." });
  }
});

/* ── GET all pickup locations, active + inactive (admin) ── */
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const locations = await PickupLocation.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pickup locations." });
  }
});

/* ── CREATE a pickup location (admin) ── */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, address, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Location name is required." });
    }
    const location = await PickupLocation.create({
      name: name.trim(),
      address: address?.trim() || "",
      isActive: isActive ?? true,
    });
    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create pickup location." });
  }
});

/* ── UPDATE a pickup location (admin) ── */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, address, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (address !== undefined) update.address = address.trim();
    if (isActive !== undefined) update.isActive = isActive;

    const location = await PickupLocation.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true },
    );
    if (!location) {
      return res.status(404).json({ message: "Pickup location not found." });
    }
    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update pickup location." });
  }
});

/* ── DELETE a pickup location (admin) ── */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const location = await PickupLocation.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ message: "Pickup location not found." });
    }
    res.json({ message: "Pickup location deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete pickup location." });
  }
});

module.exports = router;

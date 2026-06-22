const express = require("express");
const router = express.Router();
const DeliveryRegion = require("../models/DeliveryRegion");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public: get all active regions (for checkout)
router.get("/", async (req, res) => {
  try {
    const regions = await DeliveryRegion.find({ active: true }).sort("name");
    res.json(regions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// adminOnly: get ALL regions including inactive
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const regions = await DeliveryRegion.find().sort("name");
    res.json(regions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// adminOnly: create region
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const region = await DeliveryRegion.create(req.body);
    res.status(201).json(region);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// adminOnly: update region
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const region = await DeliveryRegion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!region) return res.status(404).json({ message: "Not found" });
    res.json(region);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// adminOnly: delete region
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await DeliveryRegion.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

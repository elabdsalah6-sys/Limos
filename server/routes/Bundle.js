const express = require("express");
const router = express.Router();
const Bundle = require("../models/Bundle");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", async (_, res) => {
  try {
    const bundles = await Bundle.find().populate("fixedItems.product");
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const b = await Bundle.create(req.body);
    const populated = await Bundle.findById(b._id).populate(
      "fixedItems.product",
    );
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const b = await Bundle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("fixedItems.product");
    res.json(b);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Bundle.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Discount = require("../models/Discountcode");
const {
  getAllCodes,
  validateCode,
  createCode,
  updateCode,
  deleteCode,
  useCode,
} = require("../controllers/discountController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/validate", validateCode); // public
router.get("/", protect, adminOnly, getAllCodes); // admin
router.post("/", protect, adminOnly, createCode); // admin
router.put("/:id", protect, adminOnly, updateCode); // admin
router.delete("/:id", protect, adminOnly, deleteCode); // admin
router.post("/:id/use", protect, adminOnly, useCode); // internal

// routes/discounts.js  (add this route to your existing discounts router)
// POST /api/discounts/apply
// Body: { code, orderAmount }

router.post("/apply", async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({ message: "No code provided." });
    }

    const discount = await Discount.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!discount) {
      return res.status(404).json({ message: "Code not found." });
    }

    if (!discount.active) {
      return res
        .status(400)
        .json({ message: "This code is no longer active." });
    }

    if (discount.expiresAt && new Date() > new Date(discount.expiresAt)) {
      return res.status(400).json({ message: "This code has expired." });
    }

    if (
      discount.maxUses !== null &&
      discount.maxUses !== undefined &&
      discount.usedCount >= discount.maxUses
    ) {
      return res.status(400).json({ message: "The code has expired." });
    }

    if (discount.minOrderAmount > 0 && orderAmount < discount.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order of ${discount.minOrderAmount} EGP required for this code.`,
      });
    }

    if (
      discount.maxAmount !== null &&
      discount.maxAmount !== undefined &&
      orderAmount > discount.maxAmount
    ) {
      return res.status(400).json({
        message: `This code is only valid for orders up to ${discount.maxAmount} EGP.`,
      });
    }

    // Calculate discount amount
    let discountAmount =
      discount.type === "percentage"
        ? (orderAmount * discount.value) / 100
        : discount.value;

    // Never exceed the order total
    discountAmount = Math.min(discountAmount, orderAmount);

    return res.json({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discount: discountAmount, // EGP amount to subtract
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;

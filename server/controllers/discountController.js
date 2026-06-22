const DiscountCode = require("../models/Discountcode");

// GET /api/discounts — admin: all codes
const getAllCodes = async (req, res) => {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/discounts/validate — public: validate a code at checkout
const validateCode = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const discount = await DiscountCode.findOne({ code: code?.toUpperCase() });

    if (!discount) return res.status(404).json({ message: "Code not found." });
    if (!discount.active)
      return res.status(400).json({ message: "This code is inactive." });
    if (discount.expiresAt && new Date() > discount.expiresAt)
      return res.status(400).json({ message: "This code has expired." });
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses)
      return res.status(400).json({ message: "The code has expired." });
    if (orderTotal < discount.minOrderAmount)
      return res.status(400).json({
        message: `Minimum order of ${discount.minOrderAmount} EGP required.`,
      });

    // ✅ NEW: block if order total exceeds maxAmount
    if (discount.maxAmount !== null && orderTotal > discount.maxAmount) {
      return res.status(400).json({
        message: `This code is only valid for orders up to ${discount.maxAmount} EGP.`,
      });
    }

    let saving =
      discount.type === "percentage"
        ? (orderTotal * discount.value) / 100
        : discount.value;

    // This branch now only runs for the percentage cap use-case (separate from maxAmount)
    if (discount.type === "percentage" && discount.maxAmount) {
      saving = Math.min(saving, discount.maxAmount);
    }

    res.json({ valid: true, discount, saving: Math.min(saving, orderTotal) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/discounts — admin: create code
const createCode = async (req, res) => {
  try {
    const code = await DiscountCode.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json(code);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Code already exists." });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/discounts/:id — admin: update code
const updateCode = async (req, res) => {
  try {
    const code = await DiscountCode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!code) return res.status(404).json({ message: "Code not found." });
    res.json(code);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/discounts/:id — admin: delete code
const deleteCode = async (req, res) => {
  try {
    await DiscountCode.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/discounts/:id/use — internal: increment usedCount after order
const useCode = async (req, res) => {
  try {
    await DiscountCode.findByIdAndUpdate(req.params.id, {
      $inc: { usedCount: 1 },
    });
    res.json({ message: "Usage recorded." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllCodes,
  validateCode,
  createCode,
  updateCode,
  deleteCode,
  useCode,
};

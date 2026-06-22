const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { sendCancellationEmail } = require("../utils/emailService");
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const {
  protect,
  optionalProtect,
  adminOnly,
} = require("../middleware/authMiddleware");

/* ── Create Order ── */
router.post("/", optionalProtect, createOrder);

/* ── My Orders ── */
router.get("/mine", protect, getMyOrders);

/* ── All Orders (admin) ── */
router.get("/", protect, adminOnly, getAllOrders);

/* ── Cancel Order (user) ── */
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status !== "pending")
      return res
        .status(400)
        .json({ message: "Only pending orders can be cancelled." });

    order.status = "cancelled";
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "name email phone",
    );
    sendCancellationEmail(populatedOrder).catch((err) =>
      console.error("Cancellation email failed:", err.message),
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Update Order Status (admin) ── */
router.put("/:id", protect, adminOnly, updateOrderStatus);

module.exports = router;

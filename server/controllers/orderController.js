const Order = require("../models/Order");
const Discount = require("../models/Discountcode");
const DeliveryRegion = require("../models/DeliveryRegion");
const PickupLocation = require("../models/PickupLocation");
const { sendOrderNotification } = require("../utils/emailService");

/* ── Create Order ── */

const createOrder = async (req, res) => {
  try {
    const {
      items,
      fulfillmentType,
      deliveryAddress,
      paymentMethod,
      guestInfo,
      discountCode,
      discountSavings,
      deliveryRegionId,
      pickupLocationId,
      itemsTotal,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    const subtotal =
      itemsTotal ??
      items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const savings = discountSavings ?? 0;
    const checkoutPhone = guestInfo?.phone || req.user?.phone || "";

    let deliveryRegion = null;
    let pickupLocation = null;
    let deliveryFee = 0;

    if (fulfillmentType === "pickup") {
      const location = await PickupLocation.findById(pickupLocationId);
      if (!location || !location.isActive) {
        return res.status(400).json({ message: "Invalid pickup location." });
      }
      pickupLocation = { name: location.name, address: location.address };
    } else {
      const region = await DeliveryRegion.findById(deliveryRegionId);
      if (!region || !region.active) {
        return res.status(400).json({ message: "Invalid delivery region." });
      }
      deliveryRegion = { name: region.name, price: region.price };
      deliveryFee = region.price;
    }

    const finalPrice = Math.max(0, subtotal + deliveryFee - savings);

    const order = await Order.create({
      user: req.user ? req.user._id : null,
      guestInfo: guestInfo || null,
      checkoutPhone,
      items,
      totalPrice: finalPrice,
      notes: notes?.trim() || "",
      discountCode: discountCode || null,
      discountSavings: savings,
      fulfillmentType,
      deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : null,
      paymentMethod,
      deliveryRegion,
      pickupLocation,
    });

    if (discountCode) {
      await Discount.findOneAndUpdate(
        { code: discountCode.trim().toUpperCase() },
        { $inc: { usedCount: 1 } },
      );
    }

    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "name email phone",
    );

    sendOrderNotification(populatedOrder).catch((err) =>
      console.error("Order email failed:", err.message),
    );

    const io = req.app.get("io");
    if (io) io.emit("new_order", { orderId: order._id });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── My Orders ── */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name image")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── All Orders (admin) ── */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("items.product", "name image")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Update Order Status (admin) ── */
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus };

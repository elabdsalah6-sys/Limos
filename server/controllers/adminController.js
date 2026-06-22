const User = require("../models/User");
const Order = require("../models/Order");

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "admin"].includes(role))
      return res.status(400).json({ message: "Invalid role." });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res
        .status(400)
        .json({ message: "Cannot delete your own account." });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── helpers ──────────────────────────────────────────────────────────────────

// Returns "YYYY-MM-DD" in Egypt local time (UTC+2, no DST)
const toEgyptDateStr = (date) => {
  const EGYPT_OFFSET_MS = 2 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + EGYPT_OFFSET_MS);
  return local.toISOString().slice(0, 10);
};

// GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const [orders, totalCustomers] = await Promise.all([
      Order.find().lean(), // .lean() returns plain objects — faster, no Mongoose overhead
      User.countDocuments({ role: "customer" }),
    ]);

    // Deduplicate by _id just in case
    const seen = new Set();
    const uniqueOrders = orders.filter((o) => {
      const id = o._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Realized revenue: delivered orders only
    const deliveredRevenue = uniqueOrders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + o.totalPrice, 0);

    // Status breakdown
    const statusCounts = uniqueOrders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        on_the_way: 0,
        delivered: 0,
        cancelled: 0,
      },
    );

    // Revenue by day — last 7 days in Egypt time, delivered orders only
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return toEgyptDateStr(d);
    });

    const revenueByDay = days.map((day) => ({
      date: day,
      revenue: uniqueOrders
        .filter(
          (o) =>
            o.status === "delivered" &&
            toEgyptDateStr(new Date(o.createdAt)) === day,
        )
        .reduce((s, o) => s + o.totalPrice, 0),
    }));

    res.json({
      totalOrders: uniqueOrders.length,
      deliveredRevenue,
      totalCustomers,
      statusCounts,
      revenueByDay,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllUsers, updateUserRole, deleteUser, getAnalytics };

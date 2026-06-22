const Settings = require("../models/Settings");

// GET /api/settings/featured
const getFeatured = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "featured_products" });
    res.json(setting ? setting.value : []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/settings/featured
const setFeatured = async (req, res) => {
  try {
    const { ids } = req.body;
    await Settings.findOneAndUpdate(
      { key: "featured_products" },
      { value: ids },
      { upsert: true, new: true },
    );
    res.json({ message: "Featured products updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/settings/instapay
const getInstapay = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "instapay" });
    res.json({ value: setting ? setting.value : null });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/settings/instapay
const setInstapay = async (req, res) => {
  try {
    const { value } = req.body;
    await Settings.findOneAndUpdate(
      { key: "instapay" },
      { value },
      { upsert: true, new: true },
    );
    res.json({ value });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/settings/store-status
const getStoreStatus = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "store_status" });
    const isOpen = setting ? setting.value.isOpen : true; // default open if never set
    res.json({ isOpen });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/settings/store-status
const setStoreStatus = async (req, res) => {
  try {
    const { isOpen } = req.body;

    if (typeof isOpen !== "boolean") {
      return res.status(400).json({ message: "isOpen must be true or false" });
    }

    await Settings.findOneAndUpdate(
      { key: "store_status" },
      { value: { isOpen } },
      { upsert: true, new: true },
    );

    // notify all connected clients immediately, same pattern as new_order
    const io = req.app.get("io");
    if (io) io.emit("store_status_changed", { isOpen });

    res.json({ isOpen });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getFeatured,
  setFeatured,
  getInstapay,
  setInstapay,
  getStoreStatus,
  setStoreStatus,
};

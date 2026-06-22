const mongoose = require("mongoose");

const pickupLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.PickupLocation ||
  mongoose.model("PickupLocation", pickupLocationSchema);

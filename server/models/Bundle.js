const mongoose = require("mongoose");

const BundleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["pick", "static"], default: "pick" }, // "pick" = customer chooses | "static" = admin-fixed box
    name: { type: String, required: true }, // "Box of 3"
    description: { type: String, default: "" },
    quantity: { type: Number, required: true }, // 3
    discountPct: { type: Number, required: true }, // 10
    eligibleCategory: { type: String, default: "" }, // "cinnabon" or "" for all
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },

    // static/fixed-box-only fields
    originalPrice: { type: Number }, // pre-discount total for the fixed box
    offerPrice: { type: Number }, // final price customer pays
    fixedItems: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bundle", BundleSchema);

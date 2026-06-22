const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, required: true }, // current / sale price
  originalPrice: { type: Number }, // before-offer price (optional)
  offerActive: { type: Boolean, default: false }, // is this size on offer?
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      required: true,
    },
    flavorType: {
      type: String,
      enum: ["signature", "premium", null],
      default: null,
    },
    sizes: [sizeSchema],
    flavors: [{ type: String }],
    image: { type: String },
    boxSizes: [{ type: Number }], // e.g. [6, 12]
    offer: {
      label: { type: String }, // global banner label e.g. "Spring Sale"
      active: { type: Boolean, default: false },
    },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);

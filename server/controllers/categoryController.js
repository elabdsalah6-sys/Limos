const Category = require("../models/Category");

// GET /api/categories — active only (for customers + product form)
exports.getCategories = async (req, res) => {
  try {
    const cats = await Category.find({ active: true }).sort({
      sortOrder: 1,
      name: 1,
    });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/categories/all — all including inactive (admin only)
exports.getAllCategories = async (req, res) => {
  try {
    const cats = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/categories
// helper at the top of the file
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const cat = new Category({
      ...req.body,
      slug: slugify(req.body.name), // ← generate slug here
    });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "A category with that name already exists." });
    }
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.body.name) update.slug = slugify(req.body.name); // ← regenerate on name change
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

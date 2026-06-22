const Donut = require("../models/donut");

const getAllDonuts = async (req, res) => {
  const donuts = await Donut.find();
  res.json(donuts);
};

module.exports = { getAllDonuts };

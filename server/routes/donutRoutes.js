const express = require("express");
const router = express.Router();
const { getAllDonuts } = require("../controllers/donutController");

router.get("/", getAllDonuts);

module.exports = router;

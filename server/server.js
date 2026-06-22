const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/discounts", require("./routes/discountRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/delivery-regions", require("./routes/deliveryRegions"));
app.use("/api/pickup-locations", require("./routes/pickupLocations"));
const settingsRoutes = require("./routes/settingsRoutes");
app.use("/api/settings", settingsRoutes);

const bundleRoutes = require("./routes/Bundle");
app.use("/api/bundles", bundleRoutes);
const donutRoutes = require("./routes/donutRoutes");
app.use("/api/donuts", donutRoutes);

app.use("/api/categories", require("./routes/categoryRoutes"));

app.get("/", (req, res) => res.send("Cinnabon API running"));

/* ── Socket.io ── */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  socket.on("disconnect", () => console.log("Admin disconnected:", socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

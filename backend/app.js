const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const staffRoutes = require("./routes/staff");
const userRoutes = require("./routes/user");

const { notifications } = require("./data/mockNotifications");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "kidhen-dev-secret", resave: false, saveUninitialized: false }));

// ทุกหน้า: ส่งจำนวนแจ้งเตือนที่ยังไม่อ่านไปให้แถบด้านบน
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  const username = req.session.user?.username;
  res.locals.unreadCount = notifications.filter((n) => n.to === username && !n.read).length;
  next();
});

app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/staff", staffRoutes);
app.use("/user", userRoutes);

app.listen(3000, () => console.log("เปิดเว็บที่   "));
// แก้: app.js ตั้งค่าเว็บอย่างเดียว
// ย้ายการเปิดพอร์ตไป server.js

const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const staffRoutes = require("./routes/staff");
const userRoutes = require("./routes/user");
const profileRoutes = require("./routes/profile");
const notificationRoutes = require("./routes/notifications");

const faqRoutes = require("./routes/faq");

const issueRoutes = require("./routes/ai");

const { users } = require("./data/mockUsers");
const { notifications } = require("./data/mockNotifications");

const app = express();

// ตั้งค่า EJS
app.set("view engine", "ejs");
app.set(
  "views",
  path.join(__dirname, "../frontend/views")
);

// ไฟล์ CSS, รูป และ JavaScript
app.use(
  express.static(
    path.join(__dirname, "../frontend/public")
  )
);

// ของเดิม: อ่านข้อมูลจาก HTML form
app.use(express.urlencoded({ extended: true }));

// แก้: รองรับ SESSION_SECRET จาก .env
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "kidhen-dev-secret",

    resave: false,
    saveUninitialized: false,
  })
);

// ของเดิม: ข้อมูลสำหรับ topbar และ sidebar
app.use((req, res, next) => {
  const username = req.session.user?.username;

  res.locals.currentUser =
    req.session.user || null;

  res.locals.currentAvatar =
    users.find(
      (user) => user.username === username
    )?.avatar || "";

  res.locals.unreadCount =
    notifications.filter(
      (notification) =>
        notification.to === username &&
        !notification.read
    ).length;

  next();
});

app.use("/admin/faq", faqRoutes);

app.use("/user/issues", issueRoutes);

app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/staff", staffRoutes);
app.use("/profile", profileRoutes);
app.use("/notifications", notificationRoutes);
app.use("/user", userRoutes);

module.exports = app;
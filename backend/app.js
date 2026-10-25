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

const production = process.env.NODE_ENV === "production";

if (
  production &&
  (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.trim().length < 32
  )
) {
  throw new Error(
    "SESSION_SECRET ต้องมีอย่างน้อย 32 ตัวอักษรเมื่อใช้ production"
  );
}

// เพิ่ม: ให้ ALB ตรวจเว็บได้โดยไม่ต้อง login
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Health check
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/internal/ai", require("./routes/ai-job"));

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
  const account = users.find(user => user.username === username);

  // แก้: บัญชีที่ถูกลบต้องใช้งาน session เดิมต่อไม่ได้
  if (req.session.user && !account) {
    return req.session.destroy(error => {
      if (error) return next(error);
      res.redirect("/login");
    });
  }

  // แก้: การเปลี่ยน role มีผลใน request ถัดไป
  if (account) {
    req.session.user = {
      username: account.username,
      name: account.name,
      role: account.role,
    };
  }

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

app.use((error, req, res, next) => {
  console.error("[HTTP]", error.message);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;

  res.status(status).type("text").send(
    status < 500
      ? error.message
      : "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
  );
});

module.exports = app;
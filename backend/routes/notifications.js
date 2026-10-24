const express = require("express");
const router = express.Router();
const { notifications, saveNotifications } = require("../data/mockNotifications");
const { formatThaiDate } = require("../utils/date");

// หน้าคำร้องของแต่ละ role (ใช้ตอนกดแจ้งเตือน)
const BASE = { ADMIN: "/admin", STAFF: "/staff", USER: "/user" };

// ต้อง login ก่อน
router.use((req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
});

// หน้าแจ้งเตือน
router.get("/", (req, res) => {
  const username = req.session.user.username;
  const tab = req.query.tab || "all";

  const mine = notifications.filter((n) => n.to === username);

  let list = mine;
  if (tab === "unread")  list = mine.filter((n) => !n.read);
  if (tab === "request") list = mine.filter((n) => n.category === "request");

  // แสดงรายการ (ยังไม่อ่าน = สีเด่น จนกว่าจะกดเข้าไปดู)
  const view = list.map((n) => ({ ...n, time: formatThaiDate(n.createdAt) }));

  res.render("notifications", {
    title: "แจ้งเตือน",
    active: "notifications",
    role: req.session.user.role.toLowerCase(),
    list: view,
    tab,
  });
});

// กดที่แจ้งเตือน → ไปหน้าคำร้องตาม role
router.get("/:id", (req, res) => {
  const n = notifications.find(
    (x) => x.id === Number(req.params.id) && x.to === req.session.user.username
  );
  if (!n) return res.redirect("/notifications");

  if (!n.read) { n.read = true; saveNotifications(); }

  const base = BASE[req.session.user.role];
  res.redirect(n.requestId ? `${base}/requests/${n.requestId}` : "/notifications");
});

module.exports = router;
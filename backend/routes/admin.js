const express = require("express");
const router = express.Router();
const { requests, TYPES, STATUSES } = require("../data/mockRequests");

// ทุกหน้าในไฟล์นี้ ต้องเป็น ADMIN เท่านั้น
router.use((req, res, next) => {
  if (req.session.user?.role !== "ADMIN") return res.redirect("/login");
  next();
});

// หน้า Dashboard
router.get("/dashboard", (req, res) => {
  res.render("admin/dashboard", { title: "Dashboard", active: "dashboard" });
});

// หน้า จัดการคำร้อง (ค้นหา + กรอง)
router.get("/requests", (req, res) => {
  const { q = "", type = "", status = "" } = req.query;
  const keyword = q.trim().toLowerCase();

  const list = requests.filter((r) =>
    (!keyword || r.title.toLowerCase().includes(keyword) || r.code.includes(keyword)) &&
    (!type || r.type === type) &&
    (!status || r.status === status)
  );

  res.render("admin/requests", {
    title: "จัดการคำร้อง",
    active: "requests",
    list,
    TYPES,
    STATUSES,
    filters: { q, type, status },
  });
});

// เปลี่ยนสถานะคำร้อง
router.post("/requests/:id/status", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (item && STATUSES.includes(req.body.status)) {
    item.status = req.body.status;
  }
  res.redirect(req.get("Referer") || "/admin/requests");
});

module.exports = router;
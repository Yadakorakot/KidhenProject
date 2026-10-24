const express = require("express");
const router = express.Router();
const { requests, TYPES, STATUSES, saveRequests } = require("../data/mockRequests");
const { notify } = require("../data/mockNotifications");

// ทุกหน้าในไฟล์นี้ ต้องเป็น STAFF เท่านั้น
router.use((req, res, next) => {
  if (req.session.user?.role !== "STAFF") return res.redirect("/login");
  next();
});

// หน้า Dashboard
router.get("/dashboard", (req, res) => {
  res.render("staff/dashboard", { title: "Dashboard", active: "dashboard" });
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

  res.render("staff/requests", {
    title: "จัดการคำร้อง",
    active: "requests",
    list,
    TYPES,
    STATUSES,
    filters: { q, type, status },
  });
});

// แจ้งเตือน User
router.post("/requests/:id/status", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (item && STATUSES.includes(req.body.status) && item.status !== req.body.status) {
    item.status = req.body.status;
    notify(item.owner, item.id, `คำร้อง ${item.code} สถานะ: ${item.status}`);
  }
  res.redirect(req.get("Referer") || "/staff/requests");
});

// หน้า ดำเนินการคำร้อง
router.get("/requests/:id", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (!item) return res.redirect("/staff/requests");

  res.render("staff/request-detail", {
    title: "จัดการคำร้อง",
    active: "requests",
    item,
    STATUSES,
    saved: req.query.saved === "1",
  });
});

// กดปุ่ม อัปเดตสถานะ
// กดปุ่ม อัปเดตสถานะ → บันทึก + แจ้งเตือน User
router.post("/requests/:id/update", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (!item) return res.redirect("/staff/requests");

  const oldStatus = item.status;
  const oldNote = item.note;

  if (STATUSES.includes(req.body.status)) item.status = req.body.status;
  if (item.status !== oldStatus) {
  item.history = item.history || [];
  item.history.push({ status: item.status, at: new Date() });
}
  item.note = (req.body.note || "").trim();

  // ส่งแจ้งเตือนเฉพาะเมื่อมีอะไรเปลี่ยน
  if (item.status !== oldStatus || item.note !== oldNote) {
  let title;
  if (item.status !== oldStatus && item.status === "เสร็จสิ้น") {
    title = `คำร้อง ${item.code} ได้รับการแก้ไขแล้ว`;
  } else if (item.status !== oldStatus) {
    title = `คำร้อง ${item.code} ได้รับการอัพเดตสถานะ`;
  } else {
    title = `คำร้อง ${item.code} มีข้อความจากเจ้าหน้าที่`;
  }

  let message = `สถานะเปลี่ยนเป็น ${item.status}`;
  if (item.note) message += ` ${item.note}`;

  notify(item.owner, { requestId: item.id, title, message, status: item.status });
}

  saveRequests();

  res.redirect(`/staff/requests/${item.id}?saved=1`);
});

module.exports = router;
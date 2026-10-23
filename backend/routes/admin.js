const express = require("express");
const router = express.Router();
const { requests, TYPES, STATUSES } = require("../data/mockRequests");
const { notify } = require("../data/mockNotifications");
const { users, ROLES } = require("../data/mockUsers");
const { faqs, FAQ_STATUSES } = require("../data/mockFaqs");
const { formatThaiDate } = require("../utils/date");

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

// แจ้งเตือน User
router.post("/requests/:id/status", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (item && STATUSES.includes(req.body.status) && item.status !== req.body.status) {
    item.status = req.body.status;
    notify(item.owner, item.id, `คำร้อง ${item.code} สถานะ: ${item.status}`);
  }
  res.redirect(req.get("Referer") || "/admin/requests");
});

// หน้า ดำเนินการคำร้อง
router.get("/requests/:id", (req, res) => {
  const item = requests.find((r) => r.id === Number(req.params.id));
  if (!item) return res.redirect("/admin/requests");

  res.render("admin/request-detail", {
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
  if (!item) return res.redirect("/admin/requests");

  const oldStatus = item.status;
  const oldNote = item.note;

  if (STATUSES.includes(req.body.status)) item.status = req.body.status;
  item.note = (req.body.note || "").trim();

  // ส่งแจ้งเตือนเฉพาะเมื่อมีอะไรเปลี่ยน
  if (item.status !== oldStatus || item.note !== oldNote) {
    let message = `คำร้อง ${item.code} สถานะ: ${item.status}`;
    if (item.note) message += ` — ${item.note}`;
    notify(item.owner, item.id, message);
  }

  res.redirect(`/admin/requests/${item.id}?saved=1`);
});

// หน้า จัดการผู้ใช้ (ค้นหา + กรองบทบาท)
router.get("/users", (req, res) => {
  const { q = "", role = "" } = req.query;
  const keyword = q.trim().toLowerCase();

  const list = users.filter((u) =>
    (!keyword || u.name.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword)) &&
    (!role || u.role === role)
  );

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "ADMIN").length,
    staff: users.filter((u) => u.role === "STAFF").length,
  };

  res.render("admin/users", {
    title: "จัดการผู้ใช้",
    active: "users",
    list,
    ROLES,
    stats,
    filters: { q, role },
  });
});

// หน้า จัดการปัญหาที่พบบ่อย (ค้นหา + กรอง)
router.get("/faq", (req, res) => {
  const { q = "", type = "", status = "" } = req.query;
  const keyword = q.trim().toLowerCase();

  const list = faqs
    .filter((f) =>
      (!keyword || f.title.toLowerCase().includes(keyword)) &&
      (!type || f.type === type) &&
      (!status || f.status === status)
    )
    .sort((a, b) => b.updatedAt - a.updatedAt); // ล่าสุดขึ้นก่อน

  res.render("admin/faq", {
    title: "จัดการปัญหาที่พบบ่อย",
    active: "faq",
    list,
    TYPES,
    FAQ_STATUSES,
    filters: { q, type, status },
    formatThaiDate,
  });
});

// ลบปัญหาที่พบบ่อย
router.post("/faq/:id/delete", (req, res) => {
  const index = faqs.findIndex((f) => f.id === Number(req.params.id));
  if (index !== -1) faqs.splice(index, 1);
  res.redirect(req.get("Referer") || "/admin/faq");
});

// หน้า รายละเอียดปัญหาที่พบบ่อย
router.get("/faq/:id", (req, res) => {
  const item = faqs.find((f) => f.id === Number(req.params.id));
  if (!item) return res.redirect("/admin/faq");

  res.render("admin/faq-detail", {
    title: "จัดการปัญหาที่พบบ่อย",
    active: "faq",
    item,
    error: null,
  });
});

// กดปุ่ม อนุมัติ → บันทึกคำอธิบาย + เผยแพร่
router.post("/faq/:id/approve", (req, res) => {
  const item = faqs.find((f) => f.id === Number(req.params.id));
  if (!item) return res.redirect("/admin/faq");

  const answer = (req.body.answer || "").trim();

  if (!answer) {
    return res.render("admin/faq-detail", {
      title: "จัดการปัญหาที่พบบ่อย",
      active: "faq",
      item,
      error: "กรุณาเขียนคำอธิบายก่อนเผยแพร่",
    });
  }

  item.answer = answer;
  item.status = "เผยแพร่แล้ว";
  item.updatedAt = new Date();

  res.redirect("/admin/faq");
});

module.exports = router;
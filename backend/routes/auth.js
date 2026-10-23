const express = require("express");
const router = express.Router();
const { users } = require("../data/mockUsers");

// หน้าแรกของแต่ละ role หลัง login
const HOME = {
  ADMIN: "/admin/dashboard",
  STAFF: "/staff/dashboard",
  USER:  "/user/home",
};

router.get("/", (req, res) => res.redirect("/login"));

router.get("/login", (req, res) => res.render("auth/login"));

router.get("/signin", (req, res) => res.render("auth/signin", { error: null }));

router.post("/signin", (req, res) => {
  const key = (req.body.username || "").trim().toLowerCase();
  const account = users.find((u) => u.username === key);

  if (!account || account.password !== req.body.password) {
    return res.render("auth/signin", { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  req.session.user = { username: account.username, name: account.name, role: account.role };
  res.redirect(HOME[account.role]);
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ---------- ทางลัดทดสอบ (ลบออกเมื่อต่อ Google Login จริง) ----------

// เข้าเป็น Admin
router.get("/demo-admin", (req, res) => {
  req.session.user = { username: "admin", name: "ผู้ดูแลระบบ", role: "ADMIN" };
  res.redirect(HOME.ADMIN);
});

// เข้าเป็น Staff
router.get("/demo-staff", (req, res) => {
  req.session.user = { username: "staff", name: "สมชาย ใจดี", role: "STAFF" };
  res.redirect(HOME.STAFF);
});

// เข้าเป็น User
router.get("/demo-user", (req, res) => {
  req.session.user = { username: "user", name: "สมหญิง เรียนดี", role: "USER" };
  res.redirect(HOME.USER);
});

module.exports = router;
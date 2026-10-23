const express = require("express");
const router = express.Router();

// ข้อมูลจำลอง — เดี๋ยวเปลี่ยน
const MOCK_ACCOUNTS = {
  admin: { password: "1234", role: "ADMIN", home: "/admin/dashboard" },
  staff: { password: "1234", role: "STAFF", home: "/staff/requests" },
  user:  { password: "1234", role: "USER",  home: "/user/home" },
};

router.get("/", (req, res) => res.redirect("/login"));

router.get("/login", (req, res) => res.render("auth/login"));

router.get("/signin", (req, res) => res.render("auth/signin", { error: null }));

router.post("/signin", (req, res) => {
  const { username, password } = req.body;
  const account = MOCK_ACCOUNTS[(username || "").trim().toLowerCase()];

  if (!account || account.password !== password) {
    return res.render("auth/signin", { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  req.session.user = { username, role: account.role };
  res.redirect(account.home);
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// login เข้าเป็น Admin
router.get("/demo-admin", (req, res) => {
  req.session.user = { username: "admin", role: "ADMIN" };
  res.redirect("/admin/dashboard");
});

module.exports = router;
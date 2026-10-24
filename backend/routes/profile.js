const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const { users, saveUsers } = require("../data/mockUsers");

// อัปโหลดรูปโปรไฟล์ → frontend/public/uploads/avatars
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../frontend/public/uploads/avatars"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.session.user.username}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // ไม่เกิน 2MB
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ต้อง login ก่อน (role ไหนก็ได้)
router.use((req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
});

function findMe(req) {
  return users.find((u) => u.username === req.session.user.username);
}

function renderProfile(res, me, extra = {}) {
  res.render("user/profile", {
    title: "แก้ไขข้อมูลผู้ใช้",
    active: "profile",
    me,
    error: null,
    saved: false,
    ...extra,
  });
}

// เปิดหน้าโปรไฟล์
router.get("/", (req, res) => {
  const me = findMe(req);
  if (!me) return res.redirect("/logout");
  renderProfile(res, me, { saved: req.query.saved === "1" });
});

// กด บันทึกข้อมูล
router.post("/", (req, res) => {
  upload.single("avatar")(req, res, (err) => {
    const me = findMe(req);
    if (!me) return res.redirect("/logout");

    if (err) {
      return renderProfile(res, me, { error: "อัปโหลดรูปไม่สำเร็จ: ต้องเป็นไฟล์รูป และไม่เกิน 2MB" });
    }

    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    if (!firstName || !lastName) {
      return renderProfile(res, me, { error: "กรุณากรอกชื่อและนามสกุล" });
    }

    me.firstName = firstName;
    me.lastName = lastName;
    me.name = `${firstName} ${lastName}`;
    if (req.file) me.avatar = "/uploads/avatars/" + req.file.filename;

    saveUsers();
    req.session.user.name = me.name;

    res.redirect("/profile?saved=1");
  });
});

module.exports = router;
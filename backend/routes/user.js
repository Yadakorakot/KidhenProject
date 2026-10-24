const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();

const { requests, TYPES, STATUSES, saveRequests } = require("../data/mockRequests");
const { faqs } = require("../data/mockFaqs");
const { formatThaiDate, formatThaiShortDate } = require("../utils/date");
const { notify } = require("../data/mockNotifications");
const { users } = require("../data/mockUsers");

// ---------- ตั้งค่าอัปโหลดรูป ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../frontend/public/uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 }, // รูปละไม่เกิน 5MB, สูงสุด 3 รูป
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ทุกหน้าในไฟล์นี้ ต้องเป็น USER เท่านั้น
router.use((req, res, next) => {
  if (req.session.user?.role !== "USER") return res.redirect("/login");
  next();
});

// แจ้งเตือน Admin ทุกคน + Staff ที่ดูแลฝ่ายตรงกับประเภทคำร้อง
function notifyNewRequest(item, requesterName) {
  const admins = users.filter((u) => u.role === "ADMIN");
  const allStaff = users.filter((u) => u.role === "STAFF");
  const staffForType = allStaff.filter((u) =>
    (u.units || []).some((unit) => unit.department === item.type)
  );
  const targets = [...admins, ...(staffForType.length ? staffForType : allStaff)];

  targets.forEach((u) =>
    notify(u.username, {
      requestId: item.id,
      title: `มีคำร้องใหม่ ${item.code}`,
      message: `${item.title} (${item.type}) จาก ${requesterName}`,
      status: item.status,
    })
  );
}

// ---------- หน้าหลัก ----------
router.get("/home", (req, res) => {
  const username = req.session.user.username;
  const myRequests = requests.filter((r) => r.owner === username);

  const stats = {
    total: myRequests.length,
    pending: myRequests.filter((r) => r.status === "รอดำเนินการ").length,
    inProgress: myRequests.filter((r) => r.status === "กำลังดำเนินการ").length,
    done: myRequests.filter((r) => r.status === "เสร็จสิ้น").length,
  };

  res.render("user/home", {
    title: "หน้าหลัก",
    active: "home",
    myRequests,
    faqs: faqs.filter((f) => f.status === "เผยแพร่แล้ว").slice(0, 5),
    stats,
    sent: req.query.sent === "1",
  });
});

// ---------- หน้าแจ้งปัญหา ----------
function renderNewForm(res, error = null, values = {}) {
  res.render("user/request-new", {
    title: "แจ้งปัญหา",
    active: "new",
    TYPES,
    error,
    values,
  });
}

router.get("/requests/new", (req, res) => renderNewForm(res));

router.post("/requests/new", (req, res) => {
  upload.array("images", 3)(req, res, (err) => {
    if (err) {
      return renderNewForm(res, "อัปโหลดรูปไม่สำเร็จ: ต้องเป็นไฟล์รูป ไม่เกิน 3 รูป และรูปละไม่เกิน 5MB", req.body);
    }

    const type = (req.body.type || "").trim();
    const title = (req.body.title || "").trim();
    const location = (req.body.location || "").trim();
    const detail = (req.body.detail || "").trim();

    if (!TYPES.includes(type) || !title || !location || !detail) {
      return renderNewForm(res, "กรุณากรอกข้อมูลให้ครบทุกช่อง (ถ้าไม่มีให้ใส่ -)", req.body);
    }

    const nextId = Math.max(0, ...requests.map((r) => r.id)) + 1;

    requests.unshift({
      id: nextId,
      code: "#" + String(nextId).padStart(4, "0"),
      title,
      type,
      location,
      detail,
      date: formatThaiShortDate(new Date()),
      status: "รอดำเนินการ",
      images: (req.files || []).map((f) => "/uploads/" + f.filename),
      note: "",
      owner: req.session.user.username,
      history: [{ status: "รอดำเนินการ", at: new Date() }],
    });

    saveRequests();

    notifyNewRequest(requests[0], req.session.user.name || req.session.user.username);

    res.redirect("/user/home?sent=1");
  });
});

// ---------- หน้าสถานะคำร้องของฉัน ----------
router.get("/requests", (req, res) => {
  const username = req.session.user.username;
  const { q = "", type = "", status = "" } = req.query;
  const keyword = q.trim().toLowerCase();

  const list = requests.filter((r) =>
    r.owner === username &&
    (!keyword || r.title.toLowerCase().includes(keyword) || r.code.includes(keyword)) &&
    (!type || r.type === type) &&
    (!status || r.status === status)
  );

  res.render("user/requests", {
    title: "สถานะคำร้องของฉัน",
    active: "requests",
    list,
    TYPES,
    STATUSES,
    filters: { q, type, status },
  });
});

// ---------- หน้ารายละเอียดคำร้อง ----------
router.get("/requests/:id", (req, res) => {
  const item = requests.find(
    (r) => r.id === Number(req.params.id) && r.owner === req.session.user.username
  );
  if (!item) return res.redirect("/user/requests");

  const STEP_STATUS = ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น"];
  const STEP_LABEL  = ["ยื่นคำร้อง", "อยู่ระหว่างการดำเนินการ", "เสร็จสิ้น"];
  const current = STEP_STATUS.indexOf(item.status);
  const history = item.history || [];

  const steps = STEP_STATUS.map((s, i) => {
    const entry = [...history].reverse().find((h) => h.status === s);
    return {
      label: STEP_LABEL[i],
      state: i < current ? "done" : i === current ? "current" : "todo",
      time: i <= current && entry ? formatThaiDate(entry.at) : "",
    };
  });

  res.render("user/request-detail", {
    title: "สถานะคำร้องของฉัน",
    active: "requests",
    item,
    steps,
    current,
  });
});

module.exports = router;
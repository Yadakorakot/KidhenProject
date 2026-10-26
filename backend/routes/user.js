const express = require("express");
const path = require("path");
const fs = require("node:fs");
const multer = require("multer");
const router = express.Router();

const { requests, TYPES, STATUSES, saveRequests } = require("../data/mockRequests");
const { notifyNewRequest } = require("../service/notifications");
const { formatThaiDate, formatThaiShortDate } = require("../utils/date");
const access = require("../service/faculty-access");


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

// แก้: ตรวจทั้งบทบาทและคณะจากบัญชีจริงใน server
router.use((req, res, next) => {
  if (
    req.session.user?.role !== "USER"
  ) {
    return res.redirect("/login");
  }

  try {
    res.locals.studentScope =
      access.studentScope(
        req.session.user.username
      );
  } catch (error) {
    return res
      .status(403)
      .type("text")
      .send(error.message);
  }

  next();
});

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
    stats,
    sent: req.query.sent === "1",
  });
});

function renderNewForm(
  res,
  error = null,
  values = {}
) {
  const studentScope = res.locals.studentScope;

  return res.render("user/request-new", {
    title: "แจ้งปัญหา",
    active: "new",
    TYPES,
    FACULTIES: studentScope.choices,
    studentScope,
    error,
    values: {
      facultyId: studentScope.faculty.id,
      ...values,
    },
  });
}

router.get("/requests/new", (req, res) => renderNewForm(res));

router.post("/requests/new", (req, res) => {
    upload.array("images", 3)(req, res, error => {
        if (error) {
          removeUploads(req);
          return renderNewForm(res, "อัปโหลดรูปไม่สำเร็จ: สูงสุด 3 รูป รูปละไม่เกิน 5MB", req.body);
        }

        const type = typeof req.body.type === "string" ? req.body.type.trim() : "";
        const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
        const detail = typeof req.body.detail === "string" ? req.body.detail.trim() : "";
        let locationInfo;

        try {
          // เพิ่ม: ไม่ใช้ locations.fromForm โดยตรง
          // เพราะต้องตรวจว่าคณะเป้าหมายอยู่ในสิทธิ์ด้วย
          locationInfo = access.fromStudentForm(req.session.user.username, req.body);
        } catch (error) {
          removeUploads(req);
          res.status(error.status || 400);

          return renderNewForm(res, error.message, req.body);
        }

        if (!TYPES.includes(type) || !title || title.length > 200 || !detail || detail.length > 5000) {
          removeUploads(req);
          return renderNewForm(res, "เลือกประเภท ระบุหัวข้อไม่เกิน 200 และรายละเอียดไม่เกิน 5000 ตัวอักษร", req.body);
        }

        const nextId = Math.max(0, ...requests.map(request => request.id)) + 1;

        requests.unshift({
          id: nextId,
          code: "#" + String(nextId).padStart(4, "0"),
          title,
          type,
          // แก้: สถานที่ผ่านการตรวจสิทธิ์แล้ว
          location: locationInfo.label,
          locationInfo,
          detail,
          createdAt: new Date().toISOString(),
          date: formatThaiShortDate(new Date()),
          status: "รอดำเนินการ",
          images: (req.files || []).map(file => "/uploads/" + file.filename),
          note: "",
          owner: req.session.user.username,
          history: [{status: "รอดำเนินการ", at: new Date(),},],
        });

        saveRequests();
        notifyNewRequest(requests[0]);
        res.redirect("/user/home?sent=1");
      }
    );
  }
);

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

// เพิ่ม: ลบไฟล์ที่อัปโหลดมาเมื่อฟอร์มไม่ผ่าน
function removeUploads(req) {
  (req.files || []).forEach(file => {
    fs.rmSync(file.path, {
      force: true,
    });
  });
}

module.exports = router;
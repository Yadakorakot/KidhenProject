const express = require("express");
const router = express.Router();
const { requests, TYPES, STATUSES, saveRequests } = require("../data/mockRequests");
const { notify } = require("../data/mockNotifications");
const { users, ROLES, saveUsers } = require("../data/mockUsers");
const { avatarUpload } = require("../utils/upload");
const { FACULTIES, DEPARTMENTS, studentIdFromEmail, facultyFromStudentId } = require("../data/options");
const { buildDashboardData } = require("../utils/dashboard");

// ทุกหน้าในไฟล์นี้ ต้องเป็น ADMIN เท่านั้น
router.use((req, res, next) => {
  if (req.session.user?.role !== "ADMIN") return res.redirect("/login");
  next();
});

// หน้า Dashboard
router.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    title: "Dashboard",
    active: "dashboard",
    base: "/admin",
    role: "admin",
    ...buildDashboardData(),
  });
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

router.post("/requests/:id/status", (req, res) => {
  updateRequest(req, res, false);
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

// เพิ่ม: บันทึกสถานะ ประวัติ และแจ้งเตือนร่วมกัน
function updateRequest(req, res, updateNote) {
  const item = requests.find(
    request => request.id === Number(req.params.id)
  );

  if (!item) {
    return res.status(404).send("ไม่พบคำร้อง");
  }

  const status = req.body.status;

  if (!STATUSES.includes(status)) {
    return res.status(400).send("สถานะไม่ถูกต้อง");
  }

  // แก้: endpoint เปลี่ยนสถานะอย่างเดียวต้องไม่ล้าง note
  const note =
    updateNote && typeof req.body.note === "string"
      ? req.body.note.trim()
      : item.note || "";

  if (note.length > 5000) {
    return res.status(400).send(
      "ข้อความต้องไม่เกิน 5000 ตัวอักษร"
    );
  }

  const changed = status !== item.status;

  if (changed || note !== (item.note || "")) {
    item.status = status;
    item.note = note;

    if (changed) {
      if (!Array.isArray(item.history)) {
        item.history = [];
      }

      item.history.push({
        status,
        at: new Date().toISOString(),
      });
    }

    // แก้: ทั้งสอง endpoint ต้องบันทึกลงไฟล์
    saveRequests();

    // แก้: ส่ง object ให้ตรงกับ signature ของ notify
    notify(item.owner, {
      requestId: item.id,
      title: `คำร้อง ${item.code} ได้รับการอัปเดต`,
      message:
        `สถานะ: ${status}` +
        (note ? ` · ${note}` : ""),
      status,
    });
  }

  // แก้: ไม่ใช้ Referer เป็นปลายทาง redirect
  res.redirect(
    `/admin/requests/${item.id}?saved=1`
  );
}

router.post("/requests/:id/update", (req, res) => {
  updateRequest(req, res, true);
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

// ลบผู้ใช้
router.post("/users/:id/delete", (req, res) => {
  const index = users.findIndex((u) => u.id === Number(req.params.id));

  // ห้ามลบบัญชีที่กำลังใช้งานอยู่ (กันลบตัวเองแล้วเข้าระบบไม่ได้)
  if (index !== -1 && users[index].username !== req.session.user.username) {
    users.splice(index, 1);
    saveUsers();
  }

  res.redirect("/admin/users");
});

// ---------- แก้ไขข้อมูลผู้ใช้ ----------
function renderUserEdit(res, target, extra = {}) {
  const autoFaculty =
    target.role === "USER" ? facultyFromStudentId(studentIdFromEmail(target.email)) : null;

  res.render("admin/user-edit", {
    title: "จัดการผู้ใช้",
    active: "users",
    target,
    ROLES,
    FACULTIES,
    DEPARTMENTS,
    autoFaculty,
    error: null,
    saved: false,
    ...extra,
  });
}

// เปิดหน้าแก้ไข
router.get("/users/:id", (req, res) => {
  const target = users.find((u) => u.id === Number(req.params.id));
  if (!target) return res.redirect("/admin/users");
  renderUserEdit(res, target, { saved: req.query.saved === "1" });
});

// กด บันทึกข้อมูล
router.post("/users/:id", (req, res) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    const target = users.find((u) => u.id === Number(req.params.id));
    if (!target) return res.redirect("/admin/users");

    if (err) {
      return renderUserEdit(res, target, { error: "อัปโหลดรูปไม่สำเร็จ: ต้องเป็นไฟล์รูป และไม่เกิน 2MB" });
    }

    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const role = req.body.role;
    const isSelf = target.username === req.session.user.username;

    if (!firstName || !lastName) {
      return renderUserEdit(res, target, { error: "กรุณากรอกชื่อและนามสกุล" });
    }
    if (!ROLES.includes(role)) {
      return renderUserEdit(res, target, { error: "บทบาทไม่ถูกต้อง" });
    }
    if (isSelf && role !== "ADMIN") {
      return renderUserEdit(res, target, { error: "ไม่สามารถลดบทบาทบัญชีของตัวเองได้" });
    }

    // คณะ/ฝ่าย หลายคู่
        // คณะ/ฝ่าย หลายคู่ (รับเฉพาะค่าที่อยู่ในรายการ)
    const faculties = [].concat(req.body.faculty || []);
    const departments = [].concat(req.body.department || []);
    const facultyNames = FACULTIES.map((f) => f.name);
    const units = faculties
      .map((f, i) => ({ faculty: f.trim(), department: (departments[i] || "").trim() }))
      .filter((u) => u.faculty || u.department)
      .filter((u) =>
        (!u.faculty || facultyNames.includes(u.faculty)) &&
        (!u.department || DEPARTMENTS.includes(u.department))
      );
    const staffFaculties = new Set(units.map(unit => unit.faculty).filter(Boolean));
    if (
      role === "STAFF" &&
      staffFaculties.size !== 1
    ) {
      return renderUserEdit(res, target, {
        error:
          "Staff ต้องมีคณะเดียว หรือเลือกพื้นที่ส่วนกลาง",
      });
    }  
    // นักศึกษา: ใช้คณะจากรหัสนักศึกษาเสมอ
    const detected = role === "USER" ? facultyFromStudentId(studentIdFromEmail(target.email)) : null;
    if (detected) {
      units.length = 0;
      units.push({ faculty: detected.name, department: "นักศึกษา" });
    }

    // บันทึกลงข้อมูลผู้ใช้
    target.firstName = firstName;
    target.lastName = lastName;
    target.name = `${firstName} ${lastName}`;
    target.role = role;
    target.units = units;
    delete target.facultyId;
    delete target.facultyOther;
    // สรุปเป็นข้อความ ไว้แสดงในตารางและหน้าโปรไฟล์
    target.faculty = units.map((u) => u.faculty).filter(Boolean).join(", ") || "-";
    target.department = units.map((u) => u.department).filter(Boolean).join(", ") || "-";
    if (req.file) target.avatar = "/uploads/avatars/" + req.file.filename;

    saveUsers();
    if (isSelf) req.session.user.name = target.name;

    res.redirect(`/admin/users/${target.id}?saved=1`);
  });
});

module.exports = router;
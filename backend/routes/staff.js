const express = require("express");
const router = express.Router();

const {
  requests,
  TYPES,
  STATUSES,
  saveRequests,
} = require("../data/mockRequests");

// เพิ่ม: อ่านสังกัดจากบัญชีฝั่ง server
const { users } = require("../data/mockUsers");

const { notify } = require("../data/mockNotifications");

// เพิ่ม: อ่านคณะจากข้อมูลสถานที่ของคำร้อง
const locations = require("../service/location");

// เพิ่ม: จัดข้อความให้พร้อมใช้งาน
function clean(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim()
    : "";
}

// เพิ่ม: ใช้เปรียบเทียบชื่อคณะ
function facultyKey(value) {
  return clean(value)
    .replace(/^คณะ\s*/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// เพิ่ม: อ่านคณะที่ staff สังกัดจากบัญชีบน server
// รองรับ facultyId ใหม่ และชื่อ faculty ของข้อมูลเดิม
function getStaffFaculty(account) {
  const catalog = locations.FACULTIES.filter(
    faculty => faculty.id !== "other"
  );

  if (account.facultyId) {
    const found = catalog.find(
      faculty => faculty.id === account.facultyId
    );

    if (found) {
      return {
        id: found.id,
        label: found.label,
      };
    }

    // ไม่ใช้ชื่อคณะสำรอง หากมี facultyId ที่ไม่ถูกต้อง
    if (account.facultyId !== "other") {
      return null;
    }
  } else {
    // รองรับบัญชีเดิมที่เก็บเฉพาะชื่อคณะ
    const found = catalog.find(faculty =>
      [
        faculty.label,
        ...(faculty.aliases || []),
      ].some(
        name =>
          facultyKey(name) ===
          facultyKey(account.faculty)
      )
    );

    if (found) {
      return {
        id: found.id,
        label: found.label,
      };
    }
  }

  // เพิ่ม: รองรับคณะอื่นที่ยังไม่มีในรายการตั้งต้น
  const other = clean(
    account.facultyOther || account.faculty
  );

  if (
    !other ||
    other.length > 100 ||
    ["-", "ไม่ระบุ", "คณะ/พื้นที่อื่น"].includes(other)
  ) {
    return null;
  }

  return {
    id: "other",
    label: other,
    facultyOther: other,
  };
}

// เพิ่ม: ตรวจสิทธิ์จากคณะของสถานที่เกิดปัญหา
// staff ของคณะไม่ได้รับสิทธิ์ส่วนกลางโดยอัตโนมัติ
function canAccess(faculty, item) {
  const place = locations.forRequest(item);

  if (
    !place ||
    place.facultyId !== faculty.id
  ) {
    return false;
  }

  // คณะอื่นที่ใช้ id=other ต้องมีชื่อคณะตรงกันด้วย
  if (faculty.id === "other") {
    return (
      facultyKey(place.facultyOther) ===
      facultyKey(faculty.facultyOther)
    );
  }

  return true;
}

// แก้: ตรวจ role และคณะปัจจุบันจากบัญชีทุกครั้ง
// ไม่เชื่อ role หรือ facultyId ที่ส่งมาจาก browser
router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const account = users.find(
    user =>
      user.username === req.session.user.username
  );

  if (!account || account.role !== "STAFF") {
    return res
      .status(403)
      .type("text")
      .send("บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่");
  }

  const faculty = getStaffFaculty(account);

  if (!faculty) {
    return res
      .status(403)
      .type("text")
      .send(
        "บัญชียังไม่มีข้อมูลคณะ กรุณาให้ Admin ตรวจข้อมูลบัญชี"
      );
  }

  res.locals.staffFaculty = faculty;
  next();
});

// เพิ่ม: ตรวจสิทธิ์ทุก route ที่มี :id
// ครอบคลุมทั้งดูรายละเอียดและแก้สถานะ
router.param("id", (req, res, next, id) => {
  if (
    !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id))
  ) {
    return res
      .status(404)
      .type("text")
      .send("ไม่พบคำร้อง");
  }

  const item = requests.find(
    request => request.id === Number(id)
  );

  if (
    !item ||
    !canAccess(res.locals.staffFaculty, item)
  ) {
    // ใช้คำตอบเดียวกันสำหรับคำร้องที่ไม่มีและคำร้องที่ไม่มีสิทธิ์
    return res
      .status(404)
      .type("text")
      .send("ไม่พบคำร้อง");
  }

  req.staffRequest = item;
  next();
});

// แก้: คำนวณสถิติเฉพาะคำร้องของคณะตัวเอง
router.get("/dashboard", (req, res) => {
  const list = requests.filter(request =>
    canAccess(res.locals.staffFaculty, request)
  );

  res.render("staff/dashboard", {
    title: "Dashboard",
    active: "dashboard",

    stats: {
      total: list.length,

      pending: list.filter(
        request => request.status === "รอดำเนินการ"
      ).length,

      inProgress: list.filter(
        request =>
          request.status === "กำลังดำเนินการ"
      ).length,

      done: list.filter(
        request => request.status === "เสร็จสิ้น"
      ).length,
    },
  });
});

// แก้: จำกัดคณะก่อนค้นหาและกรองคำร้อง
router.get("/requests", (req, res) => {
  const q = clean(req.query.q);
  const type = clean(req.query.type);
  const status = clean(req.query.status);

  const keyword = q.toLowerCase();

  const list = requests.filter(request =>
    canAccess(res.locals.staffFaculty, request) &&

    (
      !keyword ||
      clean(request.title)
        .toLowerCase()
        .includes(keyword) ||
      clean(request.code)
        .toLowerCase()
        .includes(keyword)
    ) &&

    (!type || request.type === type) &&

    (!status || request.status === status)
  );

  res.render("staff/requests", {
    title: "จัดการคำร้อง",
    active: "requests",
    list,
    TYPES,
    STATUSES,
    filters: {
      q,
      type,
      status,
    },
  });
});

// แก้: ใช้คำร้องที่ผ่านการตรวจสิทธิ์จาก router.param แล้ว
router.get("/requests/:id", (req, res) => {
  res.render("staff/request-detail", {
    title: "จัดการคำร้อง",
    active: "requests",
    item: req.staffRequest,
    STATUSES,
    saved: req.query.saved === "1",
  });
});

// แก้: ใช้ขั้นตอนบันทึกร่วมกันทั้งสอง endpoint
// เพื่อให้การบันทึกสถานะ ประวัติ และแจ้งเตือนทำงานเหมือนกัน
function updateRequest(req, res, updateNote) {
  const item = req.staffRequest;
  const status = clean(req.body.status);

  if (!STATUSES.includes(status)) {
    return res
      .status(400)
      .type("text")
      .send("สถานะคำร้องไม่ถูกต้อง");
  }

  const note = updateNote
    ? clean(req.body.note)
    : item.note || "";

  if (note.length > 5000) {
    return res
      .status(400)
      .type("text")
      .send(
        "ข้อความเจ้าหน้าที่ต้องไม่เกิน 5000 ตัวอักษร"
      );
  }

  const statusChanged = item.status !== status;
  const noteChanged = (item.note || "") !== note;

  if (statusChanged || noteChanged) {
    item.status = status;
    item.note = note;

    // แก้: เก็บประวัติเมื่อสถานะเปลี่ยน
    if (statusChanged) {
      if (!Array.isArray(item.history)) {
        item.history = [];
      }

      item.history.push({
        status,
        at: new Date().toISOString(),
      });
    }

    // แก้: บันทึกลงไฟล์ด้วยทั้งสอง endpoint
    saveRequests();

    let title;

    if (statusChanged && status === "เสร็จสิ้น") {
      title = `คำร้อง ${item.code} ได้รับการแก้ไขแล้ว`;
    } else if (statusChanged) {
      title = `คำร้อง ${item.code} ได้รับการอัปเดตสถานะ`;
    } else {
      title = `คำร้อง ${item.code} มีข้อความจากเจ้าหน้าที่`;
    }

    // แก้: ส่ง argument ให้ตรงกับฟังก์ชัน notify เดิม
    notify(item.owner, {
      requestId: item.id,
      title,
      message:
        `สถานะ: ${status}` +
        (note ? ` · ${note}` : ""),
      status,
    });
  }

  // แก้: ใช้ URL ภายในระบบที่กำหนดไว้
  res.redirect(
    `/staff/requests/${item.id}?saved=1`
  );
}

// แก้: ทั้งสอง route ผ่านการตรวจสิทธิ์ :id ก่อนแก้ข้อมูล
router.post("/requests/:id/status", (req, res) => {
  updateRequest(req, res, false);
});

router.post("/requests/:id/update", (req, res) => {
  updateRequest(req, res, true);
});

module.exports = router;
const session = require("express-session");
const crypto = require("node:crypto");
const db = require("./db");

// แก้: Session เก็บใน Database แทนหน่วยความจำ
class SessionStore extends session.Store {
  // อ่าน Session ที่ยังไม่หมดอายุ
  get(sid, done) {
    db.query(
      "SELECT data FROM sessions WHERE sid=? AND expires_at>?",
      [sid, db.now()]
    )
      .then(rows => {
        done(null, rows[0] ? JSON.parse(rows[0].data) : null);
      })
      .catch(done);
  }

  // บันทึก Session ใหม่ หรืออัปเดต Session เดิม
  set(sid, data, done = () => {}) {
    const expires = new Date(
      data.cookie.expires || Date.now() + 8 * 3600000
    ).toISOString();

    const sql = db.mysql
      ? `INSERT INTO sessions(sid,data,expires_at) VALUES(?,?,?)
         ON DUPLICATE KEY UPDATE
         data=VALUES(data),expires_at=VALUES(expires_at)`
      : `INSERT INTO sessions(sid,data,expires_at) VALUES(?,?,?)
         ON CONFLICT(sid) DO UPDATE SET
         data=excluded.data,expires_at=excluded.expires_at`;

    db.query(sql, [sid, JSON.stringify(data), expires])
      .then(() => done())
      .catch(done);
  }

  // ลบ Session เมื่อ Logout
  destroy(sid, done = () => {}) {
    db.query("DELETE FROM sessions WHERE sid=?", [sid])
      .then(() => done())
      .catch(done);
  }
}

// เพิ่ม: ทำงานก่อนเข้า Route
async function prepare(req, res, next) {
  // ย้าย: ใช้หน้าจอ ui.js จากชุดก่อน แต่ไฟล์อยู่ frontend แล้ว
  res.render = (view, options = {}) => {
    const renderUI = require("../frontend/ui");
    res.send(renderUI(view, { ...res.locals, ...options }));
  };

  // เพิ่ม: สร้างรหัสสำหรับตรวจฟอร์ม
  req.session.csrf ||= crypto.randomBytes(32).toString("hex");

  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.body?._csrf !== req.session.csrf &&
    req.get("X-CSRF-Token") !== req.session.csrf
  ) {
    return res.status(403).send(
      "คำขอหมดอายุ กรุณาโหลดหน้าใหม่"
    );
  }

  // เพิ่ม: โหลดสิทธิ์ล่าสุดทุกครั้ง การระงับบัญชีจึงมีผลทันที
  if (req.session.userId) {
    req.user = (
      await db.query(
        `SELECT id,email,name,role,faculty_id,department_id
         FROM users WHERE id=? AND active=1`,
        [req.session.userId]
      )
    )[0];
  }

  // เพิ่ม: ส่งข้อมูลที่ทุกหน้าต้องใช้ให้ Frontend
  res.locals.user = req.user || null;
  res.locals.csrf = req.session.csrf;

  res.locals.unread = req.user
    ? (
        await db.query(
          `SELECT COUNT(*) AS n FROM notifications
           WHERE user_id=? AND is_read=0`,
          [req.user.id]
        )
      )[0].n
    : 0;

  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  next();
}

// แก้จากการตรวจ Login เดิม: นำมาใช้ซ้ำได้ทุก Route
function requireUser(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

// เพิ่ม: ใช้เมื่อต้องการจำกัดบทบาท
function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      db.fail("ไม่มีสิทธิ์เข้าถึง", 403);
    }

    next();
  };
}

// เพิ่ม: คืนเงื่อนไข SQL ตามขอบเขตข้อมูลของแต่ละบทบาท
function scope(user) {
  if (["ADMIN", "EXECUTIVE"].includes(user.role)) {
    return ["1=1", []];
  }

  if (user.role === "STAFF") {
    return ["t.department_id=?", [user.department_id]];
  }

  if (user.role === "CLUB") {
    return ["t.faculty_id=?", [user.faculty_id]];
  }

  return ["t.user_id=?", [user.id]];
}

// เพิ่ม: ตรวจสิทธิ์ก่อนอ่านคำร้อง ใช้ร่วมกับหน้าอ่านและหน้าแก้ไข
async function getTicket(req) {
  const [where, args] = scope(req.user);

  const ticket = (
    await db.query(
      `SELECT t.*,d.name AS department_name,
       CASE WHEN t.anonymous=1
         THEN NULL ELSE u.name
       END AS reporter_name
       FROM tickets t
       LEFT JOIN departments d ON d.id=t.department_id
       JOIN users u ON u.id=t.user_id
       WHERE t.id=? AND ${where}`,
      [req.params.id, ...args]
    )
  )[0];

  if (!ticket) {
    db.fail("ไม่พบคำร้องหรือไม่มีสิทธิ์", 404);
  }

  return ticket;
}

// เพิ่ม: จัดการ Error กลาง ไม่เปิดรายละเอียดภายในให้ผู้ใช้
function errorHandler(error, req, res, next) {
  console.error(error.message);

  const status = error.status || 500;
  const message = status === 500
    ? "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
    : error.message;

  res.status(status);

  if (
    req.path.startsWith("/api/") ||
    req.path === "/auth/google"
  ) {
    return res.json({ error: message });
  }

  res.render("app/error", {
    title: "เกิดข้อผิดพลาด",
    message
  });
}

module.exports = {
  SessionStore, prepare, requireUser,
  allow, scope, getTicket, errorHandler
};
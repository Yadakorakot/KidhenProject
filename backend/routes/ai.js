// แก้: ตรวจสิทธิ์คณะทั้งการดูหัวข้อและส่งรายงาน

const router =
  require("express").Router();

const {
  randomUUID,
} = require("node:crypto");

const issues = require(
  "../service/issues"
);

const access = require(
  "../service/faculty-access"
);

router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (
    req.session.user.role !== "USER"
  ) {
    return res.sendStatus(403);
  }

  // เพิ่ม: อ่านคณะจากบัญชีใน server
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

  req.session.aiCsrf ||=
    randomUUID();

  if (
    req.method !== "GET" &&
    req.body._csrf !==
      req.session.aiCsrf
  ) {
    return res.sendStatus(403);
  }

  Object.assign(res.locals, {
    title: "ปัญหาที่ถูกรายงานแล้ว",
    active: "issues",
    aiCsrf: req.session.aiCsrf,

    flash:
      req.session.issueFlash ||
      null,
  });

  delete req.session.issueFlash;

  next();
});

// แก้: แสดงหัวข้อของคณะตัวเองและส่วนกลาง
router.get("/", (req, res) => {
  const q =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

  const topics = issues
    .publicTopics()
    .filter(topic =>
      access.canUse(
        res.locals.studentScope,
        topic.locationInfo
      )
    )
    .filter(topic =>
      !q ||
      (
        `${topic.title} ` +
        `${topic.location}`
      ).includes(q)
    );

  res.render("user/issues", {
    FACULTIES:
      res.locals.studentScope.choices,

    q,
    topics,
  });
});

// แก้: ตรวจสิทธิ์อีกครั้งใน POST
router.post(
  "/:id/support",
  (req, res) => {
    try {
      const username =
        req.session.user.username;

      const topic = issues
        .publicTopics()
        .find(
          item =>
            item.id === req.params.id
        );

      if (!topic) {
        return res.sendStatus(404);
      }

      // เพิ่ม: ตรวจคณะของหัวข้อเป้าหมาย
      // ป้องกันยิง POST ไปหัวข้อคณะอื่น
      access.assertPlace(
        username,
        topic.locationInfo
      );

      // เพิ่ม: ตรวจคณะที่กรอก และใช้ชื่อจากบัญชีจริง
      const place =
        access.fromStudentForm(
          username,
          req.body
        );

      const id = issues.support(
        req.params.id,
        username,
        {
          ...req.body,
          ...place,
        }
      );

      res.redirect(
        `/user/requests/${id}`
      );
    } catch (error) {
      if (error.status === 403) {
        return res
          .status(403)
          .type("text")
          .send(error.message);
      }

      req.session.issueFlash =
        error.message;

      res.redirect(
        "/user/issues"
      );
    }
  }
);

module.exports = router;
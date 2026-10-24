// แก้: ใช้กับ /user/issues เท่านั้น

const router =
  require("express").Router();

const {
  randomUUID,
} = require("node:crypto");

const issues = require(
  "../service/issues"
);

// ของเดิม: ต้องเข้าสู่ระบบ
router.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (
    req.session.user.role !==
      "USER"
  ) {
    return res.sendStatus(403);
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
    title:
      "ปัญหาที่ถูกรายงานแล้ว",

    active: "issues",

    aiCsrf:
      req.session.aiCsrf,

    flash:
      req.session.issueFlash ||
      null,
  });

  delete req.session.issueFlash;

  next();
});

// แก้: ค้นหาหัวข้อที่เผยแพร่แล้ว
router.get("/", (req, res) => {
  const q =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

  const topics =
    issues.publicTopics().filter(
      (topic) =>
        !q ||
        (
          `${topic.title} ` +
          `${topic.location}`
        ).includes(q)
    );

  res.render("user/issues", {
    q,
    topics,
  });
});

// แก้: ส่งรายงานใต้หัวข้อเดิม
router.post(
  "/:id/support",

  (req, res) => {
    try {
      const id = issues.support(
        req.params.id,
        req.session.user.username,
        req.body
      );

      res.redirect(
        `/user/requests/${id}`
      );
    } catch (error) {
      req.session.issueFlash =
        error.message;

      res.redirect(
        "/user/issues"
      );
    }
  }
);

module.exports = router;
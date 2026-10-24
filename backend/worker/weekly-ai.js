// เพิ่ม: scheduler สำหรับเว็บหนึ่ง process
// ประมวลผลตาม nextRunAt ที่บันทึกไว้

const issues = require(
  "../service/issues"
);

let timer;

// เพิ่ม: ตรวจว่าถึงรอบหรือยัง
async function tick() {
  if (
    issues.dashboard().running
  ) {
    return;
  }

  const data = issues.read();

  if (
    !data.nextRunAt ||
    Date.now() <
      Date.parse(data.nextRunAt)
  ) {
    return;
  }

  // เพิ่ม: เลื่อนรอบก่อนเริ่มงาน
  // ป้องกันวนยิง API ทุกนาทีเมื่อเกิด error
  data.nextRunAt =
    issues.nextWeekly();

  issues.write(data);

  try {
    const result =
      await issues.runBatch();

    console.log(
      "[Weekly AI]",
      result
    );
  } catch (error) {
    console.error(
      "[Weekly AI]",
      error.message
    );
  }
}

// เพิ่ม: เริ่มเมื่อ server เปิดสำเร็จ
function start() {
  if (
    timer ||
    process.env.AI_WEEKLY_ENABLED ===
      "false"
  ) {
    return;
  }

  issues.initializeSchedule();

  timer = setInterval(() => {
    tick().catch((error) => {
      console.error(
        "[Weekly AI]",
        error.message
      );
    });
  }, 60000);

  timer.unref();

  // เพิ่ม: ตรวจทันทีหลังเปิดเว็บ
  // ถ้ามีรอบที่พลาดตอนปิดเครื่อง จะประมวลผลหนึ่งรอบ
  tick().catch((error) => {
    console.error(
      "[Weekly AI]",
      error.message
    );
  });
}

module.exports = {
  start,
};
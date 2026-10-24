// แก้: server.js เป็นจุดเริ่มต้นโปรแกรมเพียงจุดเดียว

const fs = require("node:fs");
const path = require("node:path");

// เพิ่ม: โหลด .env ก่อน import app
// เพื่อให้ session และบริการ AI อ่านค่าได้
const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// แก้: ไม่เรียก ./config/database
// เพราะโค้ดปัจจุบันยังใช้ JSON
const app = require("./app");

const port = Number(process.env.PORT || 3000);

if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error(
    "PORT ต้องเป็นตัวเลขระหว่าง 1–65535"
  );
}

// แก้: เปิดพอร์ตเฉพาะไฟล์นี้
const server = app.listen(port, () => {
  console.log(
    `KID-HEN: http://localhost:${port}`
  );
});

// เพิ่ม: แสดงข้อผิดพลาด เช่น พอร์ตถูกใช้อยู่
server.on("error", (error) => {
  console.error(
    "เริ่มระบบไม่สำเร็จ:",
    error.message
  );

  process.exit(1);
});
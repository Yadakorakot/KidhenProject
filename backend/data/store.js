const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname, "db");

// อ่านข้อมูลจากไฟล์ ถ้ายังไม่มีไฟล์ ใช้ค่าเริ่มต้น
function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DB_DIR, `${name}.json`), "utf8"));
  } catch {
    return fallback;
  }
}

// บันทึกข้อมูลลงไฟล์
function save(name, data) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

module.exports = { load, save };
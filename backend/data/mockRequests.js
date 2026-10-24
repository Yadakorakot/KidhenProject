const { load, save } = require("./store");

const TYPES = ["กิจกรรม", "ไอทีซัพพอร์ต", "หลักสูตร", "อาคาร/สถานที่", "ข้อเสนอแนะ"];
const STATUSES = ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น"];

// เริ่มจากไฟล์ ถ้ายังไม่มี = ว่างเปล่า
const requests = load("requests", []);

// เรียกทุกครั้งหลังเพิ่มหรือแก้คำร้อง
function saveRequests() {
  save("requests", requests);
}

module.exports = { requests, TYPES, STATUSES, saveRequests };
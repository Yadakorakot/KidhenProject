const { load, save } = require("./store");

const ROLES = ["ADMIN", "STAFF", "USER"];

// ข้อมูลตั้งต้น — ใช้เฉพาะตอนยังไม่มีไฟล์ db/users.json
const DEFAULT_USERS = [
  { id: 1, username: "admin",  password: "1234", firstName: "ผู้ดูแล", lastName: "ระบบ",     email: "admin@example.com",   faculty: "-",                       department: "ผู้ดูแลระบบ", role: "ADMIN", avatar: "" },
  { id: 2, username: "staff",  password: "1234", firstName: "สมชาย",   lastName: "ใจดี",     email: "somchai@example.com", faculty: "คณะเทคโนโลยีสารสนเทศ", department: "เจ้าหน้าที่",  role: "STAFF", avatar: "" },
  { id: 3, username: "staff2", password: "1234", firstName: "วิภา",    lastName: "ทำงานดี",  email: "wipa@example.com",    faculty: "คณะเทคโนโลยีสารสนเทศ", department: "เจ้าหน้าที่",  role: "STAFF", avatar: "" },
  { id: 4, username: "user",   password: "1234", firstName: "สมหญิง",  lastName: "เรียนดี",  email: "somying@example.com", faculty: "คณะเทคโนโลยีสารสนเทศ", department: "นักศึกษา",   role: "USER",  avatar: "" },
  { id: 5, username: "user2",  password: "1234", firstName: "ธนา",     lastName: "ขยันเรียน", email: "thana@example.com",   faculty: "คณะเทคโนโลยีสารสนเทศ", department: "นักศึกษา",   role: "USER",  avatar: "" },
];

// name = ชื่อเต็ม ใช้แสดงในหน้าอื่น ๆ (เช่น จัดการผู้ใช้)
const users = load("users", DEFAULT_USERS).map((u) => ({
  ...u,
  name: `${u.firstName} ${u.lastName}`,
}));

function saveUsers() {
  save("users", users);
}

module.exports = { users, ROLES, saveUsers };

// หลังจากกดบันทึกครั้งแรก ระบบจะใช้ข้อมูลจาก backend/data/db/users.json 
// แทน ถ้าวันหลังแก้ DEFAULT_USERS ในโค้ด ต้องลบไฟล์ users.json ก่อนถึงจะเห็นผล
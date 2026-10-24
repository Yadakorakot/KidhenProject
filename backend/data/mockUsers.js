const { load, save } = require("./store");
const { studentIdFromEmail, facultyFromStudentId } = require("./options");

const ROLES = ["ADMIN", "STAFF", "USER"];

// ข้อมูลตั้งต้น — ใช้เฉพาะตอนยังไม่มีไฟล์ db/users.json
const DEFAULT_USERS = [
    { id: 1, username: "admin",  password: "1234", firstName: "ผู้ดูแล", lastName: "ระบบ",     email: "admin@example.com",   faculty: "-",                       department: "ผู้ดูแลระบบ", role: "ADMIN", avatar: "" },
    { id: 2, username: "staff",  password: "1234", firstName: "สมชาย",   lastName: "ใจดี",     email: "somchai@example.com", faculty: "คณะเทคโนโลยีสารสนเทศ", department: "เจ้าหน้าที่",  role: "STAFF", avatar: "" },
    { id: 3, username: "staff2", password: "1234", firstName: "วิภา",    lastName: "ทำงานดี",  email: "wipa@example.com",    faculty: "คณะเทคโนโลยีสารสนเทศ", department: "เจ้าหน้าที่",  role: "STAFF", avatar: "" },
    { id: 4, username: "user",  password: "1234", firstName: "สมหญิง", lastName: "เรียนดี",  email: "67070999@kmitl.ac.th", faculty: "", department: "นักศึกษา", role: "USER", avatar: "" },
    { id: 5, username: "user2", password: "1234", firstName: "ธนา",    lastName: "ขยันเรียน", email: "67010888@kmitl.ac.th", faculty: "", department: "นักศึกษา", role: "USER", avatar: "" },
];

// name = ชื่อเต็ม ใช้แสดงในหน้าอื่น ๆ (เช่น จัดการผู้ใช้)
const users = load("users", DEFAULT_USERS).map((u) => {
  const user = {
    ...u,
    name: `${u.firstName} ${u.lastName}`,
    units: u.units || [{ faculty: u.faculty || "", department: u.department || "" }],
  };

  // นักศึกษา: คณะมาจากรหัสนักศึกษาเสมอ
  const detected = facultyFromStudentId(studentIdFromEmail(u.email));
  if (u.role === "USER" && detected) {
    user.units = [{ faculty: detected.name, department: "นักศึกษา" }];
    user.faculty = detected.name;
    user.department = "นักศึกษา";
  }

  return user;
});

function saveUsers() {
  save("users", users);
}

module.exports = { users, ROLES, saveUsers };

// หลังจากกดบันทึกครั้งแรก ระบบจะใช้ข้อมูลจาก backend/data/db/users.json 
// แทน ถ้าวันหลังแก้ DEFAULT_USERS ในโค้ด ต้องลบไฟล์ users.json ก่อนถึงจะเห็นผล
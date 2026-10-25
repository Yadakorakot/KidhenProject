const { TYPES } = require("./mockRequests");

// รายชื่อคณะ: codes = รหัสคณะในรหัสนักศึกษา (บางคณะมีหลายรหัส)
const FACULTIES = [
  { codes: [],           name: "พื้นที่ส่วนกลาง" },
  { codes: ["01"],       name: "วิศวกรรมศาสตร์" },
  { codes: ["015"],      name: "วิศวกรรมศาสตร์ (ต่อเนื่อง)" },
  { codes: ["02"],       name: "สถาปัตยกรรมศาสตร์" },
  { codes: ["03"],       name: "ครุศาสตร์" },
  { codes: ["04"],       name: "เกษตร" },
  { codes: ["05"],       name: "วิทยาศาสตร์" },
  { codes: ["07"],       name: "เทคโนโลยีสารสนเทศ" },
  { codes: ["08"],       name: "อุตสาหกรรมอาหาร" },
  { codes: ["10"],       name: "บริหารธุรกิจ" },
  { codes: ["11", "12"], name: "ไซเทค" },
  { codes: ["13"],       name: "การบิน" },
  { codes: ["14"],       name: "ศิลปศาสตร์" },
  { codes: ["15"],       name: "แพทยศาสตร์" },
  { codes: ["16"],       name: "ดนตรีและการแสดง (สังคีต)" },
  { codes: ["17"],       name: "ทันตแพทยศาสตร์" },
  { codes: ["21"],       name: "โคเซ็น" },
  { codes: ["22"],       name: "พยาบาลศาสตร์" },
];

const DEPARTMENTS = ["นักศึกษา", ...TYPES];

// ดึงรหัสนักศึกษาจากอีเมล เช่น 67070223@kmitl.ac.th → "67070223"
function studentIdFromEmail(email) {
  const id = String(email || "").split("@")[0];
  return /^6\d{7}$/.test(id) ? id : null;
}

// หาคณะจากรหัสนักศึกษา รูปแบบ 6y[xx]yyyy
function facultyFromStudentId(studentId) {
  if (!studentId) return null;

  // เช็ก 3 หลัก (015) ก่อน แล้วค่อยเช็ก 2 หลัก
  const code3 = studentId.slice(2, 5);
  const code2 = studentId.slice(2, 4);

  return (
    FACULTIES.find((f) => f.codes.includes(code3)) ||
    FACULTIES.find((f) => f.codes.includes(code2)) ||
    null
  );
}

module.exports = { FACULTIES, DEPARTMENTS, studentIdFromEmail, facultyFromStudentId };
// เพิ่ม: บริการแจ้งเตือนคำร้องใหม่ร่วมกัน
const { users } = require("../data/mockUsers");
const { notify } = require("../data/mockNotifications");
const locations = require("./location");

// เพิ่ม: เปรียบเทียบชื่อคณะจากข้อมูลบัญชีเดิม
function key(value) {
  return typeof value === "string"
    ? value
        .normalize("NFKC")
        .trim()
        .replace(/^คณะ\s*/, "")
        .replace(/\s+/g, " ")
        .toLowerCase()
    : "";
}

// เพิ่ม: ตรวจคณะของเจ้าหน้าที่กับสถานที่เกิดปัญหา
function staffMatches(account, place) {
  if (!place.complete) return false;

  if (account.facultyId) {
    if (account.facultyId !== place.facultyId) {
      return false;
    }

    return (
      place.facultyId !== "other" ||
      key(account.facultyOther || account.faculty) ===
        key(place.facultyOther)
    );
  }

  const faculty = locations.FACULTIES.find(
    item =>
      item.id !== "other" &&
      [item.label, ...(item.aliases || [])].some(
        name => key(name) === key(account.faculty)
      )
  );

  if (faculty) {
    return faculty.id === place.facultyId;
  }

  return (
    place.facultyId === "other" &&
    Boolean(key(account.faculty)) &&
    key(account.faculty) === key(place.facultyOther)
  );
}

// เพิ่ม: แจ้ง Admin และ Staff เฉพาะคณะที่รับผิดชอบ
function notifyNewRequest(request) {
  const place = locations.forRequest(request);

  const targets = users.filter(
    user =>
      user.role === "ADMIN" ||
      (
        user.role === "STAFF" &&
        staffMatches(user, place)
      )
  );

  for (const user of targets) {
    notify(user.username, {
      requestId: request.id,
      title: `มีคำร้องใหม่ ${request.code}`,
      message: `${request.title} (${request.type})`,
      status: request.status,
    });
  }
}

module.exports = {
  notifyNewRequest,
};
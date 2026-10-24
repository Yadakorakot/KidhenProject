// เพิ่ม: ตรวจสิทธิ์คณะจากบัญชีฝั่ง server
// ไม่เชื่อ facultyId/facultyOther ที่ browser ส่งมา

const {
  users,
} = require("../data/mockUsers");

const locations = require("./location");

function clean(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim()
    : "";
}

// เพิ่ม: เปรียบเทียบชื่อคณะเดิมกับชื่อมาตรฐาน
function key(value) {
  return clean(value)
    .replace(/^คณะ\s*/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function denied(message) {
  const error = new Error(message);
  error.status = 403;

  return error;
}

// เพิ่ม: อ่านข้อมูลจาก users ใหม่ทุกคำขอ
// ไม่ใช้คณะที่ส่งจากฟอร์มหรือสำเนาคณะเก่าใน session
function studentScope(username) {
  const account = users.find(
    user => user.username === username
  );

  if (
    !account ||
    account.role !== "USER"
  ) {
    throw denied(
      "บัญชีนี้ไม่มีสิทธิ์แจ้งคำร้องนักศึกษา"
    );
  }

  const catalog =
    locations.FACULTIES.filter(
      faculty =>
        !["common", "other"].includes(
          faculty.id
        )
    );

  // เพิ่ม: รองรับบัญชีที่มี facultyId แล้ว
  let faculty = catalog.find(
    item =>
      item.id === account.facultyId
  );

  // เพิ่ม: รองรับบัญชีเดิมที่เก็บชื่อใน faculty
  if (
    !faculty &&
    !account.facultyId
  ) {
    faculty = catalog.find(
      item =>
        [
          item.label,
          ...item.aliases,
        ].some(
          name =>
            key(name) ===
            key(account.faculty)
        )
    );
  }

  // เพิ่ม: คณะที่ไม่อยู่ในรายการตั้งต้น
  // ใช้ชื่อคณะจากบัญชี server แทนการให้นักศึกษาพิมพ์เอง
  if (!faculty) {
    const other = clean(
      account.facultyId === "other"
        ? account.facultyOther ||
          account.faculty

        : !account.facultyId
          ? account.faculty
          : ""
    );

    if (
      !other ||
      [
        "-",
        "ไม่ระบุ",
        "ส่วนกลาง",
        "พื้นที่ส่วนกลาง",
        "คณะ/พื้นที่อื่น",
      ].includes(other) ||
      other.length > 100
    ) {
      throw denied(
        "บัญชียังไม่มีข้อมูลคณะที่ใช้กำหนดสิทธิ์ กรุณาให้ Admin ตรวจข้อมูลบัญชี"
      );
    }

    faculty = {
      id: "other",
      label: other,
      facultyOther: other,
    };
  }

  const common =
    locations.FACULTIES.find(
      item => item.id === "common"
    );

  return {
    faculty: {
      ...faculty,
      facultyOther:
        faculty.facultyOther || "",
    },

    // เพิ่ม: ฟอร์มนักศึกษามีเพียงสองตัวเลือก
    choices: [
      faculty,
      common,
    ],
  };
}

// เพิ่ม: ตรวจสิทธิ์ของสถานที่หรือหัวข้อเป้าหมาย
function canUse(scope, place) {
  if (!place?.complete) {
    return false;
  }

  if (
    place.facultyId === "common"
  ) {
    return true;
  }

  if (
    place.facultyId !==
      scope.faculty.id
  ) {
    return false;
  }

  // เพิ่ม: คณะอื่นคนละชื่อ แม้ใช้ id=other เหมือนกัน
  // ก็ไม่ได้หมายความว่าเป็นคณะเดียวกัน
  return (
    place.facultyId !== "other" ||
    key(place.facultyOther) ===
      key(scope.faculty.facultyOther)
  );
}

function assertPlace(
  username,
  place
) {
  const scope =
    studentScope(username);

  if (!canUse(scope, place)) {
    throw denied(
      "แจ้งได้เฉพาะคณะของตัวเองหรือพื้นที่ส่วนกลาง"
    );
  }

  return place;
}

// เพิ่ม: ตรวจฟอร์มก่อนบันทึก
function fromStudentForm(
  username,
  form
) {
  const scope =
    studentScope(username);

  const facultyId =
    clean(form.facultyId);

  if (
    facultyId !== "common" &&
    facultyId !==
      scope.faculty.id
  ) {
    throw denied(
      "แจ้งได้เฉพาะคณะของตัวเองหรือพื้นที่ส่วนกลาง"
    );
  }

  let facultyOther = "";

  if (facultyId === "other") {
    const supplied =
      clean(form.facultyOther);

    if (
      supplied &&
      key(supplied) !==
        key(scope.faculty.facultyOther)
    ) {
      throw denied(
        "ไม่สามารถเปลี่ยนคณะที่สังกัดผ่านฟอร์มคำร้อง"
      );
    }

    // เพิ่ม: ใช้ชื่อคณะจากบัญชีเท่านั้น
    facultyOther =
      scope.faculty.facultyOther;
  } else if (
    clean(form.facultyOther)
  ) {
    throw denied(
      "ห้ามระบุคณะอื่นในคำร้องของคณะหรือพื้นที่ส่วนกลาง"
    );
  }

  const place =
    locations.fromForm({
      ...form,
      facultyId,
      facultyOther,
    });

  if (!canUse(scope, place)) {
    throw denied(
      "ไม่มีสิทธิ์แจ้งในคณะนี้"
    );
  }

  return place;
}

module.exports = {
  studentScope,
  canUse,
  assertPlace,
  fromStudentForm,
};
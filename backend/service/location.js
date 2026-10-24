const FACULTIES = [
  {
    id: "it",
    label: "คณะเทคโนโลยีสารสนเทศ",
    aliases: [
      "เทคโนโลยีสารสนเทศ",
      "ไอที",
      "IT",
    ],
  },
  {
    id: "engineering",
    label: "คณะวิศวกรรมศาสตร์",
    aliases: [
      "วิศวกรรมศาสตร์",
      "วิศวะ",
    ],
  },
  {
    id: "science",
    label: "คณะวิทยาศาสตร์",
    aliases: ["วิทยาศาสตร์"],
  },
  {
    id: "common",
    label: "พื้นที่ส่วนกลาง",
    aliases: [
      "พื้นที่ส่วนกลาง",
      "ส่วนกลาง",
    ],
  },
  {
    id: "other",
    label: "คณะ/พื้นที่อื่น",
    aliases: [],
  },
];

// เพิ่ม: จัดช่องว่างและแปลงเลขไทย
function clean(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(/[๐-๙]/g, (character) =>
      String(
        "๐๑๒๓๔๕๖๗๘๙".indexOf(character)
      )
    )
    .trim()
    .replace(/\s+/g, " ");
}

// เพิ่ม: ตึก a / อาคาร A / A ให้เป็นรหัสเดียวกัน
function buildingCode(value) {
  return clean(value)
    .replace(/^(?:อาคาร|ตึก)\s*/i, "")
    .toUpperCase();
}

// เพิ่ม: ห้อง 203 / 203 ให้เป็นรหัสเดียวกัน
function roomCode(value) {
  return clean(value)
    .replace(/^ห้อง\s*/i, "")
    .toUpperCase();
}

function keyPart(value) {
  return clean(value).toLowerCase();
}

// เพิ่ม: แยกข้อความแสดงผลกับ key สำหรับเปรียบเทียบ
function makePlace(fields, strict = true) {
  const facultyId = clean(
    fields.facultyId
  );

  const faculty = FACULTIES.find(
    (item) => item.id === facultyId
  );

  const facultyOther =
    facultyId === "other"
      ? clean(fields.facultyOther)
      : "";

  const building = buildingCode(
    fields.building
  );

  const room = roomCode(
    fields.room
  );

  const placeDetail = clean(
    fields.placeDetail
  );

  if (
    strict &&
    (
      !faculty ||
      (
        facultyId === "other" &&
        !facultyOther
      )
    )
  ) {
    throw new Error(
      "เลือกคณะ/พื้นที่ และระบุชื่อหากเลือกคณะ/พื้นที่อื่น"
    );
  }

  if (
    [
      facultyOther,
      building,
      room,
    ].some(
      (value) => value.length > 100
    ) ||
    placeDetail.length > 200
  ) {
    throw new Error(
      "ชื่อคณะ อาคาร และห้องไม่เกิน 100 ตัวอักษร รายละเอียดตำแหน่งไม่เกิน 200"
    );
  }

  if (
    strict &&
    !building &&
    !room &&
    !placeDetail
  ) {
    throw new Error(
      "ระบุอาคาร ห้อง หรือรายละเอียดตำแหน่งอย่างน้อยหนึ่งอย่าง"
    );
  }

  const facultyLabel =
    facultyId === "other"
      ? facultyOther
      : faculty?.label ||
        "ไม่ระบุคณะ/พื้นที่";

  const complete = Boolean(
    faculty &&
    (
      facultyId !== "other" ||
      facultyOther
    ) &&
    (
      building ||
      room ||
      placeDetail
    )
  );

  // เพิ่ม: ห้องเดียวกัน แต่รายละเอียดข้างบันได/หน้าประตู
  // ไม่ทำให้กลายเป็นคนละห้อง
  const key = JSON.stringify([
    facultyId,
    keyPart(facultyOther),
    keyPart(building),
    keyPart(room),

    room
      ? ""
      : keyPart(placeDetail),
  ]);

  const label = [
    facultyLabel,

    building
      ? `อาคาร ${building}`
      : "ไม่ระบุอาคาร",

    room && `ห้อง ${room}`,
    placeDetail,
  ]
    .filter(Boolean)
    .join(" / ");

  // เพิ่ม: สรุประดับห้องไม่เอารายละเอียดจุดย่อยของคนแรก
  // ไปกล่าวเหมารวมว่าทุกคนเจอที่จุดย่อยเดียวกัน
  const groupLabel = [
    facultyLabel,

    building
      ? `อาคาร ${building}`
      : "ไม่ระบุอาคาร",

    room && `ห้อง ${room}`,
    !room && placeDetail,
  ]
    .filter(Boolean)
    .join(" / ");

  return {
    version: 3,
    facultyId: faculty?.id || "",
    facultyOther,
    facultyLabel,
    building,
    room,
    placeDetail,
    key,
    label,
    groupLabel,
    complete,
  };
}

// เพิ่ม: ตรวจค่าจากฟอร์มใหม่
function fromForm(form) {
  return makePlace(form, true);
}

// เพิ่ม: แปลงสถานที่เก่าหลายรูปแบบ
// หากไม่มีคณะจริง จะไม่เดาจากหมายเลขห้อง
function fromLegacy(request) {
  let text = clean(
    request.location
  );

  const selected = FACULTIES.find(
    (faculty) =>
      faculty.id === request.facultyId
  );

  let facultyId =
    selected?.id || "";

  for (const faculty of FACULTIES) {
    const aliases = [
      ...faculty.aliases,
      faculty.label,
    ].sort(
      (a, b) => b.length - a.length
    );

    for (const alias of aliases) {
      const escaped = alias.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex =
        /^[A-Za-z]+$/.test(alias)
          ? new RegExp(
              `(^|\\s)${escaped}(?=\\s|$)`,
              "i"
            )
          : new RegExp(
              escaped,
              "i"
            );

      if (regex.test(text)) {
        // เพิ่ม: ข้อมูลคณะขัดกันให้หยุด ไม่รวมกลุ่มเอง
        if (
          facultyId &&
          facultyId !== faculty.id
        ) {
          return makePlace({}, false);
        }

        facultyId = faculty.id;

        text = text
          .replace(regex, " ")
          .replace(/^คณะ\s*/, "")
          .trim();

        break;
      }
    }
  }

  text = clean(text);

  let building = "";
  let room = "";
  let placeDetail = "";

  let match =
    text.match(
      /^(?:ตึก|อาคาร)\s*(.+?)\s+(?:ห้อง\s*)?([A-Za-z]?\d[\w.-]*)$/i
    ) ||
    text.match(
      /^(.+?)\s+(?:ห้อง\s*)?([A-Za-z]?\d[\w.-]*)$/i
    );

  if (
    match &&
    !/^ห้อง$/i.test(match[1])
  ) {
    building = match[1];
    room = match[2];
  } else if (
    (
      match = text.match(
        /^(?:ห้อง\s*)?([A-Za-z]?\d[\w.-]*)$/i
      )
    )
  ) {
    room = match[1];
  } else if (
    (
      match = text.match(
        /^(?:ตึก|อาคาร)\s*(.+)$/i
      )
    )
  ) {
    building = match[1];
  } else if (
    text &&
    text !== "-"
  ) {
    placeDetail = text;
  }

  return makePlace(
    {
      facultyId,
      facultyOther:
        request.facultyOther,

      building,
      room,
      placeDetail,
    },
    false
  );
}

// เพิ่ม: ใช้โครงสร้างใหม่ก่อน ถ้าไม่มีค่อยอ่านรูปแบบเก่า
function forRequest(request) {
  try {
    if (
      request.locationInfo?.version === 3
    ) {
      return makePlace(
        request.locationInfo,
        false
      );
    }

    return fromLegacy(request);
  } catch {
    // ข้อมูลเก่าผิดรูปแบบ: ไม่เดา และไม่ทำให้เว็บล้ม
    return makePlace({}, false);
  }
}

module.exports = {
  FACULTIES,
  fromForm,
  forRequest,
};
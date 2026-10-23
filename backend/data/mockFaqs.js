const FAQ_STATUSES = ["เผยแพร่แล้ว", "รอตรวจสอบ"];

const faqs = [
  {
    id: 1,
    title: "เครื่องปรับอากาศห้อง 306 เสีย",
    answer: "อาคารสถานที่ส่งเรื่องให้ทางคณะซ่อมแซมเรียบร้อยแล้ว",
    type: "อาคารและสถานที่",
    status: "เผยแพร่แล้ว",
    updatedAt: new Date(2026, 9, 25, 15, 0),
  },
  {
    id: 2,
    title: "หลอดไฟเสียที่ห้อง Creative peer 1",
    answer: "",
    type: "อาคารและสถานที่",
    status: "รอตรวจสอบ",
    updatedAt: new Date(2026, 9, 25, 15, 0),
  },
];

module.exports = { faqs, FAQ_STATUSES };
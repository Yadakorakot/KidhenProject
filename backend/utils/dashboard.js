const { requests, TYPES, STATUSES } = require("../data/mockRequests");
const { users } = require("../data/mockUsers");
const { faqs } = require("../data/mockFaqs");

// เวลาที่ยื่นคำร้อง = รายการแรกในประวัติ
function createdAt(r) {
  return new Date(r.history?.[0]?.at || 0);
}

function percent(value, max) {
  return max ? Math.round((value / max) * 100) : 0;
}

function buildDashboardData() {
  const total = requests.length;

  // แยกตามสถานะ
  const byStatus = STATUSES.map((s) => {
    const count = requests.filter((r) => r.status === s).length;
    return { status: s, count, pct: percent(count, total) };
  });
  const doneCount = byStatus.find((s) => s.status === "เสร็จสิ้น")?.count || 0;

  // แยกตามประเภท
  const typeCounts = TYPES.map((t) => ({ type: t, count: requests.filter((r) => r.type === t).length }));
  const maxType = Math.max(1, ...typeCounts.map((t) => t.count));
  const byType = typeCounts.map((t) => ({ ...t, pct: percent(t.count, maxType) }));

  // คำร้องใหม่ 7 วันล่าสุด
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayCounts = [...Array(7)].map((_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (6 - i));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return {
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      count: requests.filter((r) => createdAt(r) >= start && createdAt(r) < end).length,
    };
  });
  const maxDay = Math.max(1, ...dayCounts.map((d) => d.count));
  const last7 = dayCounts.map((d) => ({ ...d, pct: percent(d.count, maxDay) }));

  return {
    total,
    byStatus,
    byType,
    last7,
    newThisWeek: dayCounts.reduce((sum, d) => sum + d.count, 0),
    doneRate: percent(doneCount, total),
    userCount: users.length,
    pendingFaq: faqs.filter((f) => f.status === "รอตรวจสอบ").length,
    latest: requests.slice(0, 6), // คำร้องใหม่อยู่บนสุดอยู่แล้ว
  };
}

module.exports = { buildDashboardData };
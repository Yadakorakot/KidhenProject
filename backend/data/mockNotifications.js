const { load, save } = require("./store");

const notifications = load("notifications", []);

function saveNotifications() {
  save("notifications", notifications);
}

// สร้างแจ้งเตือนใหม่ให้ผู้ใช้ชื่อ to
// category: "request" = เกี่ยวกับคำร้อง, "system" = ประกาศจากระบบ
function notify(to, { requestId = null, title, message = "", status = "", category = "request" }) {
  const nextId = Math.max(0, ...notifications.map((n) => n.id)) + 1;
  notifications.unshift({
    id: nextId,
    to,
    requestId,
    title,
    message,
    status,
    category,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveNotifications();
}

module.exports = { notifications, notify, saveNotifications };
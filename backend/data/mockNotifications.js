const notifications = [];
let nextId = 1;

// สร้างการแจ้งเตือนใหม่ ส่งให้ผู้ใช้ชื่อ to
function notify(to, requestId, message) {
  notifications.unshift({
    id: nextId++,
    to,
    requestId,
    message,
    read: false,
    createdAt: new Date(),
  });
}

module.exports = { notifications, notify };
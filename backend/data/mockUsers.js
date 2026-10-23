const ROLES = ["ADMIN", "STAFF", "USER"];

const users = [
  { id: 1, username: "admin",  password: "1234", name: "ผู้ดูแลระบบ",      email: "admin@example.com",  role: "ADMIN" },
  { id: 2, username: "staff",  password: "1234", name: "สมชาย ใจดี",       email: "somchai@example.com", role: "STAFF" },
  { id: 3, username: "staff2", password: "1234", name: "วิภา ทำงานดี",      email: "wipa@example.com",    role: "STAFF" },
  { id: 4, username: "user",   password: "1234", name: "สมหญิง เรียนดี",    email: "somying@example.com", role: "USER" },
  { id: 5, username: "user2",  password: "1234", name: "ธนา ขยันเรียน",     email: "thana@example.com",   role: "USER" },
];

module.exports = { users, ROLES };
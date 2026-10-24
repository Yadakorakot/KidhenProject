const path = require("path");
const multer = require("multer");

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../frontend/public/uploads/avatars"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // ไม่เกิน 2MB
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

module.exports = { avatarUpload };
require("dotenv").config();

const app = require("./app");
const { query } = require("./config/database");

const port = process.env.PORT || 3000;

async function start() {
  await query("SELECT 1");

  app.listen(port, () => {
    console.log(`KID-HEN: http://localhost:${port}`);
  });
}

start().catch(error => {
  console.error("เริ่มระบบไม่สำเร็จ:", error.message);
  process.exit(1);
});
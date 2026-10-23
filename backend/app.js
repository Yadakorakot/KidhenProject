const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "kidhen-dev-secret", resave: false, saveUninitialized: false }));

app.use("/", authRoutes);
app.use("/admin", adminRoutes);

app.listen(3000, () => console.log("เปิดเว็บที่ http://localhost:3000"));
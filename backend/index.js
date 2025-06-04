const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors()); // Handles preflight for all routes

app.use(bodyParser.json());

// Mount auth routes
const googleAuthRouter = require("./api/auth/google/auth");
const registerRouter = require("./api/auth/register");

app.use("/api/auth/google", googleAuthRouter);
app.use("/api/register", registerRouter);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Mount auth routes
const googleAuthRouter = require("./api/auth/google/auth");
const registerRouter = require("./api/auth/register");



app.use("/api/auth/google", googleAuthRouter);
app.use("/api/register", registerRouter);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

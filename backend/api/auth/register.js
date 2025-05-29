const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await prisma.user.create({
      data: { name, email, password },
    });
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "User registration failed" });
  }
});

module.exports = router;

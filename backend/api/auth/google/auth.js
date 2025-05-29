const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { token } = req.body;

  try {
    console.log("🔐 Received Google token:", token);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("✅ Google Payload:", payload);

    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: "No email found in Google payload" });
    }

    // Check if a user already exists with this email
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      console.log("🙋 User already exists:", existingUser.email);
    }

    // Upsert: create if doesn't exist
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        password: null, // For Google-auth users
      },
    });

    console.log("🎉 User created or found:", user.email);

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("❌ Google Auth Error:", err);
    res.status(401).json({ success: false, error: "Invalid Google token" });
  }
});

module.exports = router;

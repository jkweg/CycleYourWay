const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth, signToken } = require("../middleware/auth");

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Podaj poprawny adres e-mail." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Hasło musi mieć co najmniej 6 znaków." });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "Konto z tym adresem e-mail już istnieje." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email, passwordHash);

    const userId = Number(result.lastInsertRowid);
    if (!Number.isFinite(userId)) {
      return res.status(500).json({ error: "Nie udało się utworzyć konta." });
    }
    const user = { id: userId, email };
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Nie udało się utworzyć konta." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Podaj e-mail i hasło." });
    }

    const user = db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło." });
    }

    const token = signToken({ id: user.id, email: user.email });
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Nie udało się zalogować." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;

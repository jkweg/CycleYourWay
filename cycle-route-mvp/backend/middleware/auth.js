const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-in-production";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Brak tokenu autoryzacji." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "Nieprawidłowy token użytkownika." });
    }
    req.user = { id: userId, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "Nieprawidłowy lub wygasły token." });
  }
}

function signToken(user) {
  const userId = Number(user.id);
  if (!Number.isFinite(userId)) {
    throw new Error("Cannot sign token without valid user id");
  }
  return jwt.sign({ sub: userId, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

module.exports = { requireAuth, signToken, JWT_SECRET };

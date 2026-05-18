/**
 * JWT Authentication Middleware
 * -----------------------------
 * Protects routes by verifying the JWT token sent in the
 * Authorization header: "Bearer <token>"
 */

const jwt = require("jsonwebtoken");

/**
 * verifyToken - Express middleware
 * If token is valid, attaches decoded user info to req.user
 */
function verifyToken(req, res, next) {
  // Read Authorization header (may be missing)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Please log in.",
    });
  }

  // Token is the part after "Bearer "
  const token = authHeader.split(" ")[1];

  try {
    // jwt.verify throws if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email } from when we signed the token
    next(); // Continue to the route handler
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

module.exports = { verifyToken };

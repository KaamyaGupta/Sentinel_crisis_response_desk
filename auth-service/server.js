/**
 * Authentication Microservice - Entry Point
 * -------------------------------------------
 * Run: node server.js (from auth-service folder)
 * Default port: 3001
 *
 * Handles user signup, login, and JWT issuance.
 * Connects to MongoDB Atlas for user storage.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS allows the frontend (different port) to call this API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Parse JSON request bodies (e.g. { email, password })
app.use(express.json());

// Health check - useful to verify the service is running
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "auth-service",
    status: "running",
  });
});

// All auth routes are under /api/auth
app.use("/api/auth", authRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

/**
 * Connect to MongoDB then start the HTTP server
 */
async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI is missing in .env file");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is missing in .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Auth service: Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

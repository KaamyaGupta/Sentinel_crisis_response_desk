/**
 * Incident Management Microservice - Entry Point
 * ------------------------------------------------
 * Run: node server.js (from incident-service folder)
 * Default port: 3002
 *
 * Handles CRUD for disaster incidents.
 * Uses the same MongoDB database and JWT_SECRET as auth-service.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const incidentRoutes = require("./routes/incidentRoutes");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "incident-service",
    status: "running",
  });
});

app.use("/api/incidents", incidentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI is missing in .env file");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is missing in .env file (must match auth-service)");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Incident service: Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`Incident service running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

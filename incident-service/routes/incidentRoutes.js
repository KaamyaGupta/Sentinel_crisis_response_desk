/**
 * Incident Management Routes
 * ----------------------------
 * All routes require a valid JWT (verifyToken middleware).
 *
 * GET    /api/incidents       - List all incidents
 * POST   /api/incidents       - Create new incident
 * GET    /api/incidents/:id   - Get one incident
 * PUT    /api/incidents/:id   - Update incident (status, etc.)
 * DELETE /api/incidents/:id   - Delete incident
 */

const express = require("express");
const Incident = require("../models/Incident");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Every route in this file requires authentication
router.use(verifyToken);

/**
 * GET /api/incidents
 * Returns all incidents, newest first
 */
router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error("List incidents error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incidents.",
    });
  }
});

/**
 * POST /api/incidents
 * Body: { title, description, location, severity }
 */
router.post("/", async (req, res) => {
  try {
    const { title, description, location, severity } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and location are required.",
      });
    }

    const incident = await Incident.create({
      title,
      description,
      location,
      severity: severity || "medium",
      reportedBy: req.user.userId,
      reporterName: req.user.name || req.user.email,
    });

    res.status(201).json({
      success: true,
      message: "Incident reported successfully.",
      incident,
    });
  } catch (error) {
    console.error("Create incident error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create incident.",
    });
  }
});

/**
 * GET /api/incidents/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    res.json({ success: true, incident });
  } catch (error) {
    console.error("Get incident error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incident.",
    });
  }
});

/**
 * PUT /api/incidents/:id
 * Body can include: title, description, location, severity, status
 */
router.put("/:id", async (req, res) => {
  try {
    const { title, description, location, severity, status } = req.body;

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    // Update only fields that were sent in the request
    if (title !== undefined) incident.title = title;
    if (description !== undefined) incident.description = description;
    if (location !== undefined) incident.location = location;
    if (severity !== undefined) incident.severity = severity;
    if (status !== undefined) incident.status = status;

    await incident.save();

    res.json({
      success: true,
      message: "Incident updated successfully.",
      incident,
    });
  } catch (error) {
    console.error("Update incident error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update incident.",
    });
  }
});

/**
 * DELETE /api/incidents/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    res.json({
      success: true,
      message: "Incident deleted successfully.",
    });
  } catch (error) {
    console.error("Delete incident error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete incident.",
    });
  }
});

module.exports = router;

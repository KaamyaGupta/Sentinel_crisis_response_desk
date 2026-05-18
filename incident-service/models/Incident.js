/**
 * Incident Model (MongoDB / Mongoose)
 * -----------------------------------
 * Stores disaster incident reports reported by coordinators.
 */

const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Incident title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["reported", "in-progress", "resolved", "closed"],
      default: "reported",
    },
    // ID of the user who created this incident (from JWT)
    reportedBy: {
      type: String,
      required: true,
    },
    reporterName: {
      type: String,
      default: "Unknown",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Incident", incidentSchema);

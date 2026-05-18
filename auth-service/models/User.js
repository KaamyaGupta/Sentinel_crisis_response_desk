/**
 * User Model (MongoDB / Mongoose)
 * ----------------------------
 * Defines how user data is stored in MongoDB Atlas.
 * Each user has a name, email (unique), and hashed password.
 */

const mongoose = require("mongoose");

// Schema = blueprint for documents in the "users" collection
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Export model so routes can create/find users
module.exports = mongoose.model("User", userSchema);

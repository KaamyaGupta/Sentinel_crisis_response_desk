/**
 * Simple Static File Server (Optional)
 * ------------------------------------
 * Browsers block some API calls from file:// URLs (CORS).
 * Use this small server to open the frontend at http://localhost:5500
 *
 * Run from frontend folder: node server.js
 * (No extra npm install needed - uses only Node built-in modules)
 */

const http = require("http");
const fs = require("fs");
const path = require("path"); 

const PORT = 5500;

// Map file extensions to MIME types
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Default to index.html
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("File not found");
      } else {
        res.writeHead(500);
        res.end("Server error");
      }
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend server: http://localhost:${PORT}`);
  console.log("Open this URL in your browser (do not use file:// for API calls)");
});

const express = require("express");
const cors = require("cors");

// read environment variables from .env file
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

app.use(cors());
app.use(express.json());

// request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const diffSeconds = (Date.now() - start) / 1000;
    console.log(
      `Request: ${req.method} ${req.originalUrl} completed in ${diffSeconds} seconds`,
    );
  });
  next();
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "gamibook-api" });
});

app.use("/api/examples", require("./routes/exemple.routes.js"));

// handle invalid routes (404)
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Not found: ${req.method} ${req.originalUrl}` });
});

// error middleware (always at the end of the file)
app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  res
    .status(err.statusCode || 500)
    .json({ error: err.message || "Internal Server Error" });
});

app.listen(port, host, () => {
  console.log(`App listening at http://${host}:${port}/`);
});

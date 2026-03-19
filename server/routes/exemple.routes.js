const express = require("express");
const router = express.Router();

const examplesController = require("../controllers/exemple.controllers.js");

// Basic example CRUD for Gamibook scaffolding
router.get("/", examplesController.listExamples);
router.get("/:id", examplesController.getExampleById);
router.post("/", examplesController.createExample);
router.put("/:id", examplesController.updateExample);
router.delete("/:id", examplesController.deleteExample);

module.exports = router;

const { examples, nextExampleId } = require("../models/exemple.model.js");

const listExamples = (req, res) => {
  res.status(200).json({ data: examples });
};

const getExampleById = (req, res) => {
  const id = Number(req.params.id);
  const example = examples.find((item) => item.id === id);

  if (!example) {
    return res.status(404).json({ message: "Example not found" });
  }

  return res.status(200).json({ data: example });
};

const createExample = (req, res) => {
  const { type, title, description } = req.body || {};

  if (!type || !title) {
    return res.status(400).json({ message: "type and title are required" });
  }

  const example = {
    id: nextExampleId(),
    type,
    title,
    description: description || "",
  };

  examples.push(example);
  res.status(201).json({ data: example });
};

const updateExample = (req, res) => {
  const id = Number(req.params.id);
  const example = examples.find((item) => item.id === id);

  if (!example) {
    return res.status(404).json({ message: "Example not found" });
  }

  const { type, title, description } = req.body || {};

  if (type !== undefined) example.type = type;
  if (title !== undefined) example.title = title;
  if (description !== undefined) example.description = description;

  return res.status(200).json({ data: example });
};

const deleteExample = (req, res) => {
  const id = Number(req.params.id);
  const index = examples.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Example not found" });
  }

  const deleted = examples.splice(index, 1)[0];
  return res.status(200).json({ data: deleted });
};

module.exports = {
  listExamples,
  getExampleById,
  createExample,
  updateExample,
  deleteExample,
};

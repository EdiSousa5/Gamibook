let currentId = 2;

const examples = [
  {
    id: 1,
    type: "book",
    title: "Sample Book: The Lost Library",
    description: "A demo book used for API examples.",
  },
  {
    id: 2,
    type: "module",
    title: "Module 1: Reading Warmup",
    description: "Starter module with simple exercises.",
  },
];

const nextExampleId = () => {
  currentId += 1;
  return currentId;
};

module.exports = {
  examples,
  nextExampleId,
};

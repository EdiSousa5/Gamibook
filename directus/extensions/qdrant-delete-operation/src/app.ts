import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
  id: "qdrant-delete-operation",
  name: "Delete Data from Qdrant",
  icon: "storage",
  description: "This operation deletes data from Qdrant.",
  overview: ({ collection, id, type }) => [
    {
      label: "Collection",
      text: collection,
    },
    {
      label: "Type",
      text: type,
    },
    {
      label: "ID",
      text: id,
    },
  ],
  options: [
    {
      field: "collection",
      name: "Collection",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
      },
    },
    {
      field: "type",
      name: "Type",
      type: "string",
      meta: {
        width: "half",
        interface: "select-dropdown",
        options: {
          choices: [
					{ value: 'modules', text: 'Module' },
				],
        }
      }
    },
    {
      field: "id",
      name: "ID",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
      },
    },
  ],
});

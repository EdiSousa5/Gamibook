import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'qdrant-upsert-operation',
	name: 'Upsert Data to Qdrant',
	icon: 'storage',
	description: 'This operation inserts or updates data into Qdrant.',
	overview: ({ collection, id, type, chunkSize, chunkOverlap }) => [
		{
			label: 'Collection',
			text: collection,
		},
		{
			label: 'Type',
			text: type,
		},
		{
			label: 'ID',
			text: id,
		},
		{
			label: 'Chunk Size',
			text: String(chunkSize ?? 'N/A'),
		},
		{
			label: 'Chunk Overlap',
			text: String(chunkOverlap ?? 'N/A'),
		},
	],
	options: [
		{
			field: 'collection',
			name: 'Collection',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
			},
		},
		{
			field: 'type',
			name: 'Type',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
					{ value: 'modules', text: 'Module' },
				],
				}
			}
		},
		{
			field: 'id',
			name: 'ID',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
			}
		},
		{
			field: 'payload',
			name: 'Payload',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'input-code',
				options: {
					language: 'json',
				}
			}
		},
		{
			field: 'content',
			name: 'Content',
			type: 'text',
			meta: {
				width: 'full',
				interface: 'textarea',
			}
		},
		{
			field: 'chunkSize',
			name: 'Chunk Size',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
			}
		},
		{
			field: 'chunkOverlap',
			name: 'Chunk Overlap',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
			}
		},
	],
});

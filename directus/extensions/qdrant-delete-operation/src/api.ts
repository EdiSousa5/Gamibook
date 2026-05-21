import { defineOperationApi } from '@directus/extensions-sdk';
import { QdrantClient } from '@qdrant/qdrant-js';

type Options = {
	collection: string;
	id: string;
	type: string;
};

export default defineOperationApi<Options>({
	id: 'qdrant-delete-operation',
	handler: async ({ collection, id, type }, { env }) => {

		const qdrantClient = new QdrantClient({
			host: env.QDRANT_HOST ?? '127.0.0.1',
			port: env.QDRANT_PORT ? Number(env.QDRANT_PORT) : 6333,
			https: env.QDRANT_HTTPS === 'true' || env.QDRANT_HTTPS === true,
			apiKey: env.QDRANT_API_KEY,
			checkCompatibility: false
		});


		return qdrantClient.delete(collection, {
			filter: {
				must: [
					{
						key: "metadata.type",
						match: {
							value: type,
						},
					},
					{
						key: "metadata.parent_id",
						match: {
							value: id,
						},
					},
				],
			},
		});
	},
});

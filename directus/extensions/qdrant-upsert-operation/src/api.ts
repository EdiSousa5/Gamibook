import { defineOperationApi } from "@directus/extensions-sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Ollama } from "ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

type Options = {
	collection: string;
	type: string;
	id: string;
	payload: Record<string, any>;
	content: string;
	chunkSize: number;
	chunkOverlap: number;
};

export default defineOperationApi<Options>({
	id: "qdrant-upsert-operation",
	handler: async ({ collection, type, id, payload, content, chunkSize, chunkOverlap }, { env }) => {

		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: chunkSize ? Number(chunkSize) : 1000,
			chunkOverlap: chunkOverlap ? Number(chunkOverlap) : 200,
		});

		const documents = await splitter.createDocuments([content]);

		const chunkTexts = documents.map((doc: any) => doc.pageContent);

		if (chunkTexts.length === 0) return;

		const ollamaOptions: any = {
			host: env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
		};

		if (env.OLLAMA_API_KEY) {
			ollamaOptions.headers = {
				Authorization: `Bearer ${env.OLLAMA_API_KEY}`
			};
		}

		const ollamaClient = new Ollama(ollamaOptions);

		const points = [];
		for (const chunkText of chunkTexts) {
			const embedReq: any = {
				model: env.EMBEDDINGS_MODEL,
				input: chunkText
			};

			if (env.EMBEDDINGS_DIMENSIONS) {
				embedReq.dimensions = Number(env.EMBEDDINGS_DIMENSIONS);
			}

			const response = await ollamaClient.embed(embedReq);

			const vector = response.embeddings[0];

			points.push({
				id: crypto.randomUUID(),
				vector,
				payload: {
					page_content: chunkText,
					metadata: {
						type: type,
						parent_id: id,
						...payload,
					}
				},
			});
		}

		const qdrantClient = new QdrantClient({
			host: env.QDRANT_HOST ?? '127.0.0.1',
			port: env.QDRANT_PORT ? Number(env.QDRANT_PORT) : 6333,
			https: env.QDRANT_HTTPS === 'true' || env.QDRANT_HTTPS === true,
			apiKey: env.QDRANT_API_KEY,
			checkCompatibility: false
		});

		try {
			await qdrantClient.delete(collection, {
				filter: {
					must: [
						{
							key: 'metadata.type',
							match: {
								value: type,
							},
						},
						{
							key: 'metadata.parent_id',
							match: {
								value: id,
							},
						},
					],
				},
			});
		} catch (err) {
			// Ignore error if collection/points don't exist yet (first run)
		}

		return await qdrantClient.upsert(collection, {
			wait: true,
			points,
		});
	},
});

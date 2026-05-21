# Directus Extension: Qdrant Upsert Operation

This Directus extension provides a custom Flow Operation to seamlessly embed text content using [Ollama](https://ollama.com/) and upsert the resulting vectors into a [Qdrant](https://qdrant.tech/) vector database collection.

It is particularly useful for Retrieval-Augmented Generation (RAG) workflows where you need to process text stored in Directus, chunk it, embed it, and make it available for semantic search or LLM consumption.

## 🚀 Features

- **Text Chunking**: Automatically splits large text documents into smaller chunks using LangChain's `RecursiveCharacterTextSplitter`.
- **Vector Embeddings**: Connects to a local or remote Ollama instance to generate vector embeddings from the text chunks.
- **Qdrant Integration**: Connects to a Qdrant instance to seamlessly upsert the generated embeddings along with associated metadata.
- **Auto-Cleanup**: Before upserting, it gracefully removes previous points belonging to the same Directus item ID to avoid duplication during updates.
- **Fully Configurable UI**: Configurable chunk size, chunk overlap, collection name, and payload via the Directus Flow visual builder.

## 📋 Prerequisites

To use this extension, you need:
1. A running **Directus** instance (version 10.10.0+).
2. A running **Ollama** instance with your desired embedding model pulled (e.g., `nomic-embed-text` or `mxbai-embed-large`).
3. A running **Qdrant** database instance.

## ⚙️ Environment Variables

Add the following environment variables to your Directus `.env` file to configure the connections to Ollama and Qdrant.

### Ollama Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `OLLAMA_URL` | The URL of your Ollama instance. | `http://127.0.0.1:11434` |
| `OLLAMA_API_KEY` | (Optional) API key for authentication, if applicable. | *None* |
| `EMBEDDINGS_MODEL` | Intended embedding model name (e.g., `nomic-embed-text`). | *None (Required)* |
| `EMBEDDINGS_DIMENSIONS` | (Optional) Expected vector output dimension. | *768* |

### Qdrant Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `QDRANT_HOST` | The hostname of your Qdrant database. | `127.0.0.1` |
| `QDRANT_PORT` | The REST API port for Qdrant. | `6333` |
| `QDRANT_HTTPS` | Whether Qdrant is connected over HTTPS. | `false` |
| `QDRANT_API_KEY` | (Optional) API key for authentication, if your cluster requires it. | *eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NDJhNTQ2N2QtYWUwYi00MmViLWI2OTgtNzc4NmYwZTQ1YmVhIn0.gBBAjCju2KrsGxzBHA6PdIKsePueeV8wYjF5YSlT-pY* |

---

## 🛠️ Usage in Directus Flows

Once the extension is built and installed in your Directus instance, you can use it in a Flow. 

Add a new **Upsert Data to Qdrant** operation. You will need to configure the following options in the Flow interface:

1. **Collection (`string`)**: The name of the Qdrant Collection where vectors will be upserted. *Ensure the collection exists and its dimensions match your embedding model.*
2. **ID (`string`)**: A unique identifier for the parent document or record. Used internally by the operation to delete older chunks belonging to the same document during updates. Commonly driven by `{{$trigger.keys[0]}}`.
3. **Payload (`json`)**: Additional metadata to attach to your vector points (e.g., source URLs, record categories, titles). Must be a valid JSON object.
4. **Content (`text`)**: The raw text that you want to chunk and embed.
5. **Chunk Size (`integer`)**: The maximum number of characters per chunk (Defaults to internal logic if left empty, e.g., 1000).
6. **Chunk Overlap (`integer`)**: The number of characters that overlap between chunks to preserve context (Defaults to internal logic if left empty, e.g., 200).

## 🏗️ Development & Building

To modify and build the extension yourself:

1. Clone or copy the extension folder into `/extensions/qdrant-upsert-operation`.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Run the development environment:
   ```bash
   npm run dev
   ```
4. Build the extension for production:
   ```bash
   npm run build
   ```

Depending on your architecture, you simply need to move the resulting `dist` folder alongside the `package.json` into the `extensions/operations/qdrant-upsert-operation` directory of your production Directus instance.

## 📄 License

This extension is provided under the [MIT](LICENSE) License.

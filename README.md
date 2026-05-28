# GamiBook

Plataforma web de leitura gamificada. Os utilizadores lêem livros, respondem a exercícios gerados por IA, acumulam pontos, sobem de nível e competem na leaderboard. As editoras e autores geram e aprovam os exercícios antes de ficarem disponíveis.

---

## Índice

- [Arquitectura](#arquitectura)
- [Pré-requisitos](#pré-requisitos)
- [Configuração inicial](#configuração-inicial)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arranque dos serviços](#arranque-dos-serviços)
- [Comandos úteis](#comandos-úteis)
- [Estrutura do projecto](#estrutura-do-projecto)

---

## Arquitectura

O projecto é um monorepo com quatro serviços em execução simultânea:

| Serviço | Tecnologia | Porto | Descrição |
|---|---|---|---|
| **client** | Vue 3 + Vite | 5173 | Interface web (SPA) |
| **server** | Express.js | 3000 | API REST (placeholder, sem rotas activas) |
| **Directus** | Docker | 8055 | CMS headless — base de dados principal (MySQL) |
| **Flowise** | Docker | 3000 | Geração de exercícios por IA |
| **Ollama** | Docker | 11434 | Modelo de embeddings local (nomic-embed-text) |
| **Qdrant** | Cloud | — | Base de dados vectorial para pesquisa semântica |

O cliente comunica directamente com o Directus via `@directus/sdk` para todas as operações de leitura e escrita. O Flowise é chamado directamente pelo cliente para gerar exercícios. O Ollama fornece os embeddings ao Flowise, e o Qdrant armazena os vectores dos conteúdos dos livros.

---

## Pré-requisitos

Instala o seguinte antes de começar:

- **Node.js** `^20.19.0` ou `>=22.12.0` — [nodejs.org](https://nodejs.org)
- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **MySQL 8** a correr localmente na porta `3306`
  - Pode ser instalado directamente ou via Docker separado
  - Credenciais por defeito usadas no projecto: utilizador `root`, password `Edi49291600.`
- **Git** — [git-scm.com](https://git-scm.com)

---

## Configuração inicial

### 1. Clonar o repositório

```bash
git clone https://github.com/EdiSousa5/gamibook.git
cd gamibook
```

### 2. Criar a base de dados MySQL

Abre o teu cliente MySQL (Workbench, DBeaver, linha de comandos) e cria a base de dados:

```sql
CREATE DATABASE gamibook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Garante que o MySQL está acessível em `localhost:3306` com o utilizador `root`.

### 3. Criar os ficheiros de ambiente

O projecto precisa de dois ficheiros `.env` — um na raiz e outro dentro de `client/`.

**Ficheiro raiz `.env`** (na pasta `gamibook/`):

```env
QDRANT_HOST=<o-teu-host-qdrant>
QDRANT_PORT=6333
QDRANT_HTTPS=true
QDRANT_API_KEY=<a-tua-api-key-qdrant>
OLLAMA_URL=http://ollama:11434
EMBEDDINGS_MODEL=nomic-embed-text
EMBEDDINGS_DIMENSIONS=768
```

> O Qdrant pode ser criado gratuitamente em [cloud.qdrant.io](https://cloud.qdrant.io). Após criares um cluster, obtém o host e a API key no painel do projecto.

**Ficheiro `client/.env`** (dentro da pasta `client/`):

```env
VITE_DIRECTUS_URL=http://localhost:8055
VITE_FLOWISE_URL=http://localhost:3000
VITE_FLOWISE_CHATFLOW_ID=<o-id-do-teu-chatflow-no-flowise>
```

> O `VITE_FLOWISE_CHATFLOW_ID` é obtido após configurares o fluxo no Flowise (ver passo 6).

### 4. Instalar dependências do cliente

```bash
cd client
npm install
cd ..
```

### 5. Arrancar os serviços Docker

Na raiz do projecto, arranca o Directus, Flowise e Ollama:

```bash
docker compose up -d
```

Isto inicia três contentores:
- `gamibook-directus` — porta 8055
- `gamibook-flowise` — porta 3000
- `gamibook-ollama` — porta 11434

Verifica se estão todos a correr:

```bash
docker compose ps
```

### 6. Configurar o Directus

Abre o browser em `http://localhost:8055`. Na primeira vez, o Directus pede para criares uma conta de administrador.

Após o login, precisas de:

1. **Importar o esquema da base de dados** — vai a *Settings → Data Model* e cria as colecções necessárias (books, modules, exercises, users extensions, etc.), ou importa o snapshot se existir.
2. **Configurar as permissões de acesso** — em *Settings → Access Policies*, define as permissões para os roles: `admin`, `admin absoluto`, `editora`, `autor` e utilizadores regulares.
3. **Configurar o CORS** — já está pré-configurado no `docker-compose.yml` para aceitar pedidos de `http://localhost:5173`.

### 7. Configurar o Ollama (modelo de embeddings)

O Ollama precisa de ter o modelo `nomic-embed-text` descarregado. Após o contentor estar a correr:

```bash
docker exec -it gamibook-ollama ollama pull nomic-embed-text
```

Aguarda o download completo (o modelo tem ~274 MB).

### 8. Configurar o Flowise

Abre o browser em `http://localhost:3000`. Na primeira vez, configura as credenciais de acesso.

De seguida, cria ou importa o ChatFlow de geração de exercícios. O fluxo deve incluir:
- Ligação ao Ollama (embeddings) em `http://ollama:11434`
- Ligação ao Qdrant (vector store) com as credenciais do teu cluster
- O prompt de geração configurado para produzir exercícios em JSON

Após criares o fluxo, copia o **ID do ChatFlow** (visível no URL ou nas definições do fluxo) e coloca-o no `client/.env` como `VITE_FLOWISE_CHATFLOW_ID`.

---

## Variáveis de ambiente

### `client/.env`

| Variável | Exemplo | Descrição |
|---|---|---|
| `VITE_DIRECTUS_URL` | `http://localhost:8055` | URL do Directus |
| `VITE_FLOWISE_URL` | `http://localhost:3000` | URL do Flowise |
| `VITE_FLOWISE_CHATFLOW_ID` | `18a5aadf-...` | ID do ChatFlow no Flowise |

### `.env` (raiz)

| Variável | Exemplo | Descrição |
|---|---|---|
| `QDRANT_HOST` | `xxx.aws.cloud.qdrant.io` | Host do cluster Qdrant |
| `QDRANT_PORT` | `6333` | Porto do Qdrant |
| `QDRANT_HTTPS` | `true` | Usar HTTPS no Qdrant |
| `QDRANT_API_KEY` | `...` | API key do Qdrant |
| `OLLAMA_URL` | `http://ollama:11434` | URL do Ollama (dentro do Docker) |
| `EMBEDDINGS_MODEL` | `nomic-embed-text` | Modelo de embeddings |
| `EMBEDDINGS_DIMENSIONS` | `768` | Dimensões dos vectores |

---

## Arranque dos serviços

Depois de toda a configuração estar feita, o fluxo normal de desenvolvimento é:

### Arrancar tudo

**Terminal 1** — Docker (Directus + Flowise + Ollama):
```bash
docker compose up -d
```

**Terminal 2** — Cliente Vue:
```bash
cd client
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

### Parar os serviços Docker

```bash
docker compose down
```

Para parar e apagar os volumes (reset completo):
```bash
docker compose down -v
```

---

## Comandos úteis

### Cliente (`cd client`)

```bash
npm run dev          # Servidor de desenvolvimento (localhost:5173)
npm run build        # Verificação de tipos + build de produção
npm run preview      # Preview do build de produção
npm run test:unit    # Testes unitários com Vitest
npm run type-check   # Só verificação de tipos (vue-tsc)
npm run format       # Formatar código com Prettier
```

### Docker

```bash
docker compose up -d          # Arrancar todos os serviços em background
docker compose down           # Parar todos os serviços
docker compose logs -f        # Ver logs em tempo real
docker compose logs directus  # Logs apenas do Directus
docker compose restart flowise # Reiniciar só o Flowise
docker compose ps             # Ver estado dos contentores
```

### Ollama

```bash
# Instalar modelo de embeddings (só necessário uma vez)
docker exec -it gamibook-ollama ollama pull nomic-embed-text

# Ver modelos instalados
docker exec -it gamibook-ollama ollama list
```

---

## Estrutura do projecto

```
gamibook/
├── .env                        # Variáveis de ambiente (Qdrant, Ollama) — não commitar
├── docker-compose.yml          # Directus, Flowise, Ollama
├── CLAUDE.md                   # Documentação para o Claude Code
│
├── client/                     # Vue 3 SPA
│   ├── .env                    # Variáveis do cliente — não commitar
│   ├── src/
│   │   ├── router/             # Vue Router + guards de autenticação
│   │   ├── services/           # Chamadas à API (Directus, Flowise)
│   │   ├── stores/             # Estado global (Pinia)
│   │   ├── types/              # Interfaces TypeScript
│   │   ├── composables/        # Lógica reutilizável
│   │   ├── utils/              # Utilitários (gamificação, parser de exercícios)
│   │   ├── views/              # Páginas (uma por rota)
│   │   ├── components/         # Componentes UI e de funcionalidade
│   │   └── styles/             # CSS global e tema
│   └── vite.config.ts
│
├── server/                     # Express.js (placeholder)
│
├── directus/
│   ├── uploads/                # Ficheiros enviados pelos utilizadores
│   └── extensions/             # Extensões personalizadas do Directus
│
└── docker/
    ├── ollama_data/            # Dados persistentes do Ollama
    └── flowise_data/           # Dados persistentes do Flowise
```

---

## IDE recomendada

- **VS Code** com a extensão [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (desactivar o Vetur se estiver instalado)
- **Extensão de browser**: [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) para Chrome/Edge/Brave

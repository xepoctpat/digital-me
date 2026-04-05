# Ollama setup, parameters, and startup guide

This document covers the **verified Ollama workflow** for Second Me's local support-model path.

All PowerShell examples below assume your current directory is the repository root.

For general Windows usage, the repository still leans Docker-first. That said, the **native Windows + Ollama** startup flow below has been verified in this repository for:

- backend startup
- frontend startup
- Ollama-backed support model configuration
- embeddings
- `POST /api/kernel2/chat`
- `POST /api/talk/chat_json`

## Verified working values

These are the values that were validated in this repository.

| Setting | Verified value |
|---|---|
| Chat model | `qwen2.5:0.5b` |
| Embedding model | `snowflake-arctic-embed:110m` |
| Local Ollama base URL | `http://127.0.0.1:11434/v1` |
| Docker-to-host Ollama base URL | `http://host.docker.internal:11434/v1` |
| Placeholder API key | `ollama` |
| Backend port | `8002` |
| Frontend port | `3000` |
| Embedding context limit | `512` |
| Embedding vector length | `768` |

> `qwen2.5:0.5b` is a **smoke-test / low-footprint model**, not a quality maximum. It is good for proving the local stack works. If you want stronger answers later, swap to a larger Ollama model and update the saved config.

## 1. Install and prepare Ollama

Download and install Ollama from the official site:

- Download: [https://ollama.com/download](https://ollama.com/download)
- Website: [https://ollama.com](https://ollama.com/)
- Model library: [https://ollama.com/library](https://ollama.com/library)
- GitHub: [https://github.com/ollama/ollama/](https://github.com/ollama/ollama/)

Then start Ollama and pull the verified models:

```powershell
ollama serve
ollama pull qwen2.5:0.5b
ollama pull snowflake-arctic-embed:110m
ollama list
```

To inspect the embedding model's actual limits:

```powershell
ollama show snowflake-arctic-embed:110m
```

Expected key fields:

```text
context length      512
embedding length    768
```

## 2. Ollama API shape used by Second Me

Second Me talks to Ollama through the **OpenAI-compatible** `/v1` endpoints.

### Chat request

```bash
curl http://127.0.0.1:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "qwen2.5:0.5b",
  "messages": [
    {"role": "user", "content": "Why is the sky blue?"}
  ]
}'
```

### Embedding request

```bash
curl http://127.0.0.1:11434/v1/embeddings -H "Content-Type: application/json" -d '{
  "model": "snowflake-arctic-embed:110m",
  "input": "Why is the sky blue?"
}'
```

Reference: [Ollama OpenAI compatibility docs](https://github.com/ollama/ollama/blob/main/docs/openai.md)

## 3. Required local parameters

For the verified Ollama flow, the following local environment values matter most.

| Key | Verified value | Purpose |
|---|---|---|
| `LOCAL_LLM_SERVICE_URL` | `http://127.0.0.1:11434/v1` | Backend target for the local LLM server |
| `LOCAL_APP_PORT` | `8002` | Flask backend port |
| `LOCAL_FRONTEND_PORT` | `3000` | Next.js frontend port |
| `EMBEDDING_MAX_TEXT_LENGTH` | `512` | Must not exceed the embedding model context length |
| `DB_FILE` | `data/sqlite/lpm.db` | Local SQLite database path |
| `CHROMA_PERSIST_DIRECTORY` | `./data/chroma_db` | Local ChromaDB path |
| `LOCAL_BASE_DIR` | `.` | Local filesystem base path |
| `LOCAL_LOG_DIR` | `logs` | Local log directory |

The repository now includes both `.env.template` and `.env.example` with safe generic defaults for this workflow.

- If `.env` is missing, the first-party setup and launch scripts create a local `.env` automatically from the template.
- You only need to edit `.env` when your machine, ports, or provider setup differ from the default path.

The default env values for this workflow are:

```dotenv
LOCAL_LLM_SERVICE_URL=http://127.0.0.1:11434/v1
LOCAL_APP_PORT=8002
LOCAL_FRONTEND_PORT=3000
EMBEDDING_MAX_TEXT_LENGTH=512
DB_FILE=data/sqlite/lpm.db
CHROMA_PERSIST_DIRECTORY=./data/chroma_db
LOCAL_BASE_DIR=.
LOCAL_LOG_DIR=logs
```

## 4. Native Windows startup flow (verified)

### First-time local setup

Run:

```powershell
.\scripts\setup.ps1
```

This installs Python and frontend dependencies for the native workflow.

If `.env` does not exist yet, the setup and start scripts create it locally from `.env.template`.

> `-BuildLlama` is **not required** for the Ollama path.

### Start the full app with Ollama

```powershell
.\scripts\start.ps1 -UseOllama
```

This starts:

- Flask backend on `http://127.0.0.1:8002`
- Next.js frontend on `http://127.0.0.1:3000`
- with the backend pointed at `http://127.0.0.1:11434/v1`

### Start backend only

```powershell
.\scripts\start.ps1 -BackendOnly -UseOllama
```

### Check status

```powershell
.\scripts\status.ps1 -Detailed
```

### Stop services

```powershell
.\scripts\stop.ps1
```

### Restart services

```powershell
.\scripts\restart.ps1 -UseOllama
```

### Restart backend only

```powershell
.\scripts\restart-backend.ps1 -UseOllama
```

## 5. PowerShell script parameter reference

### `scripts\setup.ps1`

| Parameter | Meaning |
|---|---|
| `-BuildLlama` | Builds `llama.cpp` for the managed llama-server path; not needed for Ollama |
| `-SkipFrontendInstall` | Skips `npm install` in `lpm_frontend` |

### `scripts\start.ps1`

| Parameter | Meaning |
|---|---|
| `-BackendOnly` | Starts only the backend |
| `-UseOllama` | Uses `http://127.0.0.1:11434/v1` as the local LLM URL |
| `-LocalLLMUrl <url>` | Overrides the local LLM base URL |
| `-HealthTimeoutSec <int>` | Wait timeout for backend/frontend health checks |
| `-Force` | Replaces stale processes or conflicting listeners |

### `scripts\start_local.ps1`

| Parameter | Meaning |
|---|---|
| `-LocalLLMUrl <url>` | Backend-only LLM base URL override |
| `-HealthTimeoutSec <int>` | Wait timeout for backend health |
| `-Force` | Replaces stale backend processes or port owners |

### `scripts\restart.ps1`

| Parameter | Meaning |
|---|---|
| `-BackendOnly` | Restarts only the backend |
| `-UseOllama` | Reuses the local Ollama default URL |
| `-LocalLLMUrl <url>` | Overrides the local LLM base URL |
| `-HealthTimeoutSec <int>` | Health-check timeout |
| `-Force` | Replaces stale processes |

### `scripts\restart-backend.ps1`

| Parameter | Meaning |
|---|---|
| `-UseOllama` | Uses the verified local Ollama default URL |
| `-LocalLLMUrl <url>` | Backend-only LLM URL override |
| `-HealthTimeoutSec <int>` | Backend health-check timeout |
| `-Force` | Replaces stale backend state |

### `scripts\restart-force.ps1`

| Parameter | Meaning |
|---|---|
| `-UseOllama` | Starts again using the Ollama default URL |
| `-LocalLLMUrl <url>` | Override LLM base URL |
| `-HealthTimeoutSec <int>` | Health-check timeout |

> `restart-force.ps1` removes the local `data/` directory before starting again. Use it carefully.

### `scripts\stop.ps1`

| Parameter | Meaning |
|---|---|
| `-BackendOnly` | Stop only backend |
| `-FrontendOnly` | Stop only frontend |

### `scripts\status.ps1`

| Parameter | Meaning |
|---|---|
| `-LocalLLMUrl <url>` | Override the LLM URL used for the status probe |
| `-Detailed` | Also print the backend health payload |

## 6. Support model settings inside the app

In **Support Model Configuration**, use these values for the verified Ollama setup:

```text
Provider: Ollama

Chat
Model Name: qwen2.5:0.5b
API Key: ollama
API Endpoint: http://127.0.0.1:11434/v1

Embedding
Model Name: snowflake-arctic-embed:110m
API Key: ollama
API Endpoint: http://127.0.0.1:11434/v1
```

For a Dockerized backend talking to Ollama on the host machine, use:

```text
Chat API Endpoint: http://host.docker.internal:11434/v1
Embedding API Endpoint: http://host.docker.internal:11434/v1
```

## 7. Startup sequence summary

If you just want the shortest working path:

```powershell
# 1. Start Ollama
ollama serve

# 2. Pull the verified models
ollama pull qwen2.5:0.5b
ollama pull snowflake-arctic-embed:110m

# 3. Install app dependencies (first time only)
.\scripts\setup.ps1

# 4. Start Second Me against Ollama
.\scripts\start.ps1 -UseOllama

# 5. Verify health
.\scripts\status.ps1 -Detailed
```

Then open:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8002`

## 8. Troubleshooting

### Model not found

If chat fails with `model "..." not found`, check:

```powershell
ollama list
```

Make sure the saved support-model config and the actual Ollama model names match exactly.

### Embedding errors or 500s during ingest

Check:

- `EMBEDDING_MAX_TEXT_LENGTH`
- `ollama show snowflake-arctic-embed:110m`

For the verified embedding model, use:

```dotenv
EMBEDDING_MAX_TEXT_LENGTH=512
```

### ChromaDB collection reinitialization

If you change embedding models and the vector dimension changes, Second Me may reinitialize Chroma collections automatically. That is expected.

Example from the verified Ollama switch:

- old dimension: `1536`
- new dimension: `768`

### Backend starts but chat is unavailable

Check:

```powershell
.\scripts\status.ps1 -Detailed
```

and confirm the local LLM probe is healthy at:

```text
http://127.0.0.1:11434/v1/models
```

### Port conflict

Use `-Force` only after checking that it is safe to replace the existing process.

Example:

```powershell
.\scripts\start.ps1 -UseOllama -Force
```

## 9. Verified end state

The verified local Ollama deployment in this repository ended with:

- frontend healthy on `3000`
- backend healthy on `8002`
- Ollama healthy on `11434`
- `POST /api/kernel2/chat` working
- `POST /api/talk/chat_json` working
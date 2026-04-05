# Ollama + native Windows runtime handoff — 2026-04-05

## What changed

This workstream focused on making Second Me easier to run locally with an external local model server, while keeping the repo shareable and free of user-specific runtime state.

### Local model provider path

- Added first-class Ollama support in the support-model configuration flow.
- Standardized OpenAI-compatible endpoint normalization to `/v1` for local providers.
- Updated local-provider defaults so the backend can target an external OpenAI-compatible service instead of assuming only the managed `llama-server` path.
- Kept placeholder values generic in docs and UI (`ollama`, `127.0.0.1`, `host.docker.internal`).

### Backend reliability and chat compatibility

- Updated local-LLM service status handling so health checks can distinguish managed vs external local services.
- Fixed non-stream chat responses to serialize SDK response objects before returning JSON.
- Fixed chat model resolution so configured local chat models are used instead of falling back to `models/lpm` on the Ollama path.
- Reduced import-time coupling so chat-only or external-local-LLM setups can boot without eagerly loading the full training stack.
- Made optional dependencies such as `psutil` and `torch` degrade gracefully when unavailable.

### Embedding and Chroma behavior

- Replaced simple name-only embedding-dimension assumptions with a resolver that can use known model mappings and provider probing.
- Updated Chroma initialization and embedding service logic to use the resolved embedding dimension.
- Documented the need to align `EMBEDDING_MAX_TEXT_LENGTH` with the actual embedding model context length.

### Windows-native operator workflow

- Added PowerShell lifecycle scripts for native Windows setup, start, stop, restart, backend-only restart, force restart, and health/status checks.
- Wired Windows `Makefile` targets to those PowerShell scripts.
- Made the frontend dev startup path Windows-safe by replacing the Unix-only `.next` cleanup command.

### Docker and docs cleanup

- Fixed Docker health checks for backend, frontend, and Ollama containers.
- Expanded the Ollama docs page into a verified startup and parameter guide.
- Added a README link so the Ollama guide is discoverable from Quick Start.

## Files and surfaces involved

### Backend

- `lpm_kernel/api/services/local_llm_service.py`
- `lpm_kernel/api/domains/kernel2/routes_l2.py`
- `lpm_kernel/api/domains/kernel2/routes_talk.py`
- `lpm_kernel/api/domains/kernel2/services/chat_service.py`
- `lpm_kernel/api/domains/user_llm_config/routes.py`
- `lpm_kernel/api/__init__.py`
- `lpm_kernel/api/domains/__init__.py`
- `lpm_kernel/api/domains/loads/__init__.py`
- `lpm_kernel/api/domains/trainprocess/__init__.py`
- `lpm_kernel/api/domains/upload/__init__.py`
- `lpm_kernel/api/domains/loads/load_service.py`
- `lpm_kernel/file_data/chroma_utils.py`
- `lpm_kernel/file_data/embedding_service.py`
- `docker/app/init_chroma.py`
- `pyproject.toml`

### Frontend

- `lpm_frontend/src/components/modelConfigModal/index.tsx`
- `lpm_frontend/src/components/train/TrainingConfiguration.tsx`
- `lpm_frontend/src/store/useModelConfigStore.ts`
- `lpm_frontend/package.json`

### Scripts and runtime

- `Makefile`
- `scripts/setup.ps1`
- `scripts/start.ps1`
- `scripts/start_local.ps1`
- `scripts/stop.ps1`
- `scripts/status.ps1`
- `scripts/restart.ps1`
- `scripts/restart-backend.ps1`
- `scripts/restart-force.ps1`
- `scripts/utils/windows-local.ps1`
- `docker-compose.yml`

### Docs

- `docs/Custom Model Config(Ollama).md`
- `README.md`

## Validation performed

Validated during this workstream:

- Backend health endpoint responded on `http://127.0.0.1:8002/health`.
- Frontend root responded on `http://127.0.0.1:3000`.
- Ollama models endpoint responded on `http://127.0.0.1:11434/v1/models`.
- Direct embedding requests succeeded against the configured Ollama embedding model.
- `POST /api/kernel2/chat` returned a successful completion through the external local provider path.
- `POST /api/talk/chat_json` returned a successful JSON payload after serialization fixes.
- Docker container health checks were corrected for backend, frontend, and Ollama services.

## Privacy and repo-safety notes

- No user-specific exported memories, notes, database files, or local runtime artifacts are part of this handoff.
- Local `.env` changes were used for validation but are intentionally not part of the commit.
- Examples use placeholders and local endpoints only; no private credentials or personal identifiers are documented here.

## Known follow-ups

- The documented Ollama chat model is a low-footprint smoke-test model, not a best-quality default.
- Native Windows support was verified for this local workflow, but Docker remains the safer default recommendation for broader setup guidance.
- The Apple and CUDA-specific backend Dockerfiles were not revalidated in this final pass.
- If embedding models are swapped later and the dimension changes, Chroma collections may need to be reinitialized again.

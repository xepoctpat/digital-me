# Second Me custom agents and prompts

This repository keeps workspace-wide behavior in `.github/copilot-instructions.md`.

This file is a human-readable index of the custom agents and prompts that live under `.github/`; it is **not** an `AGENTS.md` instruction file, so it does not conflict with the existing workspace instructions.

## Default entrypoint

- **`Second Me`** — the primary custom agent for most repository work across backend, frontend, MCP, docs verification, and setup/debugging, with a local-first default.
- **`Work on Second Me`** — the default prompt for everyday repo tasks when you want one simple entrypoint.

## Specialist agents

| Agent | Use when | Main repo surfaces |
| --- | --- | --- |
| `Second Me Backend Engineer` | Flask/Python backend, API routes, file ingestion, embeddings, L0/L1/L2, or training-pipeline work | `lpm_kernel/`, `lpm_kernel/api/`, `lpm_kernel/file_data/` |
| `Second Me Frontend Engineer` | Next.js UI, React components, hooks, stores, service layer, or frontend-backend integration debugging | `lpm_frontend/src/` |
| `Second Me Docs Analyst` | README, GitBook, onboarding, deployment, API docs, or docs-to-code alignment audits | `README.md`, `docs/`, `.github/` markdown |

## Workflow prompts

| Prompt | Use when | What it focuses on |
| --- | --- | --- |
| `Work on Second Me` | general bug, feature, refactor, setup issue, or cross-stack task | routes work to the primary `Second Me` agent |
| `Audit Second Me docs` | README, FAQ, deployment, tutorial, or API-doc review | compares docs against code and highlights stale or missing coverage |
| `Import extracted Second Me memories` | importing uploaded memory files, scanned raw-content documents, or troubleshooting memory-to-embedding flow | verifies `/api/memories/file`, `/api/documents/scan`, extraction, chunking, embeddings, and training readiness |

## Practical picking guide

- Start with **`Second Me`** unless the task is obviously specialized.
- Jump straight to **`Second Me Backend Engineer`** for ingestion, extraction, embedding, or training-pipeline issues.
- Use **`Import extracted Second Me memories`** when the task is specifically about getting source files into the memory/document pipeline and making sure downstream training can use them.

## Repo-specific reminder

- This customization surface is intentionally local-first: prefer local docs, local APIs, local Docker workflows, and localhost examples before public or network-facing paths.
- Windows-facing setup guidance should stay Docker-first unless native support has been explicitly verified.
- For Ollama in Docker contexts, use `host.docker.internal` rather than `127.0.0.1`.
- For embedding-related failures, verify `EMBEDDING_MAX_TEXT_LENGTH` and Chroma state before assuming the import logic is wrong.
- Because this repository is a public fork, never paste real API keys, tokens, instance credentials, private emails, or raw personal memory content into tracked files.
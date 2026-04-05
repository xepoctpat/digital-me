# Second Me README + GitBook Coverage

_Last reviewed: 2026-04-05_

## Scope

This note covers the current repository `README.md`, the GitBook FAQ page the README links to, and the most relevant adjacent pages and local docs that shape the user-facing story:

- GitBook welcome page
- GitBook tutorial / getting-started flow
- GitBook deployment guide
- GitBook what's-new page
- Local docs for Ollama config, embedding-model switching, and the local/public chat APIs

The goal is not to restate every sentence, but to capture the full documented surface, tie it back to the repo, and flag areas where the docs are strong, incomplete, or stale.

## Executive summary

Second Me is documented as an open-source, privacy-first AI identity system: an AI self trained on a user's memories, hosted locally, optionally connected to a larger network, and extended through roleplay/network app patterns.

Across the README and GitBook, the strongest documented themes are:

1. **Local ownership and privacy** — user data stays local and under user control.
2. **Identity-centric personalization** — the system is framed as representing the user's thinking patterns, not just answering prompts.
3. **Practical onboarding** — Docker-first quick start, tutorial-first UX, and FAQ-driven troubleshooting.
4. **Interoperability** — OpenAI-compatible chat APIs, MCP endpoints, and local/public integration paths.
5. **Consumer-friendly product framing** — roleplay apps, network apps, and future-facing "Second X" app concepts.

The documentation is quite good for onboarding and common setup failures. It is weaker on implementation-level architecture, code-to-doc traceability, and a few areas where wording has likely lagged behind the repo.

## Documentation surface map

| Source | What it covers best | Key takeaways |
| --- | --- | --- |
| `README.md` | Product narrative + quick start | Strong positioning, simple Docker-first path, links out to GitBook for details |
| GitBook `Welcome` | High-level mission | Identity-preserving AI, collaborative networks, anti-centralization framing |
| GitBook `Tutorial` | End-user flow | Create identity, upload memories, train, chat, explore apps |
| GitBook `FAQ` | Setup, training, debugging, product questions | Best operational troubleshooting surface |
| GitBook `Deployment` | Docker vs integrated setup | Cross-platform guidance, memory sizing, prerequisites |
| GitBook `What's new` | Release notes + roadmap snapshots | Docker expansion, OpenAI-compatible API, MCP/continuous-learning direction |
| `docs/Custom Model Config(Ollama).md` | Local model wiring | Ollama endpoints, embedding setup, Docker hostname caveat |
| `docs/Embedding Model Switching.md` | Embedding migration behavior | Dimension mismatch handling, Chroma reset/reinit workflow |
| `docs/Local Chat API.md` | Local chat API contract | `/api/kernel2/chat`, SSE, OpenAI-compatible request/response format |
| `docs/Public Chat API.md` | Public instance chat contract | Registration prerequisite, `instance_id`, SSE-compatible response |

## What the README establishes

### Product positioning

The README frames Second Me as a reaction against centralized "Super AI" systems. The tone is intentionally ideological: AI should amplify individuality rather than erase it.

Core README claims:

- users can build an **AI self** that preserves their identity and context
- the system is **locally trained and hosted**
- it can also connect to a broader **Second Me Network**
- it supports future application layers like roleplay and collaborative AI spaces
- privacy and control are treated as first-class promises

### Quick-start expectations

The README is intentionally simple:

1. clone repo
2. run `make docker-up`
3. open `http://localhost:3000`

That is good for lowering onboarding friction, but it shifts most real operational detail into GitBook.

### Embedded guidance already present

The README also includes:

- a memory-to-model-size reference table
- a pointer to MLX acceleration on Apple Silicon
- a pointer to the deployment guide
- a pointer to the FAQ
- example use cases for roleplay and network scenarios

### README strengths

- clear value proposition
- strong links to next-step docs
- pragmatic quick start instead of a giant setup wall
- good social proof / community routing

### README limitations

- it does not explain the internal architecture in any meaningful detail
- it does not explain the difference between local and public API surfaces
- its roadmap section is currently dated as **May 2025**, which is stale as of this review

## FAQ coverage

The FAQ is the densest practical documentation page and is organized into five categories.

### 1. Installation & environment setup

Documented answers include:

- Docker is the recommended cross-platform path for Mac, Windows, and Linux.
- Windows users may need `make` through MinGW or WSL.
- Native Windows setup is not recommended / not fully tested.
- Non-Docker installs require the usual host dependencies.
- Bare-metal Mac setup is positioned as a performance-oriented option.
- Training supports checkpoint resumption after restart.
- GPU acceleration is described as under development.
- Users with network issues should switch package sources or proxies by region.

#### Coverage assessment

This is one of the best-covered sections. It sets expectation early that Windows users should prefer Docker and that integrated installs are for more advanced users.

#### Important nuance

The repo contains GPU-related assets (`docker-compose-gpu.yml`, `Dockerfile.backend.cuda`, `Dockerfile.backend.apple`, CUDA helper scripts), so the codebase clearly has GPU-oriented deployment paths. The docs still describe overall GPU support cautiously. That is not necessarily wrong, but it means the public wording is intentionally conservative compared with the repo surface.

### 2. Model / training

Documented answers include:

- how to use local models via Ollama, Gemma, Qwen, etc.
- Docker users should replace `127.0.0.1` with `host.docker.internal`
- training failures are often caused by insufficient Docker memory or mismatched model config
- Chroma embedding dimension mismatch can often be fixed by deleting `data/chroma_db` and retraining
- OpenAI-looking errors can still come from Ollama-backed flows because the SDK is OpenAI-compatible
- recommended training data size is roughly `10k~100k`
- intermediate artifacts are reused, so retraining does not necessarily re-trigger all API costs

#### Coverage assessment

This section is strong on operational failure modes and very helpful for real users. It is less explicit about the internal training stages and storage flow.

#### Related local doc coverage

`docs/Custom Model Config(Ollama).md` substantially strengthens this area by documenting:

- Ollama commands (`pull`, `serve`, `list`, `show`)
- OpenAI-compatible chat and embedding endpoints
- `EMBEDDING_MAX_TEXT_LENGTH`
- the exact Docker hostname switch to `host.docker.internal`

`docs/Embedding Model Switching.md` extends the same troubleshooting surface by documenting:

- common embedding dimensions across OpenAI and Ollama models
- automatic dimension-mismatch detection and collection reinitialization
- the fallback manual recovery path of clearing `data/chroma_db`
- the implementation locations in `lpm_kernel/file_data/` and `docker/app/init_chroma.py`

Together, these local docs turn the FAQ's model/embedding advice into an actionable operator guide.

### 3. Features & architecture

Documented answers include:

- the difference between Second Me and `me.bot`
- running multiple instances is supported if hardware and ports allow it
- Second Me can be integrated into external agent frameworks through an open API and MCP support
- embedding and chat models may differ because model vendors do not consistently provide both interfaces

#### Coverage assessment

This section is useful but high-level. It answers product questions well, but it does not explain where those features live in the repo or how local/public/MCP flows relate.

### 4. Errors & debugging

Documented answers include:

- `No rule to make target 'setup'` → check project root and `Makefile`
- `Too many open files` → report issue, include OS/memory/docker details
- `entities.parquet` missing → use a more capable data extraction model
- `Permission denied (publickey)` → use HTTPS clone
- `internal server error` → often embedding max-length mismatch; adjust `.env`
- `generate_biography` failures → many HTTP-status-specific suggestions
- embedding failures → try a stronger model or reinitialize Chroma
- `sqlite3.OperationalError: no such column: collections.topic` → delete Chroma data and restart
- training stuck at train step → allocate more memory, 16 GB or higher recommended

#### Coverage assessment

This is the most immediately useful section for support triage. It translates messy runtime failures into concrete next actions.

#### Especially important troubleshooting facts

- The docs repeatedly imply that **resource constraints** are a major real-world bottleneck.
- The docs also imply that **model compatibility/config correctness** matters as much as raw compute.
- The `.env` file is part of the operational story, not just an implementation detail.

### 5. Other questions

Documented answers include:

- Logseq / Notion / me.bot logs can be used after conversion to plaintext or Markdown
- the current UI only shows the first 100 uploaded files
- Mindverse is open to interns/collaborators

#### Coverage assessment

Short but useful. The file-visibility note is especially important because users could easily misread that limitation as data loss.

## Related page coverage

### GitBook welcome page

The welcome page reinforces the identity-preserving mission and collaborative network theme. It is mostly positioning, not operations.

### GitBook tutorial / getting-started flow

The fetched `getting-started` URL resolves to content titled `Tutorial`, which walks through the main end-user journey:

1. define identity
2. upload memory
3. train the model
4. chat with the resulting Second Me
5. explore roleplay apps, network apps, and future Second X apps

Important tutorial-level themes:

- training is presented as a guided UI workflow
- memory upload diversity is encouraged
- chat behavior can be tuned with memory retrieval, prompt, and temperature settings
- roleplay and network apps are positioned as downstream application layers

#### Coverage assessment

The tutorial is strong on user flow and product imagination. It is not meant to be a developer guide.

### GitBook deployment guide

The deployment guide expands the README quick start into two modes:

- **Docker setup**
- **Integrated non-Docker setup**

Key deployment facts:

- Docker is the easiest cross-platform path
- integrated setup is described as higher-performance, especially for Mac and Linux
- Python 3.12+, Node.js 23+, npm, and build tools are expected for integrated setup
- Docker Desktop memory allocation matters materially
- Apple Silicon users can use MLX for larger models in CLI workflows

#### Coverage assessment

This guide does the real operational heavy lifting that the README intentionally skips.

### GitBook what's-new page

Documented release themes include:

- broader Docker support across platforms
- OpenAI-compatible API support for external apps
- MLX beta support for Apple Silicon
- improved training logs
- fixes for open-file issues and long-document handling
- future direction toward MCP-based identity representation and one-click continuous learning

#### Coverage assessment

Useful for understanding the intended trajectory, but roadmap claims should be treated as time-bound, not as guaranteed current behavior.

## Local docs that materially extend GitBook

### `docs/Custom Model Config(Ollama).md`

This doc makes the FAQ's model-setup guidance actionable.

Most important details:

- Ollama exposes OpenAI-compatible `/v1/chat/completions` and `/v1/embeddings`
- embedding model context length and embedding length matter
- `EMBEDDING_MAX_TEXT_LENGTH` should match the embedding model context window
- Docker deployments need `host.docker.internal`

### `docs/Embedding Model Switching.md`

This doc explains how Second Me handles embedding-dimension changes when users switch providers or models.

Most important details:

- model families may produce very different embedding dimensions, such as `768`, `1024`, `1536`, or `3072`
- the system now detects a dimension mismatch and attempts to reinitialize Chroma collections automatically
- if automatic handling does not resolve the issue, the documented manual fallback is to reset `data/chroma_db` and restart
- the doc points directly to implementation locations: `lpm_kernel/file_data/chroma_utils.py`, `lpm_kernel/file_data/embedding_service.py`, and `docker/app/init_chroma.py`

### `docs/Local Chat API.md`

This doc specifies the local chat surface:

- endpoint: `POST /api/kernel2/chat`
- host: local endpoint at `localhost:8002`
- OpenAI V1-compatible message format
- SSE streaming response structure
- optional metadata including `enable_l0_retrieval` and `role_id`

### `docs/Public Chat API.md`

This doc specifies the public chat surface:

- registration is required first
- users need an `instance_id`
- endpoints are under `https://app.secondme.io/api/chat/{instance_id}`
- SSE/OpenAI-compatible response chunks are used here too

These two API docs are important because they explain that "chat" is not a single interface; there is a local service contract and a public network-facing contract.

## Repo mapping for the documented surface

The public docs are only half the story. The codebase locations that most directly map to the documented user experience are:

| Concern | Key repo locations |
| --- | --- |
| Backend app entry | `lpm_kernel/app.py`, `lpm_kernel/api/__init__.py` |
| Local chat routes | `lpm_kernel/api/domains/kernel2/` |
| Chat DTOs/services | `lpm_kernel/api/domains/kernel2/dto/`, `.../services/` |
| Frontend app | `lpm_frontend/src/app/`, `lpm_frontend/src/components/` |
| Frontend service layer | `lpm_frontend/src/service/` |
| Frontend streaming hook | `lpm_frontend/src/hooks/useSSE.tsx` |
| Local MCP | `mcp/mcp_local.py` |
| Public MCP | `mcp/mcp_public.py` |
| File + embedding pipeline | `lpm_kernel/file_data/` |
| Training layers | `lpm_kernel/L0/`, `lpm_kernel/L1/`, `lpm_kernel/L2/` |

This mapping matters because the docs frequently talk in product terms while the repo is organized by implementation domains.

## Important gaps, ambiguities, and stale spots

### 1. Roadmap dating in `README.md`

The `What's Next: May 2025` section is stale relative to the current date. That does not make it wrong historically, but it should no longer read like a live roadmap.

### 2. Clone command inconsistency

- `README.md` uses HTTPS clone syntax.
- the GitBook deployment guide uses SSH clone syntax.
- the FAQ explicitly addresses SSH key failures and recommends HTTPS.

That means the onboarding docs are not fully harmonized. For new users, HTTPS is the safer default.

### 3. Windows expectations are easy to overread

The README quick start is intentionally universal-looking, but the FAQ and deployment guide both imply that:

- Docker is the safest Windows path
- native/integrated Windows setup is not the preferred route
- `make` may need extra installation

That should be clearer in any future Windows-specific onboarding pass.

### 4. Checkpoint-path wording may need re-verification

The FAQ mentions checkpoint resumption with progress saved in `resource/` and `data/` directories. The repo contains a top-level `resources/` directory, plural. That may be a documentation shorthand or a stale path reference; it should be verified before being repeated elsewhere.

### 5. GPU support messaging is conservative but slightly fuzzy

The docs say GPU acceleration is under development, while the repo already includes GPU-specific compose files and Dockerfiles. The likely truth is that support exists in some deployment paths but is not yet positioned as simple or universally stable.

### 6. The internal architecture is under-documented for contributors

User-facing docs say plenty about identity, memory, and apps, but much less about:

- how the backend domains are organized
- how local/public/MCP flows differ
- how the L0/L1/L2 pipeline maps to training artifacts
- where streaming chat is wired between frontend and backend

This is fine for end users, but it leaves contributor-level coverage thinner than it could be.

### 7. GitBook path naming is slightly confusing

The README links `getting-started`, but the fetched content presents itself as `Tutorial` with tutorial anchors. This may just be GitBook routing/alias behavior, but it is worth knowing if links are audited later.

## Suggested documentation backlog

If the goal is to improve clarity without rewriting the whole docs set, the highest-value additions would be:

1. **A contributor architecture map**
   - backend, frontend, MCP, data pipeline, training layers
2. **A local vs public API comparison page**
   - endpoints, prerequisites, auth expectations, intended use
3. **A Windows-specific setup note**
   - Docker-first guidance, `make` caveat, what is and is not tested
4. **A doc harmonization pass for clone instructions**
   - choose HTTPS as default unless SSH is explicitly preferred
5. **A sharper GPU support statement**
   - experimental vs recommended vs fully supported paths
6. **A roadmap freshness pass**
   - clearly mark old roadmap snapshots as historical

## Bottom line

The current documentation does a good job of selling the product idea and getting a motivated user from zero to first run. The FAQ is the operational backbone, and the deployment guide does the real setup work the README intentionally omits.

The main weaknesses are not absence of documentation, but **fragmentation** and **age drift**:

- some critical details are split across README, FAQ, deployment, and local docs
- contributor-facing architecture is thin
- a few operational details are inconsistent or potentially stale

If you want a working mental model in one sentence:

> `README.md` explains why Second Me matters, GitBook explains how to run it, the FAQ explains how to survive it, and the repo itself explains what is actually there.

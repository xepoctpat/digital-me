# Second Me workspace guidelines

## Architecture

- `lpm_kernel/` contains the backend application, API domains, training layers, and file/embedding services.
- `lpm_frontend/` contains the Next.js frontend, UI components, service layer, and SSE chat hooks.
- `mcp/` contains local and public MCP adapters.
- `docs/` contains local operational and API docs; public-facing GitBook pages mirror part of this surface.

## Local-first and public-fork safety

- Prefer repo-local code, local docs, local Docker workflows, local APIs, and local filesystem operations before public or network-facing surfaces.
- Do not recommend public upload registration, public chat endpoints, or network exposure unless the task explicitly asks for them.
- Treat this repository as a public fork: never commit, paste, or preserve real API keys, tokens, cookies, instance passwords, private emails, or raw personal memory content in tracked files.
- When examples are needed, use placeholders such as `example-api-key`, `example-instance-id`, and local addresses like `localhost` or `host.docker.internal`.
- Summarize sensitive uploaded memory or personal data at a high level rather than echoing it verbatim unless the user explicitly asks and no tracked file is involved.

## Documentation verification

- Prefer local docs and code first; fetch public GitBook or other web pages only when the task actually requires public-surface verification.
- When editing onboarding, deployment, FAQ, troubleshooting, or API docs, cross-check `README.md`, local docs under `docs/`, and `docs/coverage/secondme-readme-gitbook-coverage.md`.
- Treat code as the source of truth for routes and runtime behavior. For chat/API work, verify against `lpm_kernel/api/`, `mcp/`, `lpm_frontend/src/service/`, and `lpm_frontend/src/hooks/useSSE.tsx`.
- Keep local and public surfaces distinct. `docs/Local Chat API.md` and `docs/Public Chat API.md` describe different usage paths.

## Repo-specific gotchas

- Prefer Docker guidance for Windows unless native support has been explicitly verified for the task at hand.
- For Ollama inside Docker-based setups, use `host.docker.internal` instead of `127.0.0.1`.
- If docs mention embedding failures or server-side chunk-length issues, verify `EMBEDDING_MAX_TEXT_LENGTH` guidance before changing code or documentation.
- Call out stale roadmap dates or contradictory setup instructions instead of silently preserving them.

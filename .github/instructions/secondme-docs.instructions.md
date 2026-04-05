---
description: "Use when editing README, docs/*.md, GitBook-aligned pages, onboarding notes, deployment docs, FAQ/troubleshooting docs, API docs, or Copilot customization files for the Second Me repository."
applyTo:
  - "README.md"
  - "docs/**/*.md"
  - ".github/**/*.md"
---
# Second Me documentation guidance

- Treat repository code as the source of truth for endpoint paths, runtime behavior, and integration boundaries.
- Prefer local docs and repository code before public GitBook pages unless the task explicitly requires public-doc alignment.
- Keep these surfaces distinct in documentation: local app, public network app, local MCP, and public MCP.
- In this public fork, never commit or document real API keys, tokens, instance credentials, private emails, or raw personal memory content; use placeholders or redact values.
- Prefer local endpoints and local workflows in examples; mention public or network-facing paths only when they are the subject being documented.
- For Windows-facing setup guidance, prefer Docker-oriented instructions unless native/integrated Windows support has been verified for the specific workflow.
- For Ollama in Docker contexts, document `host.docker.internal` instead of `127.0.0.1`.
- If troubleshooting touches embeddings or internal-server-error cases, verify whether `EMBEDDING_MAX_TEXT_LENGTH` or Chroma state is part of the failure path.
- Call out stale dates, conflicting clone commands, or ambiguous support language instead of silently carrying it forward.

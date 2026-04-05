---
name: "Audit Second Me docs"
description: "Audit README, GitBook FAQ/tutorial/deployment pages, or local docs against the Second Me codebase and identify discrepancies, stale guidance, and missing coverage."
argument-hint: "Area to audit, such as README quick start, FAQ troubleshooting, deployment flow, or local/public chat APIs"
agent: "Second Me Docs Analyst"
---
Audit the requested documentation area for the Second Me repository.

Requirements:

1. Read the relevant local docs in `README.md`, `docs/`, and `docs/coverage/`.
2. Prefer local docs and repository code before public pages unless the task explicitly involves GitBook or other URLs.
3. If URLs are involved, retrieve the relevant GitBook pages and any directly relevant linked pages.
4. Use placeholders or redaction for any API keys, tokens, instance credentials, private emails, or raw personal memory content.
5. Verify important claims against the code under `lpm_kernel/`, `lpm_frontend/`, and `mcp/`.
6. Return:
   - confirmed facts
   - discrepancies or stale guidance
   - missing documentation
   - concrete edits or follow-up recommendations

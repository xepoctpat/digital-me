---
name: "Work on Second Me"
description: "Use the primary Second Me agent for a bug, feature, refactor, setup issue, or cross-stack repository task."
argument-hint: "Describe the bug, feature, refactor, setup problem, or repo area"
agent: "Second Me"
---
Handle the requested task in the Second Me repository.

Requirements:

1. Determine whether the task involves backend, frontend, MCP, docs, or setup/deployment.
2. Read the relevant files before making changes.
3. Verify claims against implementation instead of assuming behavior.
4. Prefer small, testable changes and report validation performed.
5. Prefer local code, local docs, local Docker workflows, and local APIs over public or network-facing surfaces unless the user explicitly asks otherwise.
6. Use placeholders or redaction for API keys, tokens, instance credentials, private emails, and raw personal memory content.
7. Delegate to a specialist when the task is clearly docs-heavy, backend-heavy, or frontend-heavy.
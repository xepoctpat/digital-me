---
name: "Import extracted Second Me memories"
description: "Use when importing local extracted memory files, scanning raw-content documents, or troubleshooting the memory-to-embedding pipeline in the Second Me repository."
argument-hint: "Describe the memory source, import goal, upload issue, or ingestion failure"
agent: "Second Me Backend Engineer"
---
Handle the requested memory-import task in the Second Me repository.

Requirements:

1. Prefer the local upload and scan paths (`POST /api/memories/file` and `POST /api/documents/scan`) over any public upload or registry flow unless the user explicitly asks otherwise.
2. Verify whether the task goes through uploaded files (`POST /api/memories/file`) or directory scanning (`POST /api/documents/scan`).
3. Start with the real ingestion path in `lpm_kernel/api/domains/memories/routes.py`, `lpm_kernel/file_data/memory_service.py`, and `lpm_kernel/file_data/document_service.py`.
4. Check raw-content persistence, duplicate-file handling, allowed formats (`txt`, `pdf`, `md`), and document `extract_status` / `embedding_status` transitions.
5. If the issue extends downstream, verify chunking, chunk embeddings, repair endpoints, and training readiness under `lpm_kernel/api/domains/documents/` and `lpm_kernel/api/domains/trainprocess/`.
6. Do not paste raw memory contents, API keys, instance credentials, or private emails into tracked files or summaries; redact or summarize instead.
7. Call out relevant environment and storage knobs when they matter, especially `USER_RAW_CONTENT_DIR` and `EMBEDDING_MAX_TEXT_LENGTH`.
8. Return the exact files investigated or changed, validation performed, and any blockers or follow-up steps.
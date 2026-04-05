# Local launch handoff — 2026-04-05

## What changed

This workstream leaves the repo in a much better state for a first local launch.

### Local-first and private-mode behavior

- Added frontend and backend private-mode gating around public-network features.
- Normalized read-only upload discovery endpoints in private mode so they return clean success payloads instead of noisy "disabled" messages.
- Added shared local/public URL helpers on the frontend so public links and local chat paths stay distinct.

### Hosted-memory import and note reconstruction

- Added hosted-export metadata preservation during memory import.
- Added upload preview and raw-content scan preview flows before import.
- Upgraded the local memory UI to browse notes by title, tag, source date, import date, resource state, and search query.
- Added shade provenance storage, API exposure, and a drilldown UI so generated L1 shades can be traced back to related notes and chronology.

### Local launch blockers fixed today

- Fixed raw-content scan preview path resolution so the backend no longer resolves `/app/app/...` paths.
- Removed Chroma/PostHog startup telemetry noise by routing persistent Chroma clients through a local no-op telemetry implementation.
- Revalidated the backend after rebuild so the app can start cleanly for local use.

### Repo hygiene and operator safety

- Tightened ignore rules for local secrets, certificates, databases, cookies, session files, notes, and key-memory exports.
- Added a Docker ignore file to keep local and personal artifacts out of build context.
- Added repo-local Copilot customization files for Second Me workflow routing and docs discipline.
- Added local docs covering hosted-memory import, roadmap context, and README/GitBook coverage notes.

## Validation performed

Validated during this workstream:

- Frontend root responded on `http://localhost:3000`.
- Backend startup completed without the previous Chroma/PostHog telemetry error spam.
- `GET /api/upload/status` returned `200` with `message: "success"` in private mode.
- `GET /api/upload/count` returned `200` with `count: 0` in private mode.
- `GET /api/upload` returned `200` with an empty list in private mode.
- `POST /api/documents/scan/preview` returned `200` and resolved the configured raw-content directory correctly.
- Earlier in the same branch, the Docker frontend build passed for the training and memory pages after the note/shade UI changes.

## Known follow-ups

- `lpm_kernel/utils.py` still emits a `SyntaxWarning` about an invalid escape sequence during startup.
- `script_executor.py` still logs module-loaded messages that are noisy but non-blocking.
- The Apple and CUDA backend Dockerfile changes were not revalidated on their target platforms in this final wrap-up pass.
- The local `.env` file is intentionally **not** part of the commit for this handoff.

## Recommended next checks

- Launch with Docker on Windows and walk through: create identity → upload memories → training → start service → local chat.
- If you want to re-enable public-network features later, set `ENABLE_PUBLIC_NETWORK=true` in your local `.env` and restart.
- If startup warnings become a cleanup target, fix the escape sequence warning in `lpm_kernel/utils.py` first; it is the clearest remaining log blemish.

# Hosted Notes and Shades Reconstruction Roadmap

This roadmap captures the current understanding of how the hosted Second Me product represents memories, what the local repository can already do, what is missing for closer parity, and how to rebuild the hosted note-and-shade experience locally in a Docker-first workflow.

## Goal

Reconstruct the hosted memory experience locally as closely as possible from exported data, then improve it without losing chronology, provenance, or note-level structure.

Parity with the hosted app is the **starting line**, not the finish line. The local product should ultimately surpass the live experience where the hosted UX is constrained or opaque.

In practical terms, the target is:

- preserve hosted note chronology
- preserve hosted note titles, tags, and resource links
- rebuild note-centric browsing locally
- rebuild shade-like abstractions with related-memory provenance
- keep the workflow private and local-first by default
- add better inspection, navigation, and control than the hosted product currently offers

## Guiding principle

Treat the hosted product as a **reference implementation for memory structure**, not as the UX ceiling.

That means the local roadmap has two simultaneous goals:

1. **Fidelity track** — reconstruct note chronology, key-memory priority, and abstraction provenance as accurately as practical from exported data.
2. **Improvement track** — exceed the hosted app in usability, inspectability, operator control, and rebuild safety.

The local product should be better than the live app at:

- tracing abstractions back to source notes
- distinguishing source time from import time
- previewing import results before committing them
- rebuilding deterministically from exports
- inspecting why a shade, topic, or key memory exists
- navigating large note sets without a cramped or fixed layout

## Evidence collected so far

### Public hosted docs (`docs.second.me`)

The newer public docs describe a hosted product centered on:

- **Memory Management** — create, organize, edit, delete, and browse memories
- **Key Memories** — mark some memories as especially important so the AI self prioritizes them
- **Smart Topics** — AI-generated discussion topics derived from memories and interactions
- **Sync** — a score reflecting how well the AI self matches the user
- **Data Import & Export** — the hosted product supports import/export across multiple data sources
- **Multi-Platform** — Web, iOS, and Android

The public docs do **not** currently document the "shade node" UX explicitly. The closest documented concept is **Smart Topics**, while the observed hosted UI suggests a richer note-cluster abstraction layer.

### Hosted export format

Observed exports show that hosted notes are reconstructible at the file level:

- exported as Markdown with YAML frontmatter
- frontmatter includes fields such as:
  - `doc_id`
  - `title`
  - `source_type`
  - `data_type`
  - `memory_type`
  - `created`
  - `modified`
  - `tags`
  - sometimes `resources`
- some image-backed notes preserve remote resource URLs in frontmatter and inline Markdown image links

This means chronology and resource references are available from exports even when the exact hosted internal state is not.

### Observed hosted UI behavior

The hosted web surface shows:

- memories represented as **Notes**, **Key Memories**, and **To-Dos**
- key-memory updates happening from chat
- a graph/node interaction surface where clicking a node opens a detailed page
- node detail pages containing:
  - an abstracted theme title
  - a synthesized long-form description
  - a related-memory count
  - a chronological list of note cards
  - at least some image thumbnails/resources

This strongly suggests the hosted product maintains:

1. note-level memory records
2. prioritized key-memory records
3. a generated abstraction layer over groups of notes
4. provenance from abstractions back to notes

### Current local repository behavior

The local repo already supports:

- uploading `.txt`, `.md`, and `.pdf`
- scanning a raw-content directory
- L0 extraction and chunking
- L1 biography and shade generation
- L2 training
- Docker-first deployment on Windows

The local repo does **not** yet match the hosted product in several important ways:

- imports do not natively preserve hosted source chronology in the browsing UI
- the memory list is file-oriented rather than note-oriented
- image uploads are blocked by the memory upload route even though image-processing components exist elsewhere in the codebase
- shade provenance is not exposed in a hosted-like detail page
- the right-side chat panel and note browsing experience do not match the hosted QoL level

## Current local-first constraints

### Exact hosted-model cloning is not available

The repository does not provide a supported path to clone hosted:

- embeddings
- clustering state
- internal ranking state
- trained weights
- hidden memory scoring logic

So the realistic target is **observable parity**, not guaranteed internal equivalence.

### Docker is the recommended Windows path

For this repository on Windows, Docker remains the most practical supported path.

Current compose configuration already persists key local state via bind mounts:

- `./data:/app/data`
- `./logs:/app/logs`
- `./run:/app/run`
- `./resources:/app/resources`

This is good for reconstruction work because SQLite, Chroma, logs, and resources survive container rebuilds.

### Docker import caveat

The repository does **not** currently mount host-side export folders such as:

- `notes/`
- `key-memories/`

So there are three practical ingestion modes:

1. browser upload through the local UI
2. stage files under `resources/raw_content` and use the scan route
3. add explicit read-only Docker mounts for host export folders during development

### Ollama caveat in Docker

When using Ollama with Docker-based Second Me, use:

- `host.docker.internal`

instead of:

- `127.0.0.1`

## Target local experience

The target local experience should reconstruct the hosted product at these layers:

### Layer 1 — Notes

- note title
- note body
- source-created timestamp
- source-modified timestamp
- tags
- memory type
- linked resources/images
- chronological browsing

### Layer 2 — Key Memories

- explicitly prioritized memories
- clear distinction from regular notes
- ability to inspect and update them
- ability to compare key memories against derived note clusters

### Layer 3 — Shade-like abstractions

- generated cluster or node title
- generated long-form description
- related-memory count
- chronological related-note list
- ability to drill from abstraction back to note cards

### Layer 4 — Sync and evolution

- ability to measure local parity qualitatively and eventually quantitatively
- ability to extend the local model after reconstruction without losing provenance

## Phase roadmap

## Phase 0 — Safety and baseline snapshot

Before major import or training changes:

- snapshot `data/sqlite`
- snapshot `data/chroma_db`
- keep exported notes in ignored local folders
- keep the environment private by default (`ENABLE_PUBLIC_NETWORK=false`)

Success criteria:

- local rebuild work can be repeated without losing data unexpectedly
- reset/reimport cycles are operationally safe

## Phase 1 — Metadata-preserving hosted export import

Status: **started**

Objective:

- ingest hosted-export Markdown without treating the YAML frontmatter as note body noise
- preserve source chronology and hosted metadata without requiring a database schema migration

Implemented/targeted behavior:

- detect hosted export frontmatter during upload
- preserve metadata in existing memory metadata storage
- strip frontmatter from stored raw content before downstream analysis
- preserve fields such as source title, source dates, tags, and resource URLs
- expose that metadata in document-list responses
- prefer source-created time during L1 note extraction

Success criteria:

- local note list can be sorted by hosted chronology rather than import time
- imported note cards show real titles and tags instead of only filenames
- hosted-export image/resource links remain visible in note details

## Phase 2 — Note-centric local notes UI

Objective:

- replace the current file-table feel with a note-oriented browsing surface

Planned improvements:

- show source title first, filename second
- default sort by source-created time
- show tags in the list
- show source date and import date separately
- render linked resources in the detail modal/page
- add note filters:
  - tag
  - date range
  - has linked resources
  - text vs image-backed exports

Success criteria:

- the local memory page behaves like a note browser, not just an upload table
- imported hosted notes are visually recognizable as notes with chronology and metadata

## Phase 3 — Shade provenance and hosted-like drilldown

Objective:

- rebuild the hosted node-detail experience where an abstraction can be traced back to a set of note cards

Planned changes:

- persist related-memory provenance for generated shades or clusters
- expose a shade-detail endpoint that returns:
  - title
  - description
  - related-memory count
  - ordered related-note list
- add a local shade detail page/panel

Notes:

- the hosted term "shades" is inferred from the live product UX and local repo concepts
- the public docs do not yet document this exact abstraction surface

Success criteria:

- clicking a local abstraction node opens a hosted-like detail view with chronological related notes

## Phase 4 — Key memories parity

Objective:

- give local users a distinct key-memory layer instead of forcing everything through generic note import

Planned changes:

- detect hosted key-memory exports as a first-class import type
- preserve key-memory ordering and timestamps when available
- add a local key-memory view and editing workflow
- integrate key memories into note and shade exploration

Success criteria:

- local users can browse and maintain a dedicated key-memory layer similar to the hosted product

## Phase 5 — Attachment and image parity

Objective:

- improve support for hosted notes that contain images or other linked resources

Planned changes:

- keep remote resource URLs visible and previewable in note details
- optionally support local caching of remote image resources for stronger offline/local parity
- consider direct image upload support in the local memory route
- if OCR/image import is enabled, install and validate required system packages in Docker

Important distinction:

- linked-resource preservation is easier and lower risk than full binary attachment parity
- image OCR or multimodal analysis is a separate capability from merely preserving note-linked images

Success criteria:

- local note details can display the same kind of linked image/reference context seen in hosted note cards where possible

## Phase 6 — Sync and parity validation

Objective:

- compare the local rebuilt state against the hosted observable state in a repeatable way, then quantify where the local version is already more useful

Validation tracks:

- note count parity
- chronology parity
- tag parity
- linked-resource visibility parity
- qualitative abstraction parity (theme names, note grouping, and summary fit)

Because exact hosted internal state is unavailable, this phase is about **observable parity**, not bit-for-bit identity.

This phase should also identify places where the local product becomes clearly better than hosted, such as:

- more transparent provenance
- better browsing and filtering
- better import control
- better timeline inspection

## Phase 7 — UX quality-of-life improvements

Objective:

- close the most noticeable usability gaps between the local repo and the hosted experience, then move past the hosted app where the local workflow can be more powerful

Planned QoLs:

- collapsible or resizable right chat column
- timeline-focused note browsing
- clearer distinction between source date and import date
- hosted-style node drilldown
- import preview / dry-run
- safer reset/rebuild controls
- optional thumbnails for image-backed notes
- side-by-side note and shade inspection
- better filtering across tags, memory type, linked resources, and time ranges
- explicit provenance display for generated abstractions
- deterministic rebuild tooling and better local operator diagnostics

Success criteria:

- the local app feels clearly better for reconstruction, inspection, and iterative growth than the hosted experience that inspired it

## Docker-first implementation guidance

### Recommended operator workflow on Windows

1. keep exported materials in ignored local folders
2. use browser upload for small batches
3. use `resources/raw_content` or dedicated read-only Docker mounts for bulk import work
4. snapshot data before destructive experiments
5. rebuild the backend container when dependency or import-path changes are made

### Optional compose improvement for bulk reconstruction

For a dedicated reconstruction workflow, add read-only mounts such as:

- `./notes:/app/imports/notes:ro`
- `./key-memories:/app/imports/key-memories:ro`

This keeps exports outside tracked files while making them visible to the backend container.

## Non-goals and honest boundaries

This roadmap does **not** claim that local reconstruction can recover:

- hosted embeddings exactly
- hosted clustering parameters exactly
- hosted model weights exactly
- any undocumented ranking or scoring logic exactly

The aim is:

- source-note fidelity
- chronology fidelity
- strong UI parity
- strong provenance parity
- close abstraction parity
- and eventually a better, more inspectable local UX than the hosted product

## Immediate next implementation steps

1. finish pass-one import fidelity and chronology-preserving note browsing
2. add note metadata filtering and resource-aware detail rendering
3. persist shade-to-note provenance
4. implement a hosted-like shade detail page
5. improve key-memory handling
6. add Docker-assisted bulk-import ergonomics
7. add local-only QoLs that intentionally surpass the hosted UX

## Repository surfaces currently involved

Backend:

- `lpm_kernel/file_data/memory_service.py`
- `lpm_kernel/file_data/document_service.py`
- `lpm_kernel/api/domains/documents/routes.py`
- `lpm_kernel/kernel/l1/l1_manager.py`
- `lpm_kernel/models/l1.py`

Frontend:

- `lpm_frontend/src/service/memory.ts`
- `lpm_frontend/src/utils/memory.ts`
- `lpm_frontend/src/app/dashboard/train/memories/page.tsx`
- `lpm_frontend/src/components/train/MemoryList.tsx`
- future shade/node UI surfaces to be identified or added

Deployment/runtime:

- `docker-compose.yml`
- `Dockerfile.backend`
- local `.env`

## Summary

The hosted product appears to be a note-first memory system with key-memory prioritization, topic/abstraction generation, and provenance back to chronological notes. The local repository already contains part of the underlying pipeline, but it needs explicit import fidelity, note-centric UI improvements, shade provenance, and Docker-aware reconstruction ergonomics to reach hosted parity first and then intentionally surpass the live app in local-first UX and control.

# Local Note and Shade Enhancement Roadmap

_Last updated: 2026-04-05_

This roadmap picks up **after** the current hosted-like note and shade provenance milestone.

## Current baseline

The following is now in place and validated in this repository:

- hosted-export metadata is preserved through import and exposed to the frontend
- the local memory page shows note-oriented fields such as title, tags, source dates, and linked resources
- the local memory page now includes real note-browsing controls for text search, tag/date/type/resource filtering, and source-date versus import-date sorting
- direct file and folder uploads now generate an import preview before commit, including duplicate, conflict, and malformed-export warnings
- the backend now exposes a dry-run scan preview for staged files under the configured raw-content directory
- the training page includes a biography snapshot plus shade cards
- a shade detail drawer can drill from a generated shade back to chronological note provenance
- the frontend Docker production build passes on Windows/Docker again

Evidence from the latest validated Docker frontend build:

- route `/dashboard/train/memories` builds successfully
- route size is `28.7 kB`
- first-load JS for that route is `296 kB`
- route `/dashboard/train/training` builds successfully
- route size is `170 kB`
- first-load JS for that route is `707 kB`
- the repo still carries a broad ESLint warning backlog outside the newly cleaned surfaces

## What should happen next

With filterable note browsing and import preview safety now landed, the next recommended milestone remains the shade drilldown workflow.

### 1. Tighten the shade drilldown workflow

**Why this is next:** the drawer works, but navigation is still one-shade-at-a-time and a bit modal-heavy.

Scope:

- deep-link directly to a selected note from a timeline entry
- jump from a note back to other related shades when applicable
- add next/previous shade navigation within a version
- support split-view or side-by-side note-and-shade inspection
- show clearer cluster provenance summaries at the top of the drawer

Success criteria:

- provenance navigation feels continuous instead of repeatedly opening and closing drawers/modals
- a user can compare multiple related notes and shades without losing context

Likely surfaces:

- `lpm_frontend/src/components/train/shades/GlobalBioPanel.tsx`
- `lpm_frontend/src/components/train/shades/ShadeDetailDrawer.tsx`
- `lpm_frontend/src/app/dashboard/train/training/page.tsx`
- `lpm_kernel/api/domains/kernel/routes.py`

### 2. Add key-memory parity

**Why this is still missing:** the hosted product distinguishes notes from key memories, but the local reconstruction flow still treats everything as generic note material.

Scope:

- detect and preserve hosted key-memory exports as a first-class type
- add a dedicated key-memory list/view
- let users compare key memories against generated shades and biography content
- preserve ordering and timestamps when available

Success criteria:

- local users can inspect what was explicitly prioritized versus what was inferred by clustering/summarization

Likely surfaces:

- import metadata handling in `lpm_kernel/file_data/memory_service.py`
- document/memory API serialization
- new frontend view(s) under `lpm_frontend/src/app/dashboard/train/`

### 3. Improve attachment and image parity

**Why this follows key memories:** linked resources already survive import better than before, but the UX is still basic.

Scope:

- stronger image thumbnails in note and shade detail views
- optional local caching for remote image resources
- clearer handling of broken remote links
- only consider direct image upload support after Docker/runtime dependencies are validated

Success criteria:

- image-backed hosted notes remain useful locally instead of degrading into plain links

Likely surfaces:

- `lpm_frontend/src/components/train/MemoryList.tsx`
- `lpm_frontend/src/components/train/shades/ShadeDetailDrawer.tsx`
- backend import/resource handling where needed

### 4. Keep private/public mode behavior aligned

**Why this deserves a roadmap slot:** the repo now has meaningful private-mode behavior, but this area spans backend flags, frontend env injection, docs, and operator expectations.

Scope:

- keep `ENABLE_PUBLIC_NETWORK` as the documented operator-facing knob
- ensure frontend and backend continue to agree on private/public behavior
- add a focused smoke test for private-mode UI gating and public-mode re-enable flow
- clean up any stale docs or UI copy that imply the wrong environment variable or the wrong surface

Success criteria:

- one documented switch controls the behavior users expect
- local-first mode stays predictable on Docker-first Windows setups

Likely surfaces:

- `.env`
- `docker-compose.yml`
- `lpm_frontend/next.config.js`
- `lpm_frontend/src/utils/networkMode.ts`
- `lpm_kernel/api/common/feature_flags.py`
- relevant docs under `docs/`

### 5. Reduce warning and bundle debt selectively

**Why this is last:** the build is green, and the remaining warning field is too broad to justify a repo-wide style crusade right now.

Scope:

- target high-signal warnings first:
  - stale hook dependencies
  - unnecessary conditionals
  - incorrect handler naming in high-traffic flows
  - `any` usage in service boundaries and frequently touched UI surfaces
- shrink the training page payload where practical
- consider lazy loading or route-level splitting for the shade and training surfaces

Success criteria:

- fewer correctness-adjacent warnings in active surfaces
- lower cost for iterating on `/dashboard/train/training`
- no large formatting-only churn

Likely surfaces:

- `lpm_frontend/src/app/dashboard/train/training/page.tsx`
- `lpm_frontend/src/components/train/`
- shared service/store/layout files emitting repeated warnings

## Recommended execution order

If the goal is maximum product value per unit of effort, the order should be:

1. shade workflow improvements
2. key-memory parity
3. attachment and image parity
4. private/public mode alignment checks
5. selective warning and bundle cleanup

## Honest boundaries

This roadmap still does **not** assume exact hosted parity for:

- embeddings
- clustering internals
- ranking heuristics
- trained weights

The practical goal remains:

- better source-note fidelity
- better provenance inspection
- safer local reconstruction
- and a local-first UX that becomes more transparent than the hosted reference

## Short version

If only one enhancement gets funded next, it should be **faster shade navigation**.

If two get funded, do **faster shade navigation + key-memory parity**.

If three get funded, add **attachment and image parity** before chasing broader cleanup work.

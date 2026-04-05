# Importing Hosted Memories into Local Second Me

This guide is for the common situation where you already used the hosted Second Me web app, but now want to run your own local copy privately and understand how it learns before enabling any public sharing.

## The important limitation first

The current repository does **not** provide a one-click way to pull the hosted app's already-learned internal state into your local instance.

What the local app can import today is your **memory source material**, such as:

- plain text notes
- Markdown files
- PDF files
- folders that contain those files

So the practical workflow is:

1. export or collect the memory material you originally gave the hosted app
2. convert it into local files when needed
3. upload those files into your local Second Me
4. retrain locally

That means you are rebuilding the local model's understanding from your source memories, not cloning the hosted model state.

## Keep the local copy private while you learn

This repository now supports **private-by-default** runtime behavior.

In your local `.env`, keep:

```env
ENABLE_PUBLIC_NETWORK=false
```

With that setting, local training and local memory upload still work, but public upload registration, public role sharing, and public space sharing stay disabled until you explicitly opt in later.

## Recommended Windows setup

For Windows, prefer Docker unless you have already verified a native setup for your machine.

### Should you install Docker Desktop?

Yes.

For this repository, Docker Desktop is the most practical Windows-first path because:

- the repo's local workflow is already wired for Docker Compose
- the backend and frontend are split into separate services
- several non-Docker local scripts are shell-oriented rather than Windows-native

Recommended setup:

- Docker Desktop for Windows
- WSL2 backend enabled in Docker Desktop
- enough RAM allocated to Docker for your model and training workflow

After installation, verify that Docker is available:

```bash
docker --version
docker compose version
```

### Prerequisites

- Docker Desktop installed and running
- enough RAM allocated to Docker for your model and training workflow

## Start the app locally

From the repository root:

### Option A: direct Docker Compose (recommended on Windows)

```bash
docker compose -f docker-compose.yml up --build -d
```

### Option B: using `make` if you already have it installed

```bash
make docker-up
```

Then open:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8002`

The frontend root URL rewrites to `/home`, so opening `http://localhost:3000` directly is the correct entry point.

## Exact first local session in the interface

Once the containers are up, this is the actual UI flow to get from first launch to local chat.

### 1. Open the landing page

Open:

- `http://localhost:3000`

You will see either:

- **Create my Second Me**
- or **Continue as ...** if you already created a local identity before

### 2. Create your local identity

If this is your first run:

1. click **Create my Second Me**
2. complete or dismiss the onboarding tutorial
3. fill in:
   - **Second Me Name**
   - **Short Personal Description**
   - **Email of Second Me**
4. click **Create**

Notes from the current UI validation rules:

- the name must be 2-20 characters
- the name cannot contain spaces
- the email must be a valid email address

### 3. Confirm identity details

After creation, the app routes into the dashboard and opens:

- **Create Second Me** → **Define Your Identity**

You can edit and save your identity details there, then click:

- **Next: Upload Memories**

### 4. Upload your first memory batch

The next page is:

- **Create Second Me** → **Upload Your Memory**

Available input methods:

- **Text**
- **File**
- **Folder**

For the first run, a good starting batch is:

- 1 short bio or self-description file
- 1 file with preferences, values, or communication style
- 1 file with current goals, projects, or ongoing priorities
- optionally a few more high-signal notes or reflections

For a first pass, avoid importing a giant raw conversation dump all at once. It makes it much harder to tell which inputs actually improved the model.

### 5. Start training

Click:

- **Next: Training**

The training page requires at least 3 memories before the UI will let you proceed.

For a first run, prefer a smaller base model if your hardware is uncertain, such as:

- `Qwen2.5-0.5B-Instruct`
- `Qwen2.5-1.5B-Instruct`

Then click:

- **Start Training**

Wait for the progress and log panels to finish.

### 6. Review the imported notes and generated shades

Before jumping straight into chat, inspect what the local app actually reconstructed from your imports.

Two places matter here:

1. **Create Second Me → Upload Your Memory**
   - review the imported note list
   - open note details to check titles, tags, source dates, and linked resources
2. **Create Second Me → Training**
   - review the generated biography snapshot
   - open the shade cards to inspect chronology and related-note provenance

This is especially useful for hosted-memory imports because it lets you verify that:

- note chronology survived the import
- note titles and tags look sensible
- linked resources are still visible
- generated shades can be traced back to the note cards that produced them

### 7. Start the local model service

After training completes, use the control in the top header bar:

- **Start Service**

This step is separate from training. Training prepares the model; **Start Service** makes it available for chat.

### 8. Open local chat

Once the service is running, go to:

- **Playground** → **Chat Mode**

That is the main local interface for checking whether the model learned anything useful from your imported memories.

## Import memories through the local interface

After the app starts:

1. open `http://localhost:3000`
2. create a local Second Me, or continue an existing local one
3. go to **Create Second Me** → **Upload Your Memory**
4. use one of the supported upload methods:
   - **Text** — paste memory content directly
   - **File** — upload one supported file
   - **Folder** — upload a folder containing supported files

### Supported file types

The current backend accepts only:

- `.txt`
- `.md`
- `.pdf`

The current UI also shows **Software Integration**, but that option is not active yet in this repository.

## Best workflow for memories that already exist in the hosted version

### If the hosted product gives you exports

Use them.

Good local targets are:

- one `.md` file per note or memory group
- one `.txt` file per journal, chat export, or reflection batch
- `.pdf` only when you already have the material in PDF and do not want to convert it

Then upload them through the local memory page.

### If the hosted product does not give you exports

Use a manual fallback:

- copy important memories into the **Text** tab
- or paste them into local `.md` / `.txt` files first and upload those

This is slower, but it is the supported path in the current codebase.

## Suggested migration strategy

Do **not** dump everything into the local copy at once unless you really trust the export quality.

Instead:

1. start with a small representative memory set
2. train locally
3. chat with the local model
4. observe what it captures well and what it misses
5. add more memories in batches

This makes it much easier to understand how your local Second Me is learning.

## Five questions to ask after the first training run

After training and starting the service, ask the same questions each time you add a new memory batch.

Suggested questions:

1. `Who am I, in your current understanding?`
2. `What are my main priorities right now?`
3. `What tone should you use with me?`
4. `What topics, work, or interests seem most important to me?`
5. `What are you still uncertain about or missing about me?`

The fifth question is especially useful because it reveals whether the model can identify gaps instead of pretending to know everything.

## Advanced manual import path

If you want to prepare files outside the UI first, the repository also supports scanning a local raw-content directory.

Your current `.env` points the raw memory directory to:

- `resources/raw_content`

That directory is already ignored from git, which is useful because this repository is a public fork.

An advanced manual flow is:

1. place your `.txt`, `.md`, or `.pdf` files into `resources/raw_content`
2. call the scan route:
   - `POST /api/documents/scan`
3. verify imported items in:
   - `GET /api/documents/list`

For most users, the UI upload flow is simpler. Use the scan route only if you want to stage files in bulk outside the browser.

## Relevant local endpoints

### Memory upload

- `POST /api/memories/file`

### Document list

- `GET /api/documents/list`

### Directory scan

- `POST /api/documents/scan`

### Local chat API

- `POST /api/kernel2/chat`

The local chat API is documented in:

- `docs/Local Chat API.md`

## Common issues

### Unsupported format

If upload fails immediately, check the extension first. The backend currently allows only:

- `txt`
- `md`
- `pdf`

### Duplicate file error

If you upload the same file again, the backend can reject it as already existing.

### Embedding or server errors

If you hit embedding-related failures, check:

- `EMBEDDING_MAX_TEXT_LENGTH` in `.env`
- local Chroma state under `data/chroma_db`

See also:

- `docs/Embedding Model Switching.md`
- `docs/Custom Model Config(Ollama).md`

## Public-fork safety reminder

Because this repository is a public fork:

- do **not** commit raw exported memories
- do **not** paste private journals, chats, or personal source files into tracked docs
- keep personal files in ignored local directories such as `resources/raw_content`

## When you are ready to go public

Only after you are comfortable with how the local system behaves, change:

```env
ENABLE_PUBLIC_NETWORK=true
```

Then restart the app.

That enables the public-network features again, but only when **you** choose to do it.
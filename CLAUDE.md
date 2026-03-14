# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js 15 + Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest (jsdom environment)
npm run setup     # Install deps + generate Prisma client + run migrations
npm run db:reset  # Reset SQLite database (destructive)
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates and edits them in a virtual file system; the result renders live in a sandboxed iframe.

### Data Flow

```
Chat input → /api/chat (streaming, Vercel AI SDK)
           → Claude AI (or MockLanguageModel if no API key)
           → Tool calls (str_replace_editor, file_manager)
           → VirtualFileSystem (in-memory, Map-based)
           → FileSystemContext refresh trigger
           → PreviewFrame: JSX → Babel → import map → iframe.srcdoc
```

### Key Modules

- **`src/lib/file-system.ts`** — In-memory virtual file system. All AI-generated files live here; nothing writes to disk. Provides `viewFile`, `replaceInFile`, `insertInFile`, serialize/deserialize.

- **`src/lib/provider.ts`** — Returns `getLanguageModel()`: real Claude (`claude-sonnet-4-5`) if `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel` that generates demo components. Mock has 4 max steps; real Claude has 40.

- **`src/lib/tools/`** — AI tools exposed to Claude:
  - `str_replace.ts`: text editor commands (view, create, str_replace, insert)
  - `file_manager.ts`: file operations (create, delete, rename)

- **`src/lib/transform/jsx-transformer.ts`** — Compiles JSX → JS via Babel Standalone, creates ESM import maps (modules resolved from esm.sh CDN), strips CSS imports.

- **`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK's `useChat`, handles tool call dispatch.

- **`src/lib/contexts/file-system-context.tsx`** — Global VirtualFileSystem state; tracks selected file and preview refresh triggers.

- **`src/components/preview/PreviewFrame.tsx`** — Sandboxed iframe rendering. Auto-detects entry point (`App.jsx`, `index.jsx`, etc.), builds `srcdoc` with import map and Babel-compiled blobs.

- **`src/lib/auth.ts`** — JWT session management via `jose`. Sessions stored in httpOnly cookies (7-day expiry). Passwords hashed with bcrypt.

- **`src/actions/`** — Next.js Server Actions for auth (`signUp`, `signIn`, `signOut`) and project CRUD.

### Database

Prisma + SQLite (`prisma/dev.db`). Schema is defined in `prisma/schema.prisma` — reference it to understand data structures. Two models:
- `User`: email/password auth
- `Project`: stores `messages` and `data` (virtual FS) as JSON strings

Projects are persisted only for authenticated users. Anonymous users work in local state only.

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Environment

The app runs without an Anthropic API key (mock mode). To enable real AI generation, set `ANTHROPIC_API_KEY` in `.env`.

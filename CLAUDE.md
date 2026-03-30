# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured.

## Architecture

A Kanban board SPA with Supabase as the backend (auth + PostgreSQL).

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Nova preset), TanStack Query v5, dnd-kit, Supabase.

**Routing:** `App.tsx` uses plain React state to switch between three views: `AuthPage` → `BoardSelector` → `KanbanBoard`. TanStack Router is installed but unused (only appears in `src/routes/index.tsx`, which is legacy).

**Data fetching:** All server state lives in TanStack Query. Hooks are in `src/hooks/`:
- `useAuth` — Supabase session + signUp/signIn/signOut
- `useBoards` / `useCreateBoard` — board CRUD
- `useCards` / `useCreateCard` / `useMoveCard` — card CRUD; `useMoveCard` uses optimistic updates with rollback
- `useProfile` / `useUpdateProfile` — profile management

**Supabase types** are defined in `src/lib/supabase.ts` alongside the client initialization. The three main tables are `profiles`, `boards`, and `cards`. RLS is enabled on all tables — users only access their own data.

**Drag and drop:** `KanbanBoard.tsx` owns the DndContext with PointerSensor. Columns use `useDroppable`, cards use `useSortable` from dnd-kit. Card position order is stored in the `position` column on the `cards` table.

**Styling:** Tailwind v4 with no separate `tailwind.config.ts` — theme customization lives in `src/index.css`. The `cn()` utility (`src/lib/utils.ts`) combines clsx + tailwind-merge. Path alias `@` maps to `src/`.

**Database migrations** are in `supabase/migrations/`. The schema auto-creates a `profiles` row via trigger on `auth.users` insert.

## Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

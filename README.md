# Tanstack Kanban

A full-stack Kanban board application built with React, TypeScript, TanStack Query, TanStack Router, Supabase, shadcn/ui, and dnd-kit.

## Features

- 🔐 Email/password authentication
- 📋 Multiple boards per user
- 🗂️ Three-column Kanban layout (Todo, In Progress, Done)
- 🖱️ Drag and drop cards between columns
- 💾 Real-time persistence with Supabase
- 🌙 Dark mode UI with shadcn/ui Nova preset

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Routing**: TanStack Router
- **Data fetching**: TanStack Query
- **Database & Auth**: Supabase (PostgreSQL)
- **UI**: shadcn/ui, Tailwind CSS v4
- **Drag and drop**: dnd-kit

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/tanstack-kanban.git
cd tanstack-kanban
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
3. Go to **Authentication → Providers → Email** and make sure email auth is enabled
4. Go to the **SQL Editor** and run the migration files in order from `supabase/migrations/`

### 4. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the database migrations

In your Supabase project go to the **SQL Editor** and run each file in `supabase/migrations/` in chronological order:

1. `*_initial_schema.sql` — creates boards, cards tables and RLS policies
2. `*_add_profiles.sql` — creates profiles table and auto-create trigger

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/         # React components
│   ├── ui/            # shadcn/ui base components
│   ├── AuthPage.tsx   # Login and signup forms
│   ├── BoardSelector.tsx  # Board list and creation
│   ├── KanbanBoard.tsx    # Main board view with DnD
│   ├── KanbanColumn.tsx   # Individual column
│   └── KanbanCard.tsx     # Draggable card
├── hooks/              # TanStack Query hooks
│   ├── useAuth.ts     # Auth state and methods
│   ├── useBoards.ts   # Board CRUD operations
│   └── useCards.ts    # Card CRUD operations
├── lib/
│   └── supabase.ts    # Supabase client and types
└── App.tsx            # Root component and auth routing
supabase/
└── migrations/        # Database migration SQL files
```

## Database Schema

```sql
-- Users are managed by Supabase Auth
-- profiles extends auth.users with display name
profiles (id, full_name, email, avatar_url, created_at)

-- Boards belong to a user
boards (id, title, user_id, created_at)

-- Cards belong to a board
cards (id, board_id, column_name, title, description, position, created_at)
```

## Environment Variables

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Contributing

Pull requests are welcome. For major changes please open an issue first.

## License

MIT

```

Also create `.env.example` in your project root:
```

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

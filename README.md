# my-procedures-2

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **tRPC** - End-to-end type-safe APIs
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM and Supabase for realtime synchronization.

1. Make sure you have a PostgreSQL database set up with Supabase.
2. Update your `apps/web/.env` file with your PostgreSQL connection details and Supabase credentials:

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Apply the schema to your database:

```bash
bun run db:push
```

### Supabase Realtime Setup

To enable cross-device realtime synchronization, you need to enable Realtime replication in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for the following tables:
   - `todo`
   - `folder`
   - `subtask`
4. Select events: **INSERT**, **UPDATE**, **DELETE**
5. Click **Save**

The app uses Supabase Realtime subscriptions to instantly sync changes across multiple browser tabs and devices. Mutations still go through tRPC for type safety, while Realtime provides automatic cache updates.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:4757](http://localhost:4757) in your browser to see the fullstack application.

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Format and lint fix: `bun run check`

## Project Structure

```
my-procedures-2/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting

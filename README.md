# Snap — Receipt Organiser

Snap, tag and remember your receipts. Upload a photo and AI extracts the vendor, total, date and line items automatically.

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** OpenAI GPT-4o Vision (via Supabase Edge Function)

## Getting started

### Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Local development

```sh
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs on http://localhost:8080.

### Environment variables

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

### Edge Function secrets

The `process-receipt` Edge Function requires an OpenAI API key. Set it via the Supabase CLI or dashboard:

```sh
supabase secrets set OPENAI_API_KEY=sk-...
```

Or in the Supabase Dashboard → Project Settings → Edge Functions → Secrets.

### Deploying Edge Functions

```sh
supabase functions deploy process-receipt
```

### Database migrations

```sh
supabase db push
```

## Project structure

```
src/
  pages/          Route-level screens
  components/     Feature components + ui/ (shadcn design system)
  hooks/          Custom React hooks
  lib/            Utilities
  integrations/
    supabase/     Supabase client + generated types
supabase/
  functions/      Edge Functions (Deno)
  migrations/     SQL schema migrations
```

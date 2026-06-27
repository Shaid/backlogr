# Backlogr

A personal catalog app for tracking everything you own. Built with Next.js, Prisma, and SQLite.

## Features

- **Full-text search** across items, tags, categories, and locations
- **Multi-image support** with drag-and-drop upload, reordering, and hero image selection
- **Mobile camera capture** — take photos directly from your phone
- **Barcode scanner** — scan barcodes using your device camera (UPC, EAN, ISBN)
- **Automatic enrichment** — scrapes HLJ, Open Food Facts, and other sources for product data and market prices
- **Markdown** in descriptions and notes (GFM supported)
- **Tags** — flexible tagging with comma-separated input
- **Sortable list & grid views** — toggle layout, sort by any column
- **Authentication** — GitHub + Google OAuth via NextAuth.js v5
- **RBAC** — four roles: admin, editor, viewer, owner (per-item ownership)
- **Admin panel** — monitor enrichment status, retry failed lookups, manage users
- **Dark mode** with teal accent theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | SQLite via Prisma 7 + LibSQL adapter |
| Auth | NextAuth.js v5 (Auth.js) |
| UI | shadcn/ui, Tailwind CSS v4, Radix |
| Linter | Biome |
| Tests | Jest |
| Icons | Lucide React |
| Font | DM Sans + DM Mono |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example and fill in your OAuth credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GITHUB_ID="your-github-oauth-app-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-client-secret"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
```

> Generate `AUTH_SECRET` with: `openssl rand -base64 32`

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first user to sign in is automatically promoted to **admin**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run Biome linter |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Jest tests |

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin panel (enrichment status, user management)
│   ├── api/
│   │   ├── auth/       # NextAuth.js routes
│   │   └── items/      # REST API (CRUD, images, enrichment)
│   ├── auth/signin/    # Sign-in page
│   ├── items/          # Item detail + edit pages
│   └── page.tsx        # Main catalog (grid/list views)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── barcode-scanner.tsx
│   ├── image-upload.tsx
│   ├── item-card.tsx
│   └── item-form.tsx
├── lib/
│   ├── actions.ts      # Server actions + enrichment pipeline
│   ├── auth.ts         # NextAuth.js config
│   ├── authz.ts        # Authorization helpers
│   ├── db.ts           # Prisma client
│   ├── files.ts        # File upload/delete utilities
│   ├── permissions.ts  # RBAC permission logic
│   └── tags.ts         # Tag resolution
└── types/              # TypeScript type definitions
```

## Roles & Permissions

| Role | View | Create | Edit Own | Edit All | Delete Own | Delete All | Admin Panel |
|------|------|--------|----------|----------|------------|------------|-------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| editor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| owner | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Enrichment Pipeline

When an item is created with a barcode or name, the background enrichment system:

1. **Open Food Facts** — looks up food/household products by barcode
2. **HLJ (Hobby Link Japan)** — searches for model kits via DuckDuckGo → scrapes product pages
3. **UPCitemdb / eBay** — price lookups for market value estimates

Enrichment status is visible on each item and in the admin panel, where failed lookups can be retried.

## Security

- SSRF protection on all outbound image fetches (blocks private IPs, validates redirects)
- Path traversal protection on file uploads/deletes
- File type + size validation (image MIME allowlist, 10MB max)
- Fetch timeouts (8s) on all external requests
- Input sanitization on API routes
- Per-item ownership enforcement in RBAC

## License

Private project.

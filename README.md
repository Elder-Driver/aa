# AA

A lightweight trip expense splitter for groups. Create a book, invite friends,
record expenses, split by selected participants, and settle with the fewest
transfers.

## Features

- Defaults to USD, with common currency options
- Chinese-first UI with an English switch
- Invite-link based joining, no email accounts
- Equal or custom splits
- Partial participant splits
- Settlement recording
- Cloudflare D1 persistence

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Cloudflare Git deployment

Create a Worker from GitHub and select this repository.

Recommended settings:

- Repository: `Elder-Driver/aa`
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Node version: `22` or newer

Create a Cloudflare D1 database first, then add these environment variables in
the Worker Git deployment settings:

```text
D1_DATABASE_NAME=aa-db
D1_DATABASE_ID=<your Cloudflare D1 database id>
ADMIN_KEY=<a private admin password>
```

The D1 binding name used by the app is `DB`. The build reads the real database
ID from `D1_DATABASE_ID` and writes it into the generated Wrangler deploy
configuration.

Database schema changes live in `drizzle/`. Commit migrations before deploying
schema changes.

## Admin cleanup

Visit `/admin` and enter `ADMIN_KEY` to review stored books. The admin page can
delete a single book, or bulk-delete empty books older than a chosen number of
days. It does not automatically remove active books.

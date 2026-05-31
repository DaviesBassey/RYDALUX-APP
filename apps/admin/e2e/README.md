# RYDALUX Admin Dashboard Smoke Tests

Automated smoke tests to verify render health, check routing stability, and prevent client-side exception / HTTP 500 regressions across the Rydalux Admin console.

## Prerequisites

Playwright runs in headless Chromium mode by default. You will need to install the browser binary before running the tests:

```bash
pnpm exec playwright install chromium
```

## Running Tests

### 1. Locally (Against Next.js Dev Server)
Ensure the backend API services and frontend dev server are running:

```bash
# Start backend API (if running locally)
pnpm start:api

# Start Next.js admin app on port 3000
pnpm start:admin
```

Set E2E environment variables and execute the smoke test command:

```bash
export ADMIN_E2E_BASE_URL="http://localhost:3000"
export ADMIN_E2E_EMAIL="admin@rydalux.local"
export ADMIN_E2E_PASSWORD="LocalAdminPass123!"

pnpm --filter @rydulux/admin run test:admin:smoke
```

### 2. Against Staging / Vercel (Production/Preview)
You can point the smoke tests directly to any live Vercel Preview or production URL:

```bash
export ADMIN_E2E_BASE_URL="https://admin-rydalux.vercel.app" # Replace with your Vercel URL
export ADMIN_E2E_EMAIL="super-admin@staging.rydalux.local"
export ADMIN_E2E_PASSWORD="YourSecretStagingPassword123!"

pnpm --filter @rydulux/admin run test:admin:smoke
```

## Smoke Test Asserts
The smoke tests navigate to `/login`, perform authentications, and visit all `/dashboard` routes sequentially.
The test suite will instantly fail if a page:
- Is entirely blank (blank `body`).
- Contains client-side rendering exception keywords (e.g. `"Application error"`, `"client-side exception"`).
- Contains server exceptions or status errors (e.g. `"HTTP 500"`, `"Failed to load"`, `"Cannot GET"`, `"Internal Server Error"`).

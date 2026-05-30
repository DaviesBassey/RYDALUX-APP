# RYDALUX CI/CD Policy and Runbook

## 1. Purpose
This document outlines the Continuous Integration (CI) and Continuous Deployment (CD) strategy for the Rydalux monorepo. Currently, the repository is configured strictly for Continuous Integration to ensure codebase health on every Pull Request and main branch commit. Production deployment workflows are planned for a future phase.

## 2. Workflow Triggers
The CI workflow (`.github/workflows/ci.yml`) executes automatically on the following events:
- **Pull Requests**: Whenever a new PR is opened, updated, or reopened against any branch.
- **Push to Main**: Any direct commit or merged PR into the `main` branch.

## 3. Required Jobs
The pipeline performs the following validation steps sequentially on a Linux runner (`ubuntu-latest`):
- **Dependency Installation**: Uses `pnpm` (via Corepack) with global store caching for faster consecutive builds.
- **Prisma Generation**: Generates the Prisma client used across the workspace.
- **API Build**: Compiles the NestJS backend ensuring there are no TypeScript syntax errors.
- **API Unit Tests**: Runs the API unit test suite.
- **Admin Build**: Builds the Next.js admin dashboard to verify page compilation and static generation.
- **Mobile Typecheck**: Performs a `tsc` validation on the React Native Expo app without emitting files.

## 4. Local Commands Equivalent to CI
Developers can verify their changes locally by running the exact commands used by the CI pipeline:
```bash
# 1. Install dependencies
pnpm install

# 2. Build API
pnpm --filter @rydulux/api-services-local build

# 3. Run API Unit Tests
pnpm --filter @rydulux/api-services-local test -- --detectOpenHandles --runInBand

# 4. Build Admin
pnpm --filter @rydulux/admin build

# 5. Mobile Typecheck
pnpm --filter @rydulux/mobile exec tsc -p tsconfig.json --noEmit
```

## 5. Integration Test Policy
**Integration tests are excluded from the default CI workflow.** These tests require a fully functional Postgres database, applied migrations, and possibly Redis. 
- **Future CI Implementation**: In the future, a dedicated `integration-tests` CI job may be added, spinning up Docker containers via `services` in GitHub Actions.
- **Manual Verification**: To run integration tests locally, ensure your `DATABASE_URL` is set, your database is running, and migrations are applied, then run:
  ```bash
  # Example command for integration testing (modify based on local scripts)
  pnpm --filter @rydulux/api-services-local run test:e2e
  ```

## 6. Staging Deployment Future Plan
While the CI verifies application code integrity, automated CD to the staging environment is pending.
The intended flow will securely deploy validated `main` branch artifacts (Docker images for API, Vercel/Next for Admin, Expo EAS for mobile) via isolated deployment workflows.

## 7. Secrets Policy
**Under no circumstances should real production secrets, API keys, or live billing credentials be added to CI variables.** 
- Unit tests use mock values.
- Future deployment workflows will pull credentials securely from a vault or GitHub Secrets configured with strict environment protection rules.

## 8. Troubleshooting Common CI Failures
- **TypeScript Errors (API/Mobile)**: Ensure your local `tsconfig.json` settings match the CI environment. Run the typechecks locally first.
- **Missing Prisma Types**: If tests fail complaining about missing schemas or types, ensure you ran `pnpm --filter @rydulux/prisma generate`.
- **Cache Issues**: If dependencies seem mismatched despite updates, try triggering a workflow run without utilizing the `actions/cache` by modifying the cache key temporarily, or manually re-running all jobs.

## 9. Branch Protection Recommendations
To enforce codebase quality, it is strongly recommended to set up the following GitHub branch protection rules for `main`:
1. **Require status checks to pass before merging**: Require the `Build & Test` CI job to pass.
2. **Require a pull request before merging**: Enforce peer review on all code changes.
3. **Block direct pushes**: Ensure all commits to `main` go through a verified pull request.
4. **Protect deployment workflows**: Ensure staging/production CD workflows can only be modified by project admins.
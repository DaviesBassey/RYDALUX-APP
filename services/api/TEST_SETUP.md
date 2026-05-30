# RYDALUX API Test Setup

## Test Classification

The API test suite is organized into three categories:

### 1. Unit Tests (Default)
- **Location:** `test/**/*.spec.ts` (excluding `test/integration/`)
- **Configuration:** `jest.config.ts`
- **Dependencies:** Mocked external services (database, APIs, etc.)
- **Run with:** `npm test` or `corepack pnpm test`
- **Status:** Should always pass in CI/CD pipeline
- **Example:** `test/auth.service.spec.ts`, `test/users.service.spec.ts`

### 2. Integration Tests
- **Location:** `test/integration/**/*.integration-spec.ts`
- **Configuration:** `jest-integration.json`
- **Dependencies:** Real PostgreSQL database (requires DATABASE_URL)
- **Run with:** `npm run test:integration` or `DATABASE_URL="postgresql://..." npm run test:integration`
- **Status:** Requires local database setup
- **Example:** `test/integration/shipments-phase-3.integration-spec.ts`

**Integration tests verify:**
- Actual database operations and schema integrity
- Service interactions with Prisma ORM
- Data persistence and retrieval
- Transaction handling and constraints

### 3. End-to-End Tests
- **Location:** `test/**/*.e2e-spec.ts`
- **Configuration:** `jest-e2e.json`
- **Dependencies:** Full API running, external services
- **Run with:** `npm run test:e2e`
- **Status:** Validates complete API workflows
- **Example:** `test/app.e2e-spec.ts`

## Running Tests

### Default Unit Tests (CI/CD)
```bash
# Recommended for CI/CD pipelines - no external dependencies
npm test
# or
corepack pnpm --filter @rydulux/api-services-local test -- --detectOpenHandles --runInBand
```

### Integration Tests (Local Development)
```bash
# Requires a running PostgreSQL database
export DATABASE_URL="postgresql://user:password@localhost:5432/rydalux_test"
npm run test:integration

# Or in one command:
DATABASE_URL="postgresql://user:password@localhost:5432/rydalux_test" npm run test:integration
```

### All Tests (Full Suite)
```bash
# Runs unit tests, integration tests, and e2e tests
npm run test:all
```

### Individual Test Files
```bash
# Run a specific unit test
npm test -- shipments.service.spec.ts

# Run a specific integration test
npm run test:integration -- shipments-phase-3.integration-spec.ts
```

## Setting Up Local Database for Integration Tests

### Option 1: Using Docker
```bash
# Start PostgreSQL container
docker run --name rydalux-test-db \
  -e POSTGRES_DB=rydalux_test \
  -e POSTGRES_USER=rydalux \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Run migrations
DATABASE_URL="postgresql://rydalux:password@localhost:5432/rydalux_test" npx prisma migrate deploy

# Run integration tests
DATABASE_URL="postgresql://rydalux:password@localhost:5432/rydalux_test" npm run test:integration
```

### Option 2: Using Existing Local PostgreSQL
```bash
# Ensure PostgreSQL is running and create test database
createdb rydalux_test

# Set DATABASE_URL and run migrations
export DATABASE_URL="postgresql://localhost/rydalux_test"
npx prisma migrate deploy

# Run integration tests
npm run test:integration
```

## Shipment Module Integration Tests

### Location
`test/integration/shipments-phase-3.integration-spec.ts`

### What They Test
These integration tests verify the critical database operations for the Shipment module:

1. **ShipmentOtpService Integration Tests** (4 tests)
   - OTP generation with bcrypt hashing (not storing raw codes)
   - OTP verification against stored hashes
   - OTP reuse prevention
   - Failed attempt tracking

2. **ShipmentQuoteService Integration Tests** (2 tests)
   - Quote creation with fare calculation
   - Quote expiry validation
   - Quote acceptance tracking

3. **ShipmentStateMachine Tests** (6 tests)
   - Valid state transitions in the 13-state lifecycle
   - Invalid transition rejection
   - Terminal state identification
   - Cancellation rule enforcement
   - Full lifecycle path validation

### Running Shipment Integration Tests
```bash
# With local database
export DATABASE_URL="postgresql://user:password@localhost:5432/rydalux_test"
npm run test:integration

# Or specifically:
npm run test:integration -- shipments-phase-3.integration-spec.ts
```

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 90%+ | ✓ 219 passing |
| Integration Tests | 80%+ | 12 tests (shipment module) |
| E2E Tests | Core flows | ✓ Passing |

## Troubleshooting

### Integration Tests Failing with "DATABASE_URL not found"
**Solution:** Set the DATABASE_URL environment variable before running:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/rydalux_test"
npm run test:integration
```

### Database Connection Refused
**Solution:** Ensure PostgreSQL is running:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Or start it
docker start rydalux-test-db
```

### "Relation does not exist" errors
**Solution:** Run Prisma migrations:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/rydalux_test"
npx prisma migrate deploy
```

## CI/CD Pipeline

The default `npm test` command runs only unit tests and should always pass in CI/CD environments without requiring a database. Integration and E2E tests are manual/optional for local development and specific CI pipelines that have database access.

## Adding New Tests

### For Unit Tests (Mocked)
1. Create file: `test/my-feature.service.spec.ts`
2. Mock all external dependencies (PrismaService, HttpService, etc.)
3. Run: `npm test`

### For Integration Tests (Real Database)
1. Create file: `test/integration/my-feature.integration-spec.ts`
2. Use real PrismaService and database calls
3. Ensure DATABASE_URL is set
4. Run: `npm run test:integration`

### For E2E Tests (Full API)
1. Create file: `test/my-feature.e2e-spec.ts`
2. Start full API and dependencies
3. Run: `npm run test:e2e`

# TDD Strategy

## Testing Stack

- **Unit & Integration:** Vitest
- **E2E:** Playwright
- **Mocking:** MSW (API) + Prisma Mock (DB)
- **Coverage:** @vitest/coverage-v8

## Estructura de Directorios

```
tests/
├── unit/                    # Vitest
│   ├── components/          # React components
│   │   ├── KanbanCard.test.tsx
│   │   ├── TaskColumn.test.tsx
│   │   └── AgentCard.test.tsx
│   ├── lib/                 # Utilities
│   │   ├── utils.test.ts
│   │   └── validators.test.ts
│   └── hooks/               # Custom hooks
│       ├── useKanban.test.ts
│       └── useChat.test.ts
│
├── integration/             # Vitest + MSW
│   ├── api/                 # API routes
│   │   ├── organizations.test.ts
│   │   ├── projects.test.ts
│   │   ├── tasks.test.ts
│   │   └── agents.test.ts
│   ├── lib/
│   │   ├── hermes-sync.test.ts
│   │   └── websocket.test.ts
│   └── services/
│       ├── task-service.test.ts
│       └── agent-service.test.ts
│
└── e2e/                     # Playwright
    ├── auth.spec.ts
    ├── onboarding.spec.ts
    ├── kanban.spec.ts
    ├── chat.spec.ts
    └── agents.spec.ts
```

## Flujo TDD

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD CYCLE                                 │
│                                                              │
│   1. RED ─────► Escribir test que falla                    │
│      │                                                       │
│      ▼                                                       │
│   2. GREEN ───► Implementar código mínimo para pasar        │
│      │                                                       │
│      ▼                                                       │
│   3. REFACTOR ► Mejorar código manteniendo tests verdes     │
│      │                                                       │
│      └───────────────────────────────────────────────────────┤
│                    REPETIR                                   │
└─────────────────────────────────────────────────────────────┘
```

## Reglas TDD del Proyecto

| Regla | Descripción |
|-------|-------------|
| **Rule 1** | No escribir código de producción sin un test que falle primero |
| **Rule 2** | Escribir solo el mínimo código necesario para pasar el test |
| **Rule 3** | Refactorizar solo con tests en verde |
| **Rule 4** | Commits solo con todos los tests pasando |
| **Rule 5** | Coverage mínimo: 80% unit, 60% integration |

## Configuración

### Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

## Ejemplos

### Unit Test: Component

```typescript
// tests/unit/components/KanbanCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { KanbanCard } from '@/components/kanban/KanbanCard';

describe('KanbanCard', () => {
  it('renders task title', () => {
    const task = { id: '1', title: 'Implement API', status: 'todo' };
    render(<KanbanCard task={task} />);
    expect(screen.getByText('Implement API')).toBeInTheDocument();
  });

  it('shows blocked badge when task is blocked', () => {
    const task = { 
      id: '1', 
      title: 'Deploy', 
      status: 'blocked',
      blocked_reason: 'Need approval'
    };
    render(<KanbanCard task={task} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Need approval')).toBeInTheDocument();
  });
});
```

### Integration Test: API

```typescript
// tests/integration/api/tasks.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, PUT } from '@/app/api/tasks/route';
import { mockPrisma } from '__mocks__/prisma';

describe('Tasks API', () => {
  beforeEach(() => {
    mockPrisma.reset();
  });

  describe('POST /api/tasks', () => {
    it('creates task and syncs to Hermes', async () => {
      const taskData = {
        title: 'New task',
        projectId: 'proj-1',
        assignee: 'backend-dev'
      };
      
      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        ...taskData,
        status: 'triage'
      });

      const req = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New task');
    });
  });
});
```

### E2E Test: Kanban

```typescript
// tests/e2e/kanban.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('displays kanban columns', async ({ page }) => {
    await expect(page.getByTestId('column-triage')).toBeVisible();
    await expect(page.getByTestId('column-todo')).toBeVisible();
    await expect(page.getByTestId('column-ready')).toBeVisible();
  });

  test('drags task between columns', async ({ page }) => {
    await page.click('[data-testid="add-task"]');
    await page.fill('[name="title"]', 'Test Task');
    await page.click('button:has-text("Create")');
    
    const task = page.getByTestId('task-card').first();
    const todoColumn = page.getByTestId('column-todo');
    
    await task.dragTo(todoColumn);
    await expect(todoColumn.getByText('Test Task')).toBeVisible();
  });
});
```

## Mocking

### MSW Setup

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://127.0.0.1:8642/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: { content: 'Test response' }
      }]
    });
  }),
];
```

### Prisma Mock

```typescript
// tests/mocks/prisma.ts
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

export const mockPrisma = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(mockPrisma);
});

// __mocks__/prisma.ts
export { mockPrisma as prisma };
```

## CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Scripts

```bash
# Development
npm run test              # Unit tests (watch)
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E
npm run test:all          # Full suite

# Debug
npm run test:ui           # Vitest UI
npm run test:e2e:ui       # Playwright UI
```

## Coverage Targets

| Tipo | Target | Medición |
|------|--------|----------|
| Unit tests | ≥ 80% | Vitest coverage |
| Integration | ≥ 60% | Vitest coverage |
| E2E | 100% smoke | Playwright |
| Test duration | < 5 min unit, < 10 min e2e | CI logs |

## Testing por Fase

| Fase | Tests Requeridos |
|------|-----------------|
| **Fase 1** | Auth flows (e2e)<br>CRUD Organizations (unit + integration)<br>CRUD Projects (unit + integration)<br>Kanban rendering (unit) |
| **Fase 2** | Agent CRUD (unit + integration)<br>MCP config (integration)<br>Hermes sync (integration)<br>WebSocket (integration) |
| **Fase 3** | Approval flow (e2e)<br>Notifications (integration)<br>Webhooks (integration) |
| **Fase 4** | Performance tests<br>Load tests<br>Security tests |

## Debug Tips

### Verbose Output
```bash
npm run test -- --reporter=verbose
```

### Run Single Test
```bash
npm run test -- KanbanCard.test.tsx
```

### Update Snapshots
```bash
npm run test -- -u
```

### Debug E2E
```bash
npm run test:e2e -- --debug
```

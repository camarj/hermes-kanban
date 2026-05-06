# Tech Stack

## Frontend

### Framework
- **Next.js 16** - App Router, Server Components, Server Actions
- **React 19** - Latest features
- **TypeScript 5** - Strict mode enabled

### Styling
- **Tailwind CSS v4** - Utility-first
- **shadcn/ui** - Component library (Radix primitives)
- **Inteliside Design System** - Custom tokens (see `.claude/skills/inteliside-design/colors_and_type.css`)

### State & Data
- **React Query (TanStack Query)** - Server state, caching
- **Zustand** - Client state (kanban drag, filters)
- **React Hook Form** - Forms
- **Zod** - Schema validation

### Interactions
- **dnd-kit** - Drag and drop para Kanban
- **Framer Motion** - Animations

### Real-time
- **WebSocket (native)** - Real-time updates
- **Server-Sent Events** - Fallback

## Backend

### Runtime
- **Node.js 22** - Latest LTS
- **Next.js API Routes** - Serverless functions

### Database
- **PostgreSQL 16** - Primary database
- **Prisma 5** - ORM
- **pgvector** - Vector search (future)

### Authentication
- **BetterAuth** - Auth solution
  - Email/password
  - Google OAuth
  - GitHub OAuth
  - Session management
  - Rate limiting

### API
- **Next.js Route Handlers** - REST API
- **Server Actions** - Mutations

## Testing

### Unit & Integration
- **Vitest** - Test runner
- **@testing-library/react** - Component testing
- **@testing-library/user-event** - User interactions
- **MSW (Mock Service Worker)** - API mocking
- **Prisma Mock** - Database mocking

### E2E
- **Playwright** - Browser testing
- **@playwright/test** - Test runner

### Coverage
- **@vitest/coverage-v8** - Coverage reporter
- **Codecov** - Coverage tracking

## Hermes Integration

### Agent Runtime
- **Hermes Agent** - Latest version
  - Kanban system
  - Profile management
  - Gateway API
  - MCP support

### Configuration
- **SQLite** - Hermes Kanban DB
- **YAML** - Profile configs
- **MCP Servers** - Tool extensions

## Development Tools

### Package Manager
- **pnpm** - Fast, disk efficient

### Build
- **Turbopack** - Next.js bundler (dev)
- **Webpack** - Production builds

### Linting & Formatting
- **ESLint 9** - Linting
- **Prettier** - Formatting
- **typescript-eslint** - TypeScript rules

### Git
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files
- **Commitizen** - Commit conventions

## Infrastructure

### Development
- **Docker** - Local Postgres, Redis (optional)
- **Docker Compose** - Multi-service setup

### Production
- **Vercel** - Hosting (frontend + API)
- **Neon** - Postgres (serverless)
- **Upstash** - Redis (optional, for queues)

### Monitoring
- **Sentry** - Error tracking
- **Vercel Analytics** - Performance

## Dependencies

### Production

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    
    "@prisma/client": "^5.0.0",
    "@better-auth/core": "^1.0.0",
    "@better-auth/prisma": "^1.0.0",
    
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    
    "dnd-kit": "^6.0.0",
    "framer-motion": "^11.0.0",
    
    "tailwindcss": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    
    "ws": "^8.0.0",
    "date-fns": "^3.0.0"
  }
}
```

### Development

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/ws": "^8.0.0",
    
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0",
    
    "playwright": "^1.48.0",
    "@playwright/test": "^1.48.0",
    
    "prisma": "^5.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

## Environment Variables

### Required

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/hermes_platform"

# Auth
BETTER_AUTH_SECRET="random-32-char-string"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Hermes
HERMES_API_URL="http://127.0.0.1:8642/v1"
HERMES_API_KEY="your-secret-key"
HERMES_HOME="~/.hermes"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Optional

```bash
# Redis (future)
REDIS_URL="redis://localhost:6379"

# Monitoring
SENTRY_DSN="..."

# Email
RESEND_API_KEY="..."

# Webhooks
WEBHOOK_SECRET="..."
```

## Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:coverage && npm run test:e2e",
    
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    
    "prepare": "husky"
  }
}
```

## VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-playwright.playwright",
    "orta.vscode-jest"
  ]
}
```

## Project Structure

```
hermes-kanban/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                # shadcn/ui
│   ├── kanban/            # Kanban components
│   ├── chat/              # Chat components
│   └── agents/            # Agent components
├── lib/
│   ├── db/                # Prisma client
│   ├── hermes/            # Hermes client
│   ├── auth/              # BetterAuth config
│   └── utils/             # Utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── .opencode/            # Context for AI
└── ...config files
```

## Upgrade Path

### Phase 1 (MVP)
- Next.js 16
- PostgreSQL
- BetterAuth
- Vitest + Playwright

### Phase 2 (Scale)
- Add Redis for caching
- Add Queue system (BullMQ)
- Add Vector search (pgvector)

### Phase 3 (Enterprise)
- Multi-region deployment
- SSO/SAML
- Custom model fine-tuning

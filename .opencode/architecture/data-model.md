# Data Model

## Schema SQL Completo

```sql
-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  avatar_url      TEXT,
  email_verified  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  objective       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_owner ON organizations(owner_id);

-- ============================================
-- ORGANIZATION MEMBERS
-- ============================================

CREATE TABLE organization_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  role             VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'board', 'member')),
  responsibilities TEXT[],
  domains          TEXT[],
  joined_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_members_org ON organization_members(org_id);
CREATE INDEX idx_members_user ON organization_members(user_id);

-- ============================================
-- INVITATIONS
-- ============================================

CREATE TABLE invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email        VARCHAR(255) NOT NULL,
  role         VARCHAR(50) DEFAULT 'board',
  invited_by    UUID REFERENCES users(id),
  token        VARCHAR(255) UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================
-- TASKS (Mirror de Hermes Kanban)
-- ============================================

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hermes_task_id    VARCHAR(50) UNIQUE, -- t_xxx de Hermes
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id            UUID REFERENCES organizations(id),
  title             VARCHAR(500) NOT NULL,
  body              TEXT,
  status            VARCHAR(50) DEFAULT 'triage' CHECK (status IN ('triage', 'todo', 'ready', 'running', 'blocked', 'done', 'archived')),
  priority          INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  assignee          VARCHAR(100), -- Profile name del agente
  tenant            VARCHAR(100), -- Namespace dentro del board
  workspace_type    VARCHAR(50) DEFAULT 'scratch' CHECK (workspace_type IN ('scratch', 'worktree', 'dir')),
  workspace_path    TEXT,
  blocked_reason    TEXT,
  blocked_by        UUID REFERENCES users(id),
  approval_required BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  hermes_metadata   JSONB DEFAULT '{}'
);

CREATE INDEX idx_tasks_hermes ON tasks(hermes_task_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);

-- ============================================
-- TASK RELATIONS (Dependencies)
-- ============================================

CREATE TABLE task_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,
  child_task_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_task_id, child_task_id)
);

CREATE INDEX idx_task_links_parent ON task_links(parent_task_id);
CREATE INDEX idx_task_links_child ON task_links(child_task_id);

-- ============================================
-- TASK COMMENTS
-- ============================================

CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_type VARCHAR(50) CHECK (author_type IN ('user', 'agent')),
  author_id   VARCHAR(100), -- user_id o profile_name
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON task_comments(task_id);

-- ============================================
-- AGENT TEMPLATES
-- ============================================

CREATE TABLE agent_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  display_name     VARCHAR(255),
  description      TEXT,
  role_type        VARCHAR(50) DEFAULT 'worker' CHECK (role_type IN ('ceo', 'orchestrator', 'worker')),
  soul_content     TEXT,
  default_skills   TEXT[],
  default_tools    TEXT[],
  default_toolsets TEXT[],
  model_override   VARCHAR(100),
  created_by       UUID REFERENCES users(id),
  is_public        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_templates_org ON agent_templates(org_id);
CREATE INDEX idx_agent_templates_public ON agent_templates(is_public) WHERE is_public = TRUE;

-- ============================================
-- AGENT INSTANCES
-- ============================================

CREATE TABLE agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
  hermes_profile    VARCHAR(100) NOT NULL,
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  soul_content      TEXT,
  skills            TEXT[],
  tools             TEXT[],
  toolsets          TEXT[],
  mcp_servers       JSONB DEFAULT '[]',
  webhooks          JSONB DEFAULT '[]',
  api_integrations  JSONB DEFAULT '[]',
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_org ON agents(org_id);
CREATE INDEX idx_agents_profile ON agents(hermes_profile);

-- ============================================
-- MCP SERVER CONFIGS
-- ============================================

CREATE TABLE mcp_servers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  transport    VARCHAR(50) DEFAULT 'stdio' CHECK (transport IN ('stdio', 'http')),
  command      TEXT,
  url          TEXT,
  env_vars     JSONB DEFAULT '{}',
  tools_filter TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_org ON mcp_servers(org_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ============================================
-- WEBHOOK EVENTS
-- ============================================

CREATE TABLE webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_id   UUID, -- Referencia al webhook config
  event_type   VARCHAR(100) NOT NULL,
  payload      JSONB NOT NULL,
  delivered_at TIMESTAMPTZ,
  status       VARCHAR(50) DEFAULT 'pending',
  retries      INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_status ON webhook_events(status);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- SESSIONS (BetterAuth)
-- ============================================

CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  token        VARCHAR(255) UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- ============================================
-- ACCOUNTS (OAuth)
-- ============================================

CREATE TABLE accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id       VARCHAR(100) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token      TEXT,
  refresh_token     TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, provider_account_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

-- ============================================
-- VERIFICATIONS
-- ============================================

CREATE TABLE verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  VARCHAR(255) NOT NULL,
  value       VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_identifier ON verifications(identifier);
```

## Relaciones Principales

```
users
  ├── organizations (owner)
  ├── organization_members (N:M)
  └── sessions (1:N)

organizations
  ├── users (via members)
  ├── projects (1:N)
  ├── agents (1:N)
  ├── mcp_servers (1:N)
  └── agent_templates (1:N)

projects
  ├── tasks (1:N)
  └── organization (N:1)

tasks
  ├── project (N:1)
  ├── task_links (parents/children)
  ├── task_comments (1:N)
  └── notifications (1:N)

agents
  ├── organization (N:1)
  ├── template (N:1)
  └── tasks (via assignee name)
```

## Índices Críticos

| Tabla | Índice | Propósito |
|-------|--------|-----------|
| tasks | idx_tasks_hermes | Lookup rápido por Hermes ID |
| tasks | idx_tasks_status | Filtros de Kanban |
| tasks | idx_tasks_project | Filtro por proyecto |
| organization_members | idx_members_org | Verificar membresía |
| notifications | idx_notifications_unread | Badge de notificaciones |
| audit_log | idx_audit_entity | Query de historia |

## JSONB Schemas

### agents.mcp_servers
```json
[
  {
    "server_name": "github-mcp",
    "config": {
      "repos": ["read", "write"],
      "issues": ["read", "write"]
    }
  }
]
```

### agents.webhooks
```json
[
  {
    "url": "https://example.com/webhook",
    "events": ["task_completed", "task_blocked"],
    "secret": "hash_bcrypt"
  }
]
```

### tasks.hermes_metadata
```json
{
  "changed_files": ["src/api.ts"],
  "tests_run": 14,
  "summary": "Implemented auth API",
  "agent_id": "backend-dev"
}
```

## Migraciones

```bash
# Crear migración
npx prisma migrate dev --name init

# Aplicar migración
npx prisma migrate deploy

# Reset DB (dev)
npx prisma migrate reset
```

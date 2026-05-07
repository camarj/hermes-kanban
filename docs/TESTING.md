# Hermes Kanban - Testing Guide

## Pre-requisitos

1. **Base de datos corriendo:**
   ```bash
   docker compose up -d
   ```

2. **Variables de entorno configuradas:**
   ```bash
   cp .env.example .env
   # Editar .env con tus valores
   ```

3. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

4. **Generar Prisma client:**
   ```bash
   pnpm db:generate
   ```

5. **Aplicar migraciones:**
   ```bash
   pnpm db:migrate
   ```

6. **Cargar datos de prueba:**
   ```bash
   pnpm db:seed
   ```

---

## Checklist de Testing

### ✅ Feature #1: Organization Creation

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 1.1 | Registro de usuario | 1. Ir a `/register`<br>2. Completar formulario<br>3. Submit | Cuenta creada, redirige a login |
| 1.2 | Login | 1. Ir a `/login`<br>2. Ingresar credenciales<br>3. Submit | Autenticado, redirige a dashboard |
| 1.3 | Onboarding (sin orgs) | Login con usuario sin organizaciones | Redirige a `/onboarding/create-organization` |
| 1.4 | Crear organización | 1. Completar nombre y objetivo<br>2. Submit | Org creada, redirige a dashboard |
| 1.5 | Slug único | Intentar crear org con nombre existente | Slug auto-generado con sufijo numérico |

**Verificación:**
```bash
# En Prisma Studio
pnpm db:studio
# Verificar: Organization, OrganizationMember creados
```

---

### ✅ Feature #2: Organization Dashboard

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 2.1 | Lista de organizaciones | Ir a `/dashboard` | Muestra cards de organizaciones del usuario |
| 2.2 | Click en organización | Click en card de org | Navega a `/{orgSlug}` |
| 2.3 | Sidebar navegación | En página de org, click en menú | Navega entre: Dashboard, Projects, Tasks, Agents, Members, Settings |
| 2.4 | Organization Switcher | Click en nombre de org en sidebar | Dropdown con orgs disponibles |
| 2.5 | Cambiar organización | Seleccionar otra org del dropdown | Navega a esa organización |
| 2.6 | User section | Verificar sidebar inferior | Muestra usuario actual y botón logout |
| 2.7 | Protección de rutas | Intentar acceder a `/{orgSlug}` sin membresía | Redirige a `/dashboard` |

---

### ✅ Feature #3: Kanban Board

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 3.1 | Visualización del board | Ir a `/{orgSlug}/tasks` | Muestra 6 columnas con tareas |
| 3.2 | Drag & Drop | Arrastrar tarea a otra columna | Tarea se mueve visualmente y persiste |
| 3.3 | Status persistence | Refrescar página después de DnD | Tarea mantiene nueva posición |
| 3.4 | Click en tarea | Click en card de tarea | Abre modal de detalle |
| 3.5 | Prioridad visual | Verificar colores de tareas | Dots de color según prioridad |
| 3.6 | Asignado | Ver tareas con asignado | Muestra avatar e inicial |
| 3.7 | Loading state | Cargar página de tasks | Spinner mientras carga |
| 3.8 | Empty state | Ver columna sin tareas | Muestra "No tasks" |

**Verificación API:**
```bash
# GET tasks
curl http://localhost:3000/api/organizations/{orgId}/tasks

# Response debe incluir: id, title, status, priority, assignee, project
```

---

### ✅ Feature #4: Task Management

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 4.1 | Crear tarea | 1. Click "New Task"<br>2. Completar form<br>3. Submit | Tarea aparece en columna correcta |
| 4.2 | Editar tarea | 1. Click en tarea<br>2. Modificar campos<br>3. Save | Cambios persisten |
| 4.3 | Cambiar status | En edit modal, cambiar status | Tarea se mueve de columna |
| 4.4 | Cambiar prioridad | En edit modal, cambiar priority | Color del dot cambia |
| 4.5 | Asignar agente | En edit modal, seleccionar assignee | Guarda asignación |
| 4.6 | Eliminar tarea | 1. Click Delete<br>2. Confirmar | Tarea desaparece del board |
| 4.7 | Search | Escribir en search box | Filtra tareas en tiempo real |
| 4.8 | Filter por status | Seleccionar status en filters | Muestra solo tareas de ese status |
| 4.9 | Filter por priority | Seleccionar priority | Muestra solo tareas de esa prioridad |
| 4.10 | Filter por assignee | Escribir nombre de assignee | Filtra por asignado |
| 4.11 | Clear filters | Click en X de filters | Resetea todos los filtros |

**Verificación Database:**
```sql
-- Verificar tarea creada
SELECT * FROM tasks WHERE title = 'Test Task';

-- Verificar asignación
SELECT * FROM tasks WHERE assignee = 'acme-ceo';
```

---

### ✅ Feature #5: CEO Agent Integration

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 5.1 | Lista de agentes | Ir a `/{orgSlug}/agents` | Muestra cards de agentes |
| 5.2 | Stats | Verificar encabezado | Muestra Total, Active, Inactive |
| 5.3 | Crear agente | 1. Click "New Agent"<br>2. Completar form<br>3. Submit | Agente aparece en lista |
| 5.4 | Hermes Profile | Crear agente con profile | Guarda profile único |
| 5.5 | Duplicate profile | Intentar crear con profile existente | Error 409 |
| 5.6 | Agregar skills | En create modal, agregar skills | Tags aparecen en card |
| 5.7 | Agregar tools | En create modal, agregar tools | Tools aparecen en card |
| 5.8 | Toggle status | Click en switch de agente | Cambia entre Active/Inactive |
| 5.9 | Visualización de role | Verificar badges | Muestra CEO/Orchestrator/Worker |
| 5.10 | Template inheritance | Crear desde template | Hereda skills/tools del template |
| 5.11 | Asignación en tarea | En task detail, ver dropdown | Lista de agent profiles disponibles |

**Verificación API:**
```bash
# GET agents
curl http://localhost:3000/api/organizations/{orgId}/agents

# POST agent
curl -X POST http://localhost:3000/api/organizations/{orgId}/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","hermesProfile":"test-agent"}'
```

---

### ✅ Feature #6: WebSocket Updates (Supabase)

| # | Test | Pasos | Resultado Esperado |
|---|------|-------|-------------------|
| 6.1 | Indicador live | Abrir `/tasks` | Muestra "Live updates" con icono |
| 6.2 | Update en tiempo real | 1. Abrir `/tasks` en 2 tabs<br>2. Mover tarea en Tab 1 | Cambio reflejado en Tab 2 |
| 6.3 | Create en tiempo real | Crear tarea en Tab 1 | Aparece en Tab 2 automáticamente |
| 6.4 | Delete en tiempo real | Eliminar tarea en Tab 1 | Desaparece en Tab 2 |
| 6.5 | Notification toast | Realizar cambio | Aparece toast "Board updated" |
| 6.6 | Presence | Abrir página con 2 usuarios | Muestra ambos usuarios online |
| 6.7 | User colors | Verificar avatares | Cada usuario tiene color diferente |
| 6.8 | Desconexión | Cerrar una pestaña | Usuario desaparece de presence |

**Nota:** Requiere configurar Supabase en `.env`

---

## Scripts de Validación

### Verificación rápida (todo en uno):
```bash
# En package.json agregar:
"verify": "pnpm test:unit:run && pnpm lint && pnpm build"

# Ejecutar:
pnpm verify
```

### Testing manual rápido:
```bash
# 1. Limpiar y preparar
docker compose down -v
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 2. Iniciar app
pnpm dev

# 3. En otra terminal, ver logs
tail -f logs/development.log
```

---

## Problemas Comunes

### 1. Error: "Cannot find module '@supabase/supabase-js'"
**Solución:**
```bash
pnpm install
```

### 2. Error: "Database connection failed"
**Solución:**
```bash
docker compose ps  # Verificar PostgreSQL corriendo
pnpm db:push       # Push schema
```

### 3. Error: "BetterAuth session not found"
**Solución:**
- Verificar `BETTER_AUTH_SECRET` en `.env`
- Limpiar cookies del navegador
- Recargar página

### 4. Drag & Drop no funciona
**Solución:**
- Verificar que `@dnd-kit` esté instalado
- Refrescar página (hay hydration issues conocidos)

### 5. Realtime no funciona
**Solución:**
- Verificar variables de Supabase en `.env`
- Verificar que tabla `tasks` tenga realtime enabled en Supabase dashboard

---

## Métricas de Calidad

| Métrica | Valor Actual | Target |
|---------|--------------|--------|
| Unit Tests | 5 passing | >20 |
| TypeScript Errors | 0 | 0 |
| Build Time | ~30s | <60s |
| Bundle Size | TBD | <500KB |
| Lighthouse Score | TBD | >90 |

---

## Próximos Tests

- [ ] E2E tests con Playwright
- [ ] Integration tests para APIs
- [ ] Performance testing
- [ ] Accessibility audit
- [ ] Mobile responsiveness testing

---

## Comandos Útiles

```bash
# Ver base de datos
pnpm db:studio

# Ver logs
pnpm dev --debug

# Type check
npx tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build

# Test unitarios
pnpm test:unit:run

# Test E2E
pnpm test:e2e
```
# 🧪 Guía de Testing - Hermes Kanban

## 🚀 Quick Start (5 minutos)

### 1. Verificar que todo esté listo
```bash
./scripts/verify.sh
```

Este script verifica:
- ✅ Dependencias instaladas
- ✅ Variables de entorno
- ✅ TypeScript sin errores
- ✅ Tests pasando
- ✅ Base de datos conectada
- ✅ Archivos clave existen

### 2. Preparar ambiente de prueba
```bash
# 1. Reset completo
docker compose down -v
docker compose up -d

# 2. Setup base de datos
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 3. Iniciar app
pnpm dev
```

### 3. Acceder a la aplicación
- **URL:** http://localhost:3000
- **Login:** Crea una cuenta en `/register`
- **Dashboard:** Automático después del login

---

## 📋 Testing Manual por Feature

### Feature #1 & #2: Organizaciones
**Ruta:** http://localhost:3000/dashboard

**Tests:**
1. Crear cuenta nueva → Debe redirigir a onboarding
2. Crear primera organización → Nombre: "Test Corp"
3. Verificar slug: "test-corp" generado automáticamente
4. Click en la card → Navega a `/test-corp`
5. Verificar sidebar con 6 menús visibles
6. Click en cada menú → Navegación correcta

**✅ Checklist:**
- [ ] Registro funciona
- [ ] Onboarding aparece para usuarios sin org
- [ ] Slug único generado
- [ ] Sidebar navegación funciona
- [ ] Organization switcher visible

---

### Feature #3 & #4: Kanban Board
**Ruta:** http://localhost:3000/{orgSlug}/tasks

**Tests:**
1. **Visual:** Ver 6 columnas (Triage, To Do, Ready, Running, Blocked, Done)
2. **Drag & Drop:**
   - Arrastrar tarea de "To Do" a "Running"
   - Refrescar página → Tarea debe permanecer en "Running"
3. **Crear Tarea:**
   - Click "New Task"
   - Título: "Test Task"
   - Status: "To Do"
   - Submit → Tarea aparece en columna
4. **Editar:**
   - Click en tarea
   - Cambiar prioridad a "High"
   - Save → Color del dot cambia a naranja
5. **Filtros:**
   - Search: "test" → Solo muestra tareas con "test"
   - Status filter: "done" → Solo columna Done visible
   - Clear filters → Resetea todo
6. **Eliminar:**
   - Click en tarea
   - Click "Delete"
   - Confirmar → Tarea desaparece

**✅ Checklist:**
- [ ] 6 columnas visibles
- [ ] Drag & Drop funciona
- [ ] Cambios persisten después de refresh
- [ ] Crear tarea funciona
- [ ] Editar tarea funciona
- [ ] Filtros funcionan
- [ ] Eliminar con confirmación

---

### Feature #5: Agents
**Ruta:** http://localhost:3000/{orgSlug}/agents

**Tests:**
1. **Visual:** Ver cards de agentes (después del seed hay 4)
2. **Stats:** Verificar números (Total: 4, Active: 3, Inactive: 1)
3. **Crear Agente:**
   - Click "New Agent"
   - Name: "Test Agent"
   - Hermes Profile: "test-agent-{random}"
   - Skills: add "javascript", "react"
   - Submit → Aparece en lista
4. **Toggle Status:**
   - Click switch en agente activo → Cambia a Inactive
   - Stats se actualizan
5. **Asignación:**
   - Ir a `/tasks`
   - Click en cualquier tarea
   - Ver dropdown de assignee con agentes
   - Seleccionar agente → Guarda correctamente

**✅ Checklist:**
- [ ] Lista de agentes visible
- [ ] Stats correctos
- [ ] Crear agente funciona
- [ ] Slug único validado
- [ ] Toggle status funciona
- [ ] Skills/tools se guardan
- [ ] Asignación en tareas funciona

---

### Feature #6: Realtime (requiere Supabase)
**Ruta:** http://localhost:3000/{orgSlug}/tasks

**Tests:**
1. **Setup:** Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Indicador:** Ver "Live updates" en header del board
3. **Multi-tab:**
   - Abrir `/tasks` en 2 pestañas diferentes
   - En Tab 1: Mover tarea a otra columna
   - Ver Tab 2: Tarea se mueve automáticamente
4. **Notification:**
   - Realizar cualquier cambio
   - Ver toast "Board updated in real-time"
5. **Presence:**
   - Abrir con 2 usuarios diferentes
   - Ver avatares de usuarios online

**✅ Checklist:**
- [ ] Indicador "Live updates" visible
- [ ] Cambios sincronizados entre tabs
- [ ] Toast notifications aparecen
- [ ] Presence muestra usuarios online

---

## 🐛 Debugging

### Ver logs de la app
```bash
# En terminal donde corre pnpm dev
# Ver errores en tiempo real
```

### Ver base de datos
```bash
pnpm db:studio
# Abre http://localhost:5555
```

### Test API manualmente
```bash
# Ver todas las tareas
curl http://localhost:3000/api/organizations/{orgId}/tasks

# Ver todos los agentes
curl http://localhost:3000/api/organizations/{orgId}/agents
```

### Reset rápido
```bash
# Si algo falla, reset completo:
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

---

## ✅ Sign-off Checklist

Antes de considerar completo, verificar:

**Funcionalidad:**
- [ ] Usuario puede registrarse y loguearse
- [ ] Usuario puede crear organización
- [ ] Usuario puede navegar entre organizaciones
- [ ] Kanban board muestra tareas
- [ ] Drag & Drop funciona correctamente
- [ ] Tareas pueden crearse/editarse/eliminarse
- [ ] Filtros funcionan correctamente
- [ ] Agentes pueden crearse y configurarse
- [ ] Asignación de agentes funciona
- [ ] (Opcional) Realtime funciona con Supabase

**UI/UX:**
- [ ] Diseño consistente (colores Inteliside)
- [ ] Responsive en desktop
- [ ] Loading states visibles
- [ ] Error states manejados
- [ ] Confirmaciones para acciones destructivas

**Performance:**
- [ ] Página carga en <3s
- [ ] Drag & Drop es fluido
- [ ] Filtros responden en <500ms

**Seguridad:**
- [ ] Rutas protegidas funcionan
- [ ] Usuario no puede ver orgs ajenas
- [ ] Solo miembros pueden ver tareas

---

## 📝 Reportar Issues

Si encuentras un bug:

1. **Reproducir:** Pasos exactos para reproducir
2. **Screenshot:** Imagen del problema
3. **Logs:** Error de consola/terminal
4. **Context:** Navegador, versión, etc.

**Template:**
```
**Feature:** [Kanban/Agents/etc]
**Problema:** [Descripción]
**Pasos:**
1. Ir a...
2. Click en...
3. ...
**Esperado:** [Qué debería pasar]
**Actual:** [Qué pasa]
**Screenshot:** [Adjuntar]
```

---

## 🎯 Happy Path Completo

Flujo ideal de un usuario:

1. **Registro** → `/register` → Crea cuenta
2. **Onboarding** → Crea primera org "Mi Empresa"
3. **Dashboard** → Ve overview de organizaciones
4. **Entra a Org** → Click en card
5. **Kanban** → Ve tareas de ejemplo (seed)
6. **Crea Tarea** → Nueva feature request
7. **Asigna** → A agente CEO
8. **Mueve** → De "To Do" a "Running"
9. **Edita** → Cambia prioridad a High
10. **Crea Agente** → Developer bot
11. **Asigna** → Tarea al nuevo agente
12. **Filtros** → Busca tareas del agente

**Tiempo estimado:** 10-15 minutos

---

¡Listo para testear! 🚀

Si todo funciona correctamente, estamos listos para seguir con más features.
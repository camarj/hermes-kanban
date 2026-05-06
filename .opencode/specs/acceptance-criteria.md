# Criterios de Aceptación por Feature

## Feature 1: Autenticación y Organización

### User Story: Registro de Usuario
```
COMO usuario nuevo
QUIERO registrarme con email o Google/GitHub
PARA acceder a la plataforma
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC1.1 | Usuario puede registrarse con email y contraseña válida | Must |
| AC1.2 | Usuario puede registrarse con Google OAuth | Must |
| AC1.3 | Usuario puede registrarse con GitHub OAuth | Must |
| AC1.4 | Email de verificación enviado tras registro | Should |
| AC1.5 | Sesión iniciada automáticamente tras verificar | Should |
| AC1.6 | Avatar cargado desde OAuth provider | Nice |

### User Story: Crear Organización
```
COMO usuario autenticado
QUIERO crear una organización
PARA empezar a trabajar con agentes
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC2.1 | Formulario con nombre, slug, objetivo, primer proyecto | Must |
| AC2.2 | Slug autogenerado desde nombre (editable) | Must |
| AC2.3 | Slug único global | Must |
| AC2.4 | Owner asignado automáticamente como miembro board | Must |
| AC2.5 | CEO Agent creado automáticamente | Must |
| AC2.6 | Hermes profile creado para CEO | Must |
| AC2.7 | Redirección al dashboard tras crear | Must |

---

## Feature 2: Onboarding de Miembros

### User Story: Invitación de Miembro Junta Directiva
```
COMO owner/board member
QUIERO invitar miembros a la junta directiva
PARA que puedan delegar tareas al CEO
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC3.1 | Enviar invitación por email | Must |
| AC3.2 | Link único con expiración (72h) | Must |
| AC3.3 | Aceptar invitación crea cuenta si no existe | Must |
| AC3.4 | Flujo de responsabilidades tras aceptar | Must |
| AC3.5 | Notificar al owner cuando se une | Should |
| AC3.6 | Reenviar invitación si expira | Should |
| AC3.7 | Revocar invitación pendiente | Should |

### User Story: Definir Responsabilidades
```
COMO nuevo miembro de junta directiva
QUIERO definir mis responsabilidades y áreas de dominio
PARA que el CEO sepa cuándo consultarme
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC4.1 | Lista predefinida de responsabilidades | Must |
| AC4.2 | Múltiple selección permitida | Must |
| AC4.3 | Campo libre para áreas de dominio | Must |
| AC4.4 | Editable después del onboarding | Must |
| AC4.5 | Visualización en perfil | Should |

---

## Feature 3: Kanban Board

### User Story: Visualizar Kanban
```
COMO board member
QUIERO ver un tablero Kanban con todas las tareas
PARA entender el estado del trabajo
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC5.1 | 6 columnas: Triage, TODO, Ready, Running, Blocked, Done | Must |
| AC5.2 | Tarjetas con título, asignee, prioridad, fecha | Must |
| AC5.3 | Badge visual para tareas bloqueadas | Must |
| AC5.4 | Contador de tareas por columna | Must |
| AC5.5 | Filtro por proyecto | Must |
| AC5.6 | Filtro por agente asignado | Should |
| AC5.7 | Filtro por tenant | Should |
| AC5.8 | Buscar tareas por texto | Should |
| AC5.9 | Ordenar por prioridad/fecha | Nice |

### User Story: Drag & Drop de Tareas
```
COMO board member
QUIERO arrastrar tareas entre columnas
PARA cambiar su estado manualmente
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC6.1 | Drag desde cualquier columna | Must |
| AC6.2 | Drop en columnas válidas | Must |
| AC6.3 | Feedback visual durante drag | Must |
| AC6.4 | Animación suave al soltar | Must |
| AC6.5 | Sync con Hermes inmediato | Must |
| AC6.6 | Rollback visual si falla sync | Must |
| AC6.7 | Confirmación para acciones destructivas (Done, Archive) | Must |

### User Story: Crear Tarea desde UI
```
COMO board member
QUIERO crear tareas directamente en el Kanban
PARA asignar trabajo a agentes
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC7.1 | Botón + en cada columna | Must |
| AC7.2 | Modal con título, descripción, asignee, prioridad | Must |
| AC7.3 | Crear en columna específica | Must |
| AC7.4 | Sync con Hermes kanban_create | Must |
| AC7.5 | Notificación al CEO si es tarea directa | Should |
| AC7.6 | Templates de tareas comunes | Nice |

---

## Feature 4: Chat con CEO

### User Story: Chat con CEO Agent
```
COMO board member
QUIERO chatear con el CEO
PARA delegar tareas estratégicas
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC8.1 | Input de texto siempre visible | Must |
| AC8.2 | Streaming de respuestas | Must |
| AC8.3 | Historial de conversación persistente | Must |
| AC8.4 | Indicador de typing mientras CEO piensa | Must |
| AC8.5 | Soporte para markdown en respuestas | Must |
| AC8.6 | Scroll automático a nuevo mensaje | Should |
| AC8.7 | Indicador cuando CEO delega tarea | Should |
| AC8.8 | Ver qué agente está trabajando | Nice |

---

## Feature 5: Gestión de Agentes

### User Story: Crear Agente
```
COMO board member
QUIERO crear nuevos agentes
PARA especializar el equipo
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC9.1 | Formulario con nombre, descripción, rol | Must |
| AC9.2 | Editor de SOUL.md | Must |
| AC9.3 | Selección de skills | Must |
| AC9.4 | Selección de toolsets | Must |
| AC9.5 | Configuración de MCP servers | Must |
| AC9.6 | Preview de cómo se verá | Should |
| AC9.7 | Templates predefinidos | Should |
| AC9.8 | Webhooks configurables | Nice |

### User Story: Editar Agente Existente
```
COMO board member
QUIERO modificar agentes existentes
PARA ajustar su comportamiento
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC10.1 | Editar cualquier campo | Must |
| AC10.2 | Cambios se reflejan en Hermes | Must |
| AC10.3 | Historial de cambios | Should |
| AC10.4 | Versionado de SOUL.md | Nice |
| AC10.5 | Clonar agente existente | Nice |

---

## Feature 6: Sistema de Aprobaciones

### User Story: Aprobar Tarea Bloqueada
```
COMO board member
QUIERO aprobar tareas que requieren confirmación
PARA que los agentes puedan continuar
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC11.1 | Notificación cuando tarea se bloquea | Must |
| AC11.2 | Ver razón de bloqueo | Must |
| AC11.3 | Botón aprobar/rechazar | Must |
| AC11.4 | Comentario opcional al aprobar | Must |
| AC11.5 | Notificar al agente tras aprobación | Must |
| AC11.6 | Solo board members pueden aprobar | Must |
| AC11.7 | Historial de aprobaciones | Should |

---

## Feature 7: Webhooks y Notificaciones

### User Story: Configurar Webhooks
```
COMO board member
QUIERO configurar webhooks para eventos
PARA integrar con sistemas externos
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC12.1 | URL del webhook | Must |
| AC12.2 | Selección de eventos | Must |
| AC12.3 | Secret para verificación | Must |
| AC12.4 | Test del webhook | Should |
| AC12.5 | Historial de entregas | Should |
| AC12.6 | Reintento manual | Nice |

---

## Feature 8: Sincronización Hermes

### User Story: Sincronización en Tiempo Real
```
COMO sistema
QUIERO sincronizar tareas con Hermes
PARA mantener UI y Kanban consistentes
```

| ID | Criterio | Prioridad |
|----|----------|-----------|
| AC13.1 | Crear tarea en Postgres → crear en Hermes | Must |
| AC13.2 | Actualizar en Hermes → actualizar en Postgres | Must |
| AC13.3 | Webhooks de Hermes procesados | Must |
| AC13.4 | WebSocket broadcast a clientes | Must |
| AC13.5 | Reconciliación periódica | Should |
| AC13.6 | Audit log de sincronización | Should |

---

## Matriz de Priorización

| Feature | Must Have | Should Have | Nice to Have |
|---------|-----------|-------------|--------------|
| Auth | 6 | 2 | 1 |
| Organización | 7 | 0 | 0 |
| Onboarding | 7 | 3 | 0 |
| Kanban | 6 | 3 | 1 |
| Chat CEO | 5 | 2 | 1 |
| Agentes | 5 | 2 | 2 |
| Aprobaciones | 7 | 1 | 0 |
| Webhooks | 3 | 2 | 1 |
| Sync | 6 | 2 | 0 |

**Total Must Have: 52 criterios**
**Total Should Have: 17 criterios**
**Total Nice to Have: 6 criterios**

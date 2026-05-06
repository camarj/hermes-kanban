# Casos de Borde por Feature

## Feature 1: Autenticación y Organización

### Registro de Usuario

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB1.1 | Email ya existe | Error: "Este email ya está registrado" + link a login |
| EB1.2 | Contraseña < 8 caracteres | Error: "La contraseña debe tener al menos 8 caracteres" |
| EB1.3 | Contraseña sin complejidad | Error: "Debe incluir mayúscula, minúscula y número" |
| EB1.4 | Email formato inválido | Error: "Formato de email inválido" |
| EB1.5 | OAuth falla (popup cerrado) | Mensaje: "Autenticación cancelada" + retry |
| EB1.6 | OAuth falla (network error) | Mensaje: "Error de conexión" + retry |
| EB1.7 | Token OAuth expirado | Re-autenticación silenciosa |
| EB1.8 | Usuario registrado con otro provider | Error: "Email registrado con [provider], usa ese método" |

### Crear Organización

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB2.1 | Nombre vacío | Error: "El nombre es requerido" |
| EB2.2 | Nombre > 255 caracteres | Error: "Máximo 255 caracteres" |
| EB2.3 | Slug con caracteres inválidos | Auto-sanitización + validación |
| EB2.4 | Slug ya existe | Error: "Este slug no está disponible" + sugerencias |
| EB2.5 | Slug reservado (api, admin, etc) | Error: "Este slug no está disponible" |
| EB2.6 | Objetivo > 1000 caracteres | Error: "Máximo 1000 caracteres" |
| EB2.7 | Hermes Gateway no disponible | Error: "Servicio temporalmente no disponible" + retry |
| EB2.8 | Creación falla parcial (org creada, CEO no) | Rollback completo + mensaje de error |
| EB2.9 | Usuario cierra navegador durante creación | Cleanup de recursos huérfanos via job |
| EB2.10 | Múltiples orgs con mismo slug simultáneas | Race condition handled con unique constraint |

---

## Feature 2: Onboarding de Miembros

### Invitación de Miembro

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB3.1 | Email ya es miembro | Error: "Ya es miembro de la organización" |
| EB3.2 | Email tiene invitación pendiente | Error: "Ya tiene una invitación pendiente" + reenviar opción |
| EB3.3 | Link expirado | "Invitación expirada" + request nueva invitación |
| EB3.4 | Link ya usado | "Invitación ya aceptada" + redirect a login |
| EB3.5 | Email inválido | Error: "Formato de email inválido" |
| EB3.6 | Usuario con cuenta existente acepta | Agregar a org sin crear cuenta nueva |
| EB3.7 | Invitación para usuario bloqueado | Error: "No puedes invitar a este usuario" |
| EB3.8 | Múltiples invitaciones mismo email | Solo la última válida, anteriores invalidadas |
| EB3.9 | Usuario abandona durante onboarding | Perfil parcial guardado, puede completar después |
| EB3.10 | Sin responsabilidades seleccionadas | Warning: "Sin responsabilidades el CEO no podrá escalar decisiones" + permitir continuar |

### Definir Responsabilidades

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB4.1 | Sin responsabilidades seleccionadas | Permitir, pero warning sobre impacto en aprobaciones |
| EB4.2 | Áreas de dominio muy largas | Límite 500 caracteres, truncar con "... más" |
| EB4.3 | Caracteres especiales en áreas | Sanitización automática |
| EB4.4 | Responsabilidades duplicadas | De-duplicación silenciosa |
| EB4.5 | Responsabilidades contradictorias | Permitir (ej: "Finanzas" y "Marketing") |
| EB4.6 | Edición durante tarea bloqueada | Actualizar sin afectar flujo actual |
| EB4.7 | Solo un board member con cierta responsabilidad | Warning si queda sin backup |

---

## Feature 3: Kanban Board

### Visualizar Kanban

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB5.1 | Sin tareas | Estado vacío con CTA "Crear primera tarea" |
| EB5.2 | +100 tareas en una columna | Virtualización scroll, lazy loading |
| EB5.3 | Columna vacía | Placeholder con nombre de columna |
| EB5.4 | Título muy largo (más de 100 caracteres) | Truncar con "..." + tooltip |
| EB5.5 | Tarea sin asignee | Badge "Unassigned" con estilo diferente |
| EB5.6 | Múltiples filtros activos | Mostrar chips de filtros activos + clear all |
| EB5.7 | Búsqueda sin resultados | "No se encontraron tareas" + sugerencias |
| EB5.8 | Proyecto sin tareas | Columnas vacías, mensaje "Sin tareas en este proyecto" |
| EB5.9 | Cambio de proyecto con filtros activos | Limpiar filtros automáticamente |
| EB5.10 | Tarea movida a otra org (data corruption) | Log error + mostrar como "Unknown task" |

### Drag & Drop

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB6.1 | Drop en columna inválida | Snap back + shake animation |
| EB6.2 | Tarea en Running | Solo puede moverse a Blocked/Done (no arrastrar a otras) |
| EB6.3 | Tarea bloqueada | Muestra modal "¿Desbloquear y mover?" |
| EB6.4 | Múltiples usuarios moviendo misma tarea | Last write wins + notificación de conflicto |
| EB6.5 | Drag muy rápido (spam) | Debounce de 300ms |
| EB6.6 | Drop en mismo lugar | No hacer nada |
| EB6.7 | Network loss durante drag | Mostrar offline indicator + retry al reconectar |
| EB6.8 | Tarea eliminada por otro usuario mientras drag | Modal "La tarea fue eliminada" + refresh |
| EB6.9 | Drag en mobile | Touch events con long-press para iniciar |
| EB6.10 | Intentar mover a Done sin completar campos requeridos | Modal: "Falta información: [campos]" + opciones |
| EB6.11 | Tarea con dependencias (padres no completados) | Modal: "Tareas padre pendientes: [lista]" + mover a TODO |
| EB6.12 | Hermes Gateway timeout | Retry 3 veces + rollback si falla |

### Crear Tarea

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB7.1 | Título vacío | Error: "El título es requerido" |
| EB7.2 | Título duplicado | Warning: "Ya existe tarea con título similar" + permitir crear |
| EB7.3 | Asignee no existe en Hermes | Error: "Agente no encontrado" + lista de agentes disponibles |
| EB7.4 | Crear en Done directamente | Modal: "¿Crear como completada?" + campos de resultado |
| EB7.5 | Descripción muy larga | Límite 10000 caracteres, contador visible |
| EB7.6 | Prioridad fuera de rango | Auto-normalizar a rango válido (0-10) |
| EB7.7 | Workspace path inválido | Error: "Ruta no válida o inaccesible" |
| EB7.8 | Crear múltiple rápidamente | Queue con límite de 5/min para evitar spam |
| EB7.9 | Cancelar durante sync | Mostrar "Creando..." + no permitir cancelar |
| EB7.10 | Crear tarea con dependencias cíclicas | Error: "Dependencias cíclicas no permitidas" |

---

## Feature 4: Chat con CEO

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB8.1 | Mensaje vacío | No enviar, input focus |
| EB8.2 | Mensaje muy largo (+5000 caracteres) | Dividir en chunks o warning |
| EB8.3 | CEO no responde (timeout 60s) | Mensaje: "El CEO está tardando más de lo usual..." + retry |
| EB8.4 | Hermes Gateway caído | Mensaje: "Error de conexión" + retry manual |
| EB8.5 | Usuario envía durante respuesta | Queue el mensaje, mostrar como pending |
| EB8.6 | Múltiples usuarios chateando | Cada usuario tiene su propia sesión |
| EB8.7 | Sesión expirada | Re-autenticación silenciosa |
| EB8.8 | Mensaje con archivos adjuntos | Por ahora: "Adjuntos no soportados, usa URLs" |
| EB8.9 | CEO menciona tarea inexistente | Frontend maneja gracefully, muestra ID |
| EB8.10 | Historial muy largo (+1000 mensajes) | Paginación con lazy loading |
| EB8.11 | Markdown mal formado | Sanitizar + mostrar como texto plano |
| EB8.12 | Usuario cierra chat durante streaming | Abort request, guardar respuesta parcial |

---

## Feature 5: Gestión de Agentes

### Crear Agente

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB9.1 | Nombre ya existe en la org | Error: "Ya existe un agente con este nombre" |
| EB9.2 | Nombre con caracteres inválidos | Auto-sanitización + warning |
| EB9.3 | SOUL.md muy largo (+50KB) | Error: "Contenido demasiado largo" + límite visible |
| EB9.4 | Skill no instalada | Error: "Skill '[nombre]' no disponible" + lista |
| EB9.5 | MCP server no responde (health check) | Warning: "Servidor MCP no verificable" + permitir continuar |
| EB9.6 | Crear CEO cuando ya existe | Error: "Solo puede haber un CEO por organización" |
| EB9.7 | Asignar toolset bloqueado | Error: "Toolset no disponible para este rol" |
| EB9.8 | Webhook URL inválida | Error: "URL inválida" + validación en tiempo real |
| EB9.9 | Secret del webhook muy débil | Error: "Secret debe tener al menos 16 caracteres" |
| EB9.10 | Crear agente sin Hermes | Error: "Hermes Gateway no disponible" + retry |
| EB9.11 | Múltiples agentes con mismo profile name | Error de unique constraint |
| EB9.12 | Template con configuración inválida | Log error + crear agente básico |

### Editar Agente

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB10.1 | Editar agente mientras trabaja | Aplicar cambios en próxima tarea |
| EB10.2 | Cambiar rol de CEO a worker | Confirmar: "El CEO actual será degradado" + reemplazar |
| EB10.3 | Eliminar skill que está en uso | Warning: "Puede afectar tareas en progreso" + permitir |
| EB10.4 | Modificar MCP durante ejecución | Reiniciar agente en próximo spawn |
| EB10.5 | Agente eliminado mientras se edita | Modal: "El agente fue eliminado" + redirect |
| EB10.6 | Sin cambios al guardar | No hacer nada + mensaje "Sin cambios" |
| EB10.7 | Cambiar nombre a uno existente | Error de validación |
| EB10.8 | Rollback a versión anterior de SOUL | Confirmar + actualizar timestamp |

---

## Feature 6: Sistema de Aprobaciones

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB11.1 | Aprobar tarea ya desbloqueada | Error: "La tarea ya no está bloqueada" |
| EB11.2 | Múltiples board members intentan aprobar | First one wins, otros ven "Ya aprobada por [usuario]" |
| EB11.3 | Rechazar tarea | Tarea vuelve a TODO con comentario + notificar CEO |
| EB11.4 | Aprobar sin comentario | Permitir, comentario opcional |
| EB11.5 | Tarea eliminada mientras se aprueba | Error: "La tarea ya no existe" |
| EB11.6 | Usuario degradado a member durante aprobación | Error de permisos + redirect |
| EB11.7 | Aprobación desde notificación antigua | Verificar estado actual, mostrar error si cambió |
| EB11.8 | Aprobar tarea que requiere otro responsable | Redirigir al responsable correcto |
| EB11.9 | Sin board members disponibles | Escalar al owner + alerta |

---

## Feature 7: Webhooks y Notificaciones

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB12.1 | URL inválida | Validación en tiempo real |
| EB12.2 | URL no HTTPS | Warning: "Se recomienda HTTPS" + permitir |
| EB12.3 | Secret débil | Error: mínimo 16 caracteres |
| EB12.4 | Webhook no responde | 3 reintentos con backoff exponential |
| EB12.5 | Webhook retorna 4xx | Log como failed, no reintentar |
| EB12.6 | Webhook retorna 5xx | Reintentar hasta 3 veces |
| EB12.7 | Timeout del webhook | 10s timeout, marcar como failed |
| EB12.8 | Payload muy grande | Comprimir si es necesario |
| EB12.9 | Múltiples webhooks mismo evento | Ejecutar en paralelo |
| EB12.10 | Webhook eliminado durante entrega | Log error, no reintentar |

---

## Feature 8: Sincronización Hermes

| ID | Caso | Comportamiento Esperado |
|----|------|------------------------|
| EB13.1 | Hermes crea tarea sin proyecto | Asignar a proyecto default |
| EB13.2 | Postgres tarea sin hermes_id | Crear en Hermes |
| EB13.3 | Hermes task no existe en Postgres | Crear con datos mínimos |
| EB13.4 | Datos inconsistentes | Hermes como source of truth |
| EB13.5 | Webhook duplicado | Idempotency key check |
| EB13.6 | Webhook fuera de orden | Ordenar por timestamp |
| EB13.7 | Sync falla repetidamente | Alert + queue para retry |
| EB13.8 | Hermes Gateway reiniciado | Reconnect + full sync |
| EB13.9 | Muchos cambios simultáneos | Batch updates |
| EB13.10 | Conflictos de merge | Last write wins + log |

---

## Resumen por Categoría

| Categoría | Cantidad | Prioridad Testing |
|-----------|----------|-------------------|
| Validación de inputs | 28 | Alta |
| Concurrency/race conditions | 12 | Alta |
| Network failures | 15 | Alta |
| Permisos/autorización | 10 | Alta |
| Data integrity | 14 | Alta |
| UX edge cases | 20 | Media |
| Mobile/responsive | 5 | Media |

**Total casos de borde: 104**

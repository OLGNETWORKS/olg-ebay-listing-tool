# Reglas de trabajo — OLG Listing Tool

## Reglas de producto que no se negocian

1. No publiques, revises, termines ni modifiques cuentas o anuncios reales de eBay sin autorización explícita del usuario para esa acción concreta.
2. Distingue siempre evidencia confirmada de inferencias. Una suposición técnica debe quedar rotulada como tal.
3. El editor guarda un documento JSON por bloques y lo compila a HTML/CSS estático compatible con eBay. El JSON es la fuente editable; el HTML es un artefacto generado.
4. La primera versión es para uso interno de la empresa.
5. Nunca guardes tokens, claves, cookies ni credenciales en Git, briefs, reportes o logs.

## Git y trabajo simultáneo

- Nunca desarrolles directamente sobre `main`.
- Cada IA activa usa su propia rama `task/T<n>-<slug>` y su propio worktree.
- Dos IAs nunca comparten carpeta de trabajo.
- Los worktrees viven fuera de OneDrive, bajo `C:/Users/T14/olg-listing-tool-flota/`, para evitar bloqueos y conflictos de sincronización.
- `integration/mvp-foundation` es la única rama de integración del MVP. Sólo el integrador mezcla tareas allí y lo hace una por una.
- Nadie mezcla su propia rama ni adelanta trabajo de otra tarea.
- Antes de integrar: revisar el diff, confirmar ownership y ejecutar todos los checks del brief.

## Coordinación

- `orchestration/ledger.json` es la única fuente de verdad del estado. El tablero es generado; no se edita a mano.
- Toda tarea necesita un brief en `orchestration/briefs/T<n>.md` con base, rama, worktree, dependencias, ownership, archivos prohibidos, contratos congelados y checks.
- El reporte final de una IA debe incluir `GREEN`, `RED` o `BLOCKED`, SHA, comandos y resultados, `git diff --stat` y desviaciones.
- Si hace falta tocar un archivo fuera del ownership, detente y reporta `BLOCKED`; el integrador decide.
- Las tareas paralelas deben ser independientes y respetar las dependencias del ledger.

## Zonas de exclusión

En una misma oleada sólo una tarea puede ser dueña de cada zona:

- `prisma/**` y migraciones.
- `package.json` y lockfile.
- `src/lib/ebay/contracts/**`.
- `src/lib/compiler/**`.
- Documentos canónicos de arquitectura y `orchestration/ledger.json`.

## eBay y seguridad operacional

- Por defecto se trabaja con adaptadores mock y fixtures locales.
- Sandbox y producción deben usar credenciales distintas.
- `Verify*` o validaciones de sólo lectura se separan de `Add*`, `Revise*`, `End*` y cualquier mutación.
- Una publicación en Sandbox requiere un brief que la autorice y una confirmación humana antes de ejecutarla.
- Producción permanece bloqueada técnicamente y por proceso hasta una autorización explícita del usuario.
- Ningún botón de interfaz debe poder saltarse la vista previa, la validación y la confirmación final.

## Calidad

- Para código nuevo o correcciones: prueba que falle primero, implementación mínima y luego refactor.
- No declares una tarea terminada sin evidencia fresca de sus checks.
- Mantén contratos de dominio separados de los adaptadores de eBay para poder avanzar mientras llega la autorización de la API.


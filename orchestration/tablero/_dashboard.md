# OLG Listing Tool — MVP interno

> Archivo generado desde `orchestration/ledger.json`. No editar manualmente.

- **Base:** main
- **Rama de integración:** integration/mvp-foundation
- **Ruta crítica:** T1 → T2 → T6 → T7 → T8

## Tareas

| ID | Tarea | Estado | Depende de | Rama |
| --- | --- | --- | --- | --- |
| [T1](./T1.md) | Fundación, coordinación y contratos | 🟢 COMPLETED | — | task/T1-foundation |
| [T2](./T2.md) | Base de aplicación, contratos y compilador estático | 🟢 COMPLETED | T1 | task/T2-compiler |
| [T3](./T3.md) | Perfiles internos de producto | 🟢 COMPLETED | T2 | task/T3-profiles |
| [T4](./T4.md) | Shell del editor y preview | ⚪ PENDING | T2 | task/T4-editor-ui |
| [T5](./T5.md) | Gateway mock y trabajos de publicación | ⚪ PENDING | T2 | task/T5-mock-gateway |
| [T6](./T6.md) | Flujo vertical interno | ⚪ PENDING | T2, T3, T4, T5 | task/T6-vertical-slice |
| [T7](./T7.md) | E2E, accesibilidad y guardas de seguridad | ⚪ PENDING | T6 | task/T7-quality-gates |
| [T8](./T8.md) | OAuth y gateway eBay Sandbox | 🟠 BLOCKED_BY_HUMAN | T7 | task/T8-ebay-sandbox |

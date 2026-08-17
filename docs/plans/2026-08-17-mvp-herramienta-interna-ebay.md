# Plan del MVP — herramienta interna de anuncios eBay

Fecha: 17 de agosto de 2026.

## Resultado buscado

Una aplicación interna que permita crear un perfil de producto, diseñar su descripción mediante bloques, previsualizar exactamente el HTML estático resultante, validarlo y preparar una publicación. La publicación real queda bloqueada; primero se conecta un gateway mock y después eBay Sandbox cuando existan credenciales aprobadas.

## Evidencia confirmada y decisiones

### Confirmado

- El análisis técnico y de producto está en `FROOITION_RADIOGRAFIA_Y_PRODUCTO.md`.
- La primera versión será para uso interno.
- Ya existe un diseño final de anuncio Garmin que sirve como referencia visual.
- La autorización de eBay Developer todavía estaba pendiente al definir este plan.
- OLGmail usa con éxito worktrees separados, una rama de integración, ownership por rutas, briefs y un ledger canónico para coordinar varias IAs.

### Decisiones de producto

- El documento editable es JSON por bloques; el HTML/CSS es compilado y nunca se edita como fuente primaria.
- El núcleo de dominio no depende de la API de eBay.
- El adaptador inicial es mock.
- El HTML generado no usa JavaScript, formularios, iframes, recursos inseguros ni comportamiento sticky.
- Producción se mantiene bloqueada hasta autorización explícita del usuario y una tarea posterior específica.

### Inferencias por validar

- Trading API probablemente será necesaria para compatibilidad amplia con listings existentes.
- Inventory API puede añadirse después para catálogos estructurados, pero no se elige hasta validar las necesidades reales de la cuenta.
- La plantilla Garmin puede convertirse en el primer tema reusable, sujeto a revisar el ZIP y sus recursos.

## Contratos congelados del primer corte

```text
ListingProfile
  identity + commercial + logistics + media + descriptionDocument

DescriptionDocument
  schemaVersion + theme + blocks[]

Compiler
  DescriptionDocument -> { html, css, warnings, errors }

ListingGateway
  validateDraft(profile) -> ValidationResult
  publishDraft(profile, approval) -> PublishResult
```

`publishDraft` no puede existir como llamada directa desde componentes de interfaz. Debe pasar por una capa de aplicación que compruebe entorno, autorización y confirmación humana.

## Oleadas de trabajo

### Oleada 0 — Fundación

- **T1 Coordinación y contratos:** reglas, ledger, briefs, tablero y contratos de dominio iniciales.

### Oleada 1 — Núcleo paralelo

- **T2 Compilador:** esquema de bloques, validador y compilador HTML/CSS estático.
- **T3 Perfiles:** modelo y persistencia local de perfiles internos, sin eBay.
- **T4 Interfaz:** shell del editor, biblioteca de bloques y preview con datos fixture.
- **T5 Gateway mock:** validación y simulación de trabajos de publicación sin red.

T2–T5 arrancan después de T1 y tienen ownership separado.

### Oleada 2 — Ensamble

- **T6 Flujo vertical interno:** crear perfil → diseñar → preview → validar → publicar en mock → ver resultado.
- **T7 Calidad y seguridad:** pruebas end-to-end, accesibilidad, sanitización y prueba de que producción queda bloqueada.

### Oleada 3 — eBay Sandbox

- **T8 OAuth y gateway Sandbox:** sólo cuando eBay apruebe las credenciales. Primero validación; cualquier publicación de prueba requiere confirmación humana explícita.

## Criterios para considerar listo el MVP interno

- El mismo JSON produce el mismo HTML de forma determinista.
- La plantilla se ve bien en desktop y móvil sin JavaScript.
- El validador rechaza contenido incompatible o inseguro.
- Se puede completar el recorrido interno usando exclusivamente el gateway mock.
- Ninguna configuración local permite escribir accidentalmente en producción.
- Cada tarea tiene ownership, pruebas, reporte y merge verificado en la rama de integración.


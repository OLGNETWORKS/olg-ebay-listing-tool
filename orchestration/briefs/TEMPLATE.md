# T<n> — <nombre>

**Rama:** `task/T<n>-<slug>` · **Worktree:** `C:/Users/T14/olg-listing-tool-flota/w-T<n>/repo` · **Base:** `integration/mvp-foundation@<sha>`

Trabajas junto a otras IAs. No reviertas cambios ajenos y adapta tu trabajo a lo ya integrado.

## Objetivo

<resultado comprobable>

## Dependencias y contratos congelados

- <dependencia>
- <firma o esquema que no puede cambiar>

## Tu ownership — nada fuera

```text
<rutas permitidas>
```

## Prohibido

- Modificar cualquier archivo fuera del ownership.
- Escribir en eBay real.
- Usar credenciales o secretos en fixtures o logs.
- Mezclar la rama propia o la rama de integración.

## TDD y verificación

1. Añade una prueba mínima y ejecútala para observar el fallo correcto.
2. Implementa lo mínimo para pasarla.
3. Ejecuta los checks completos de esta tarea.

```powershell
<comandos exactos>
```

## Reporte

`GREEN|RED|BLOCKED`; SHA; salida de checks; `git diff --stat`; desviaciones. Un solo commit: `[T<n>] <nombre>`.


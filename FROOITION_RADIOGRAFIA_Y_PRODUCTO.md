# Radiografía de Frooition y propuesta de un producto mejor

Fecha de investigación: 17 de agosto de 2026.

## Objetivo

Construir una plataforma de publicación y diseño para eBay superior a Frooition: más moderna, segura, escalable y fácil de usar, con publicación masiva, edición visual y validación automática.

## Radiografía técnica observada

La inspección se realizó en modo de solo lectura. No se publicaron, modificaron ni eliminaron anuncios, y tampoco se renovaron tokens.

### Arquitectura general

```text
Interfaz PHP/jQuery
        ↓
Perfiles internos de productos
        ↓
Endpoints PHP de publicación y revisión
        ↓
Cola dividida en bloques de 50 perfiles
        ↓
Trabajadores en AWS Lambda
        ↓
API de eBay
        ↓
Resultados individuales, registros y reintentos
```

### Elementos confirmados directamente

- Frooition mantiene perfiles internos independientes de los anuncios activos de eBay.
- El editor masivo guarda cambios por `profile_id` mediante `_ajax.php?action=bulkEditSave`.
- La publicación masiva nueva usa `_ajax_bulk_list_lambda.php`.
- Los anuncios se agrupan por cuenta de eBay y se envían en bloques internos de 50 perfiles.
- La interfaz indica explícitamente que el procesamiento se realiza mediante Lambda.
- El estado del trabajo se consulta periódicamente y registra éxito, error, mensaje e Item ID por anuncio.
- La revisión masiva sigue un flujo de filtros, preparación de lote, trabajo de fondo, registro de errores y restauración cuando es posible.
- Coexisten un motor antiguo que publica perfil por perfil y un motor nuevo basado en lotes y Lambda.

### API de eBay identificada

El núcleo presenta señales muy fuertes de la eBay Trading API:

- `ItemID`
- `ListingDetails.ViewItemURL`
- `SellingStatus.CurrentPrice`
- `PictureDetails.GalleryURL`
- errores con `LongMessage`
- campos y semántica equivalentes al modelo clásico `Item`

Las operaciones más probables son `AddItem`, `AddFixedPriceItem`, `ReviseItem`, `ReviseFixedPriceItem` y consultas como `GetMyeBaySelling`.

El flujo observado no se parece al principal de Sell Feed API, que crea tareas y sube archivos. Tampoco coincide totalmente con el modelo Inventory Item + Offer de Inventory API. Es posible que Frooition use APIs adicionales en módulos recientes, pero Trading API es la explicación de mayor confianza para su publicación y revisión principales.

### Aspectos que no se pudieron confirmar

- Servicio exacto de cola entre PHP y Lambda; SQS es posible, pero no está comprobado.
- Motor de base de datos.
- Lenguaje y código de las funciones Lambda.
- Uso de Inventory API en módulos secundarios.

## Sistema de diseño de Frooition

Frooition parece utilizar un ensamblador de HTML más que un diseñador visual moderno:

- Plantillas HTML/CSS prediseñadas.
- Editor WYSIWYG, con señales de Summernote.
- Macros como `{{TITLE}}` y `{{DESCRIPTION}}` para herramientas externas.
- Galerías, pestañas del vendedor, promociones y cajas HTML en posiciones predefinidas.
- Selección de tema y opciones de visibilidad.
- Generación de una descripción HTML monolítica para aplicar al anuncio.
- Imágenes, logos y recursos alojados externamente.

Esta arquitectura explica por qué el editor se siente limitado: el usuario configura una plantilla existente, pero no compone libremente un diseño mediante componentes modernos.

## Propuesta para superarlo

### Concepto

Crear un "Canva especializado para eBay": un editor visual moderno cuya salida sea HTML/CSS estático, seguro y compatible con las políticas de eBay.

```text
Editor de bloques
      ↓
Documento JSON estructurado
      ↓
Compilador especializado para eBay
      ↓
HTML/CSS estático, aislado y validado
      ↓
Vista previa precisa
      ↓
Aplicación individual, gradual o masiva
```

### Componentes sugeridos

- Encabezado de marca.
- Galería de producto.
- Beneficios principales.
- Descripción enriquecida.
- Tabla de especificaciones.
- Compatibilidad y fitment.
- Contenido de la caja.
- Estado del producto.
- Envíos y devoluciones.
- Preguntas frecuentes.
- Confianza, garantías e información legal.
- Productos relacionados permitidos por eBay.

### Stack recomendado

- React y Next.js para la aplicación.
- GrapesJS personalizado como base del editor drag and drop.
- Lexical para edición de texto enriquecido dentro de los bloques.
- JSON como fuente de verdad; nunca guardar únicamente HTML.
- Compilador propio de JSON a HTML compatible con eBay.
- Sanitizador estricto de etiquetas, atributos, enlaces y CSS.
- PostgreSQL para perfiles, plantillas, versiones, trabajos y resultados.
- S3 y CloudFront para recursos de marca e imágenes.
- SQS y Lambda, o una cola equivalente, para publicación y revisión masivas.

### Diferenciadores

- Vista previa para escritorio y móvil.
- Simulación del HTML después de la sanitización de eBay.
- Detector de JavaScript, formularios, scripts, enlaces o contenido prohibido.
- CSS aislado para evitar conflictos.
- Auditoría de accesibilidad, contraste, textos alternativos y peso del HTML.
- Detección de imágenes rotas y URLs no HTTPS.
- Variables globales de marca: colores, tipografía, radios y espaciado.
- Historial, comparación visual, deshacer y rollback.
- Aplicación gradual a un grupo pequeño antes del despliegue masivo.
- Plantillas actualizables sin destruir la descripción original del producto.
- Conversión de plantillas antiguas de Frooition a componentes estructurados.
- Generación asistida por IA a partir de logo, colores, fotografías y categoría.
- Pruebas A/B y métricas para relacionar diseño con conversión.

## Restricciones de eBay que debe respetar el compilador

- No depender de JavaScript, Flash, formularios activos ni scripts remotos.
- Generar HTML/CSS estático y adaptable a móvil.
- Usar dimensiones relativas cuando corresponda.
- Alojar imágenes y recursos permitidos mediante HTTPS.
- Respetar las políticas de enlaces y mantener el contenido relacionado con el producto.
- Validar el límite total de caracteres, incluyendo las etiquetas HTML.

## Primer MVP recomendado

1. Conexión OAuth con eBay.
2. Importación de anuncios y productos mediante eBay y CSV.
3. Perfiles internos independientes de los anuncios activos.
4. Editor visual con 8-10 bloques controlados.
5. Compilador y validador de compatibilidad con eBay.
6. Vista previa móvil y de escritorio.
7. Publicación de prueba individual.
8. Sistema de trabajos, resultados por anuncio y reintentos seguros.
9. Aplicación por lotes con despliegue gradual y rollback.

## Siguiente decisión de producto

Definir el alcance del MVP y diseñar formalmente:

- el modelo JSON de las plantillas;
- los primeros componentes del editor;
- la arquitectura de perfiles y trabajos;
- la estrategia de integración con Trading API e Inventory API;
- el prototipo visual del editor.

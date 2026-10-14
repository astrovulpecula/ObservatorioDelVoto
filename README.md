# Observatorio del voto · 29N

Dashboard web estático y sin dependencias para seguir y comparar encuestas de intención de voto de las **elecciones generales españolas del 29 de noviembre de 2026**.

**Estado de los datos:** corte manual del **14 de octubre de 2026**. Contiene **35 encuestas nacionales** publicadas desde el 1 de septiembre por **18 institutos**. La fecha del sondeo y la de su publicación se distinguen en la ficha individual. Incluye el CIS. La web NO busca encuestas automáticamente.

## Publicar gratis en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo, `Observatorio-del-voto`).
2. Sube **todo el contenido de esta carpeta** a la raíz de la rama `main`: `index.html`, `app.js`, `styles.css`, `data/`, `assets/`, `scripts/`, `.nojekyll`, etc. Es importante que `index.html` quede en la **raíz**, no dentro de otra carpeta.
3. En GitHub abre **Settings → Pages**. En **Build and deployment**, elige **Deploy from a branch**; selecciona rama **main** y carpeta **/(root)** y guarda.
4. La página se publicará en `https://TU_USUARIO.github.io/Observatorio-del-voto/`. Si el repositorio es `TU_USUARIO.github.io`, quedará en `https://TU_USUARIO.github.io/`.

No requiere Vite, npm, backend, base de datos, tokens ni claves. También puedes abrir `index.html` directamente en el navegador para verla localmente.

## Estructura

- `index.html`: estructura del dashboard, páginas, accesibilidad y textos editoriales.
- `styles.css`: diseño responsive, tema claro y colores de los principales partidos.
- `app.js`: cálculos de promedios, filtros, gráficos SVG, comparación, tablas, fichas y descarga CSV.
- `data/polls.json`: **archivo fuente para editar las encuestas**. Las fechas están en formato ISO `AAAA-MM-DD`.
- `data/polls.js`: copia generada automáticamente para que la web funcione incluso desde `file://`.
- `scripts/sync-data.py`: valida y sincroniza los datos JSON a JS con Python 3 (sin paquetes externos).
- `.github/workflows/validate.yml`: comprobaciones automáticas en cada push.
- `assets/favicon.svg`: favicon original del proyecto.

## Añadir o actualizar encuestas

1. Edita `data/polls.json`. Copia un objeto existente dentro del array `polls` y cambia los campos. Da a cada encuesta un `id` **único**.
2. Completa `pollster`, `publisher`, `category`, `published`, `fieldworkStart`, `fieldworkEnd`, `sample`, `vote` (`PP`, `PSOE`, `VOX`, `SUMAR`), `seats` (solo si se publican), `sourceUrl` y `sourceType`.
3. Una encuesta nueva sin proyección de escaños debe llevar `"seats": {}`. **No inventes escaños** a partir de porcentajes nacionales. Si la proyección se da en un intervalo, en `seats` puedes introducir el punto medio y en `seatIntervals` el rango original.
4. Actualiza el límite `metadata.to` y `metadata.lastUpdated` a la última fecha incorporada. Si quieres modificar el texto fijo «Último corte de datos» del HTML y el nombre del archivo CSV exportado, edita también `index.html` y `app.js`.
5. Ejecuta desde la raíz del proyecto: `python3 scripts/sync-data.py`.
6. Sube **ambos** archivos `data/polls.json` y `data/polls.js` a GitHub. Los gráficos se recalculan al cargar la página.

El repositorio incluye un flujo de comprobación que te avisará si `data/polls.js` no coincide con `data/polls.json`.

## Metodología

Por defecto, la media de intención de voto usa una única encuesta —la última publicada— por cada instituto demoscópico dentro del periodo. Cada instituto tiene el mismo peso. Existe otra opción para incluir todas las publicaciones por igual, más el filtro para mostrar u ocultar el CIS. **Ninguna de las dos es un pronóstico oficial ni un modelo probabilístico**.

Las cifras de voto se muestran para PP, PSOE, Vox y Sumar. «Resto» es el porcentaje restante hasta 100 e incluye otros partidos nacionales y territoriales, incluido Podemos. Es una agrupación visual y no una estimación específica de un partido.

El bloque de escaños es la media de las **proyecciones publicadas**, no una transformación matemática del promedio de voto. Donde existe una horquilla de escaños, para la media se emplea su punto medio y la gráfica de rango utiliza los límites originales. El remanente hasta los 350 se identifica como «Otros». Debido a que los intervalos y las proyecciones de distintas empresas no son un modelo electoral coherente común, el resultado agregado es **ilustrativo**.

El estudio nacional del CEO catalán queda fuera de la media porque su universo es Cataluña y no España.

Los sondeos están fechados por **publicación** y también tienen la fecha de campo. Se excluyen reestimaciones independientes sobre la misma muestra del CIS y encuestas internas partidistas sin porcentajes completos. La fuente `sourceType: "recopilacion"` identifica enlaces de archivo secundarios que se deberán sustituir por enlaces directos si están disponibles.

## Precisión y revisión

Las publicaciones originales pueden actualizar cifras, títulos o estimaciones, y algunos resúmenes son de acceso restringido. El archivo es una recopilación editorial de datos y debe revisarse regularmente con fichas técnicas de los institutos. No repliques cifras de portada que sean escaños como si fueran porcentajes. Para comprobar la procedencia general:

- [CIS — catálogo de estudios](https://www.cis.es/es/estudios/catalogo)
- [Convocatoria oficial — BOE 806/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-20742)
- [Histórico recopilatorio — Wikipedia](https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Spanish_general_election)

## Consideración legal sobre encuestas

Durante los **cinco días anteriores a la votación** existe una restricción legal a publicar o difundir sondeos electorales en España (LOREG art. 69.7). Antes de mantener un sitio público activo durante ese periodo, revisa la aplicación de la normativa con asesoramiento jurídico. Este repositorio constituye un corte de datos de octubre.

## Licencia

Código de la web: MIT (ver `LICENSE`). Los datos originales y los nombres comerciales pertenecen a sus respectivos titulares; los enlaces están aportados con fines de identificación y verificación.


## Interacciones

El simulador de mayorías permite arrastrar o seleccionar PP, PSOE, Vox y Sumar para comprobar el umbral aritmético de 176 escaños. Los valores proceden del reparto ilustrativo; «Resto» agrupa varias formaciones y no se ofrece como bloque seleccionable. No modela pactos ni predice un gobierno.

El apartado **Última actualización** utiliza automáticamente las encuestas contenidas en `data/polls.json`, mostrando fecha de publicación, medio e instituto. Para las nuevas incorporaciones se recomienda establecer el campo opcional `addedAt` (`AAAA-MM-DD`) con la fecha de subida al archivo; cuando falta, se ordena por publicación.

Los meses del archivo, la fecha de corte visible y la escala temporal se actualizan cuando se regeneran los datos.

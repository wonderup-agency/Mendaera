# perf/ — auditoría de performance

Medido el 2026-08-21 sobre `https://mendaera-wup.webflow.io/` (staging).

| Página | Score mobile hoy | Desktop |
|---|---|---|
| Home | **34** | 60 |
| About | 41 | 92 |
| News & Events | 42 | 79 |
| Technology | 55 | 88 |
| Press release (template) | 61 | 77 |

Con todo lo de esta carpeta aplicado, Home mobile: **34 → 66**. Sacando también
Intellimize, **71**. Medido sobre una copia local parcheada de la misma página, no
sobre el sitio publicado — para eso está `audit/`.

Informe completo con capturas: el artifact de la auditoría.

---

## `webflow/` — un archivo por campo de custom code

Se pegan tal cual, sin editar nada:

| Archivo | Dónde va |
|---|---|
| `head-sitewide.html` | Project settings → Custom code → **Head** |
| `footer-sitewide.html` | Project settings → Custom code → **Footer** (reemplaza todo) |
| `head-home.html` | Home → Page settings → **Inside `<head>`** |
| `footer-home.html` | Home → Page settings → **before `</body>`** |
| `footer-technology.html` | Technology → **before `</body>`** |
| `head-technology.md` | Technology → borrar `chart.js` del head |
| `footer-about.html` | About → **before `</body>`** |
| `footer-news-events.html` | News & Events → **before `</body>`** |
| `footer-press-template.html` | Template de press release → **before `</body>`** |

Los `footer-*` ya vienen con el JS de cada página incrustado.

**Es carpeta generada.** Se rearma con `./build.sh`, que compone desde las fuentes
canónicas en `../../mendaera/custom-code/` (misma idea que `scripts/sync.sh`). Si
vas a editar algo que quede versionado, editá la fuente y volvé a correr el build.

Lo que resuelven estos bloques:

- **Finsweet por página** — hoy el footer site-wide pide 5 módulos en las 5
  páginas. Home solo tiene 2 `fs-list-field` en divs `.hide`, sin filtro ni
  paginación: el módulo no hace nada y cuesta **1.727 ms de TBT y 27 puntos**.
  About no usa ninguno. Technology usa `fs-scrolldisable`, que ni se pedía.
- **SplitText y Flip solo en Home** — se cargaban en las 5 páginas. Ojo: el
  `registerPlugin` del site-wide los nombraba, así que sacarlos sin corregir ese
  bloque tira `ReferenceError` y rompe el fade-up. Ya está resuelto.
- **Lenis** — sin loop manual de rAF, sin `querySelector` por evento de scroll,
  sin estilos inline, y respeta `prefers-reduced-motion`.
- **Video** — desarma los `<video>` durante el parseo y parchea `play()`, así los
  25+ call sites existentes no cambian. Saca **11 MB** de la cola antes del primer
  pixel de contenido.
- **chart.js** fuera del `<head>` de Technology y el CSS de Swiper inline.

## `audit/` — harness de medición

Los tres scripts con los que se midió todo esto, para volver a medir después de
publicar. Ver `audit/README.md`.

```bash
cd perf/audit && npm install
node lighthouse.mjs          # el score, mediana de 3 corridas
node waterfall.mjs           # por qué: bytes antes del FCP, con throttling aplicado
node filmstrip.mjs           # cómo se ve: capturas cada 400 ms
```

## `PASO-B-posters.md` — los posters

Las 18 URLs a reemplazar en el Designer. **No hay que subir archivos**: Webflow ya
hostea una variante `-p-1080.avif` de cada imagen, y el `poster` es un custom
attribute. 2.782 KB → 501 KB.

## `assets/fonts-woff2/` — las fuentes

Las 14 fuentes convertidas de OTF a WOFF2. **Leer `UPLOAD.md` antes de subirlas**:
los nombres internos declaran 6 familias distintas y si se acepta la familia que
auto-detecta Webflow, el CSS actual deja de encontrar los pesos. Ahí está la tabla
de family/weight/style sacada de los `@font-face` que sirve hoy el sitio.

Verificadas: mismas tablas y métricas que los OTF, y renderizado **pixel a pixel
idéntico** en Chrome en 336 comparaciones (`audit/fonts.mjs` lo reproduce).

El ahorro real es modesto (252 → 207 KB transferidos: el CDN ya sirve los OTF con
brotli, y midió 0 puntos de score). Lo que hoy las hace lentas no es el formato, es
que el video les come el ancho de banda y llegan a los 9 segundos.

---

## Falta, y necesita el Designer

1. Pegar los 9 archivos de `webflow/`.
2. Las 18 URLs de poster (`PASO-B-posters.md`).
3. **Renditions de Vimeo**: hay un video de **244 MB** en Technology, 94 MB en Home
   y 42 MB en About, todos en `rendition/2160p`. Total del sitio: 467 MB. Las URLs
   van firmadas por rendition, así que hay que sacar las nuevas de Vimeo.
4. Subir las WOFF2.
5. Dos `<video>` de Home comparten `id="new-hero-video"` — HTML inválido, y los dos
   con `autoplay`, así que el oculto en el breakpoint actual también se descarga.
6. `web.goodweb.host` en el template de press release: CSS bloqueante de terceros
   en el head, es la razón del FCP de 5,4 s de esa página.

## Descartado, con la medición que lo descarta

- **Reescribir el `poster` desde JS**: va en el tag de apertura del `<video>`, el
  fetch sale al crear el elemento. Se descargan las dos versiones (576 + 28 KB).
- **Bajar la rendition desde JS** al reponer el `src`: las URLs de
  `progressive_redirect` van firmadas por rendition. `1080p`, `720p`, `540p` y
  `360p` devuelven **403** las cuatro.
- **`defer` en las libs de GSAP**: medido, 0 puntos de diferencia.
- **Simplificar animaciones en mobile**: sin sentido una vez sacado Finsweet, el
  TBT ya es 0 ms.

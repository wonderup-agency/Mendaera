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
- **La cortina de Intellimize** — la integración de Webflow Optimize pone
  `anti-flicker` en `<html>` con `visibility: hidden !important` sobre *todo*, y
  la saca cuando termina de bajar su snippet de 86 KB o a los 4.000 ms. En About
  con slow 4G eso deja la página entera invisible **3,5 s**, a cualquier altura
  de scroll. El bloque nuevo del head la corta a 600 ms. Ver más abajo.

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

## About: por qué queda en blanco al scrollear

Medido el 2026-08-22 sobre staging, slow 4G / 4× CPU (`audit/about-blank.mjs`,
`audit/about-scroll.mjs`, `audit/about-vision.mjs`).

**1. La cortina de Intellimize — 3,5 s de página invisible.** Es el blanco que se
ve. No son las fuentes, ni las imágenes, ni GSAP: la integración de Webflow
Optimize inyecta en el head

```html
<style>.anti-flicker, .anti-flicker * {visibility: hidden !important; opacity: 0 !important;}</style>
<script>… n.className += " anti-flicker"; setTimeout(… , 4000) …</script>
```

y la clase sale recién cuando termina de bajar `cdn.intellimize.co/snippet/…js`
(86 KB) o a los 4.000 ms. Como cuelga de `<html>`, tapa la página completa a
cualquier altura de scroll. La medición: `body.visibility` pasa de `hidden` a
`visible` a los **3.512 ms** y el primer pixel de contenido cae en el **mismo
milisegundo**. Bloqueando el snippet, primer pixel a 1.252 ms.

Y no está tapando nada. En las 5 páginas:

- `intellimize.getSelectedVariationIds()` → `undefined`
- `getActivities()` → sólo eventos `pv` (pageview)
- `[data-wf-hidden-variation]` → 0 elementos
- el DOM es nodo por nodo idéntico con el snippet bloqueado

O sea: hoy no hay ningún experimento corriendo, y se pagan 4 segundos de cortina
para no parpadear una variante que no existe.

El bloque nuevo del `head-sitewide.html` la corta a 600 ms. Verificado sirviendo
el HTML real con el bloque inyectado en la posición que ocupa hoy el snippet
(`audit/about-blank-patched.mjs`): primer pixel **3.464 → 2.109 ms**. El piso son
~1,2 s, que es cuando llega el CSS; los 600 ms de más son el margen para que un
experimento futuro alcance a aplicarse en una conexión rápida.

**El fix bueno es apagar la integración en Webflow** si nadie usa Optimize: se
van además los 86 KB de JS bloqueante y los 6 puntos de score. El bloque del head
es lo que hay que dejar si el tracking de pageviews tiene que seguir.

**2. El poster de Vision — 460 KB.** Es el "y luego carga". El `<video>` de la
sección Vision tiene `poster="…_thumb (17).jpg"`, 460 KB, y compite con las
fuentes: termina a los 7,0 s en mobile y 8,3 s en desktop. La variante
`-p-1080.avif` que Webflow ya hostea pesa **26 KB**. Está en `PASO-B-posters.md`,
sin aplicar.

Con las dos cosas juntas (cap + poster), la sección Vision pasa de aparecer a los
**8,5 s** a aparecer a los **3,0 s**.

**3. Los 74 MB de video de About.** Vision es `rendition/2160p`, **42,5 MB**, y
tiene `data-play-on-view="true"`: arranca a descargar en cuanto entra al 50 % del
viewport y se come todo el ancho de banda — las fotos del equipo no llegan hasta
los 11-15 s. Después de 19 s bajando, `readyState` sigue en 0: no hay ni un frame
para mostrar. El segundo video (Josh DeFonzo) es `rendition/1080p`, **31,7 MB**.
Necesita renditions nuevas de Vimeo (punto 3 de la lista de abajo); el poster de
26 KB tapa el síntoma visible, no el consumo.

Detalle aparte, menor: los dos `<video>` de About comparten `id="home-vid"`. HTML
inválido, igual que el `new-hero-video` duplicado de Home. No rompe nada porque
el JS los toma por `data-home-video`.

**4. El parpadeo del poster (arreglado en `about-page.js`).** El `poster` es un
atributo del `<video>`, así que el elemento lo pinta sólo mientras
`readyState < HAVE_CURRENT_DATA`. En el primer frame repinta y el poster
desaparece para siempre — y la rendition 2160p se corta todo el tiempo en mobile.
Traza en prod, slow 4G (`audit/about-poster.mjs`):

```
 3394  waiting        readyState=0     ← play(), no hay nada para mostrar
 8990  loadedmetadata readyState=1
 9232  PRIMER FRAME
 9682  waiting        readyState=2     ← se cortó
13317  playing
13798  waiting        readyState=2     ← se cortó
20194  playing
```

O sea: reproduce 450 ms, se corta 3,6 s, reproduce 480 ms, se corta 6,4 s. Eso es
el "veo el poster, blanco y el video".

El fix pinta el mismo poster como `background-image` del
`[data-home-video="wrapper"]`, o sea **debajo** del video, y arranca el `<video>`
en `opacity: 0`. Se revela con un fade de 0,4 s recién cuando hay un frame de
verdad (`requestVideoFrameCallback`, con `loadeddata` de fallback). Ya no puede
aparecer nada blanco: el poster está siempre pintado atrás. Verificado con
`audit/about-fade.mjs` (la opacidad va 0 → 1 exactamente en el primer frame) y
`audit/about-fade-visual.mjs` (el encuadre del background coincide con el
`object-fit: cover` del video, 744×424 en los dos casos).

El atributo `poster` se deja puesto a propósito: antes de la metadata es lo que
le da al `<video>` su relación de aspecto, y sacarlo colapsa la caja de 16:9 al
2:1 por defecto.

**Ojo con el poster**: en prod quedó `_thumb (17).avif` (3840×2160, 100 KB), no
`_thumb (17)-p-1080.avif` (1080×608, 26 KB). Cambiar sólo la extensión baja los
bytes pero no los píxeles: son 8,3 MP para una caja de 372×209, ~33 MB de bitmap
decodificado en el teléfono. La regla de `PASO-B-posters.md` es insertar
`-p-1080` **además** de cambiar la extensión.

**Los IDs de Vimeo de About**, para subir renditions más chicas:

| Sección | ID de Vimeo | Hoy |
|---|---|---|
| Vision (autoplay al entrar en viewport) | `1168246536` | `rendition/2160p`, 42,5 MB |
| Josh DeFonzo (click to play) | `1097555268` | `rendition/1080p`, 31,7 MB |

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
7. **Decidir si Webflow Optimize / Intellimize se queda.** Hoy no corre ningún
   experimento y cuesta 3,5 s de página invisible más 86 KB de JS. Si se apaga,
   sobra el bloque de anti-flicker del head.

## Descartado, con la medición que lo descarta

- **Reescribir el `poster` desde JS**: va en el tag de apertura del `<video>`, el
  fetch sale al crear el elemento. Se descargan las dos versiones (576 + 28 KB).
- **Bajar la rendition desde JS** al reponer el `src`: las URLs de
  `progressive_redirect` van firmadas por rendition. `1080p`, `720p`, `540p` y
  `360p` devuelven **403** las cuatro.
- **`defer` en las libs de GSAP**: medido, 0 puntos de diferencia.
- **Simplificar animaciones en mobile**: sin sentido una vez sacado Finsweet, el
  TBT ya es 0 ms.

#!/usr/bin/env bash
# Builds the Webflow custom-code blocks into webflow/, ready to paste.
# Same idea as scripts/sync.sh: the canonical source lives outside this repo and
# the assembled copy lands here. To change something tracked, edit the source and
# re-run this.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$HERE")"
CC="$(dirname "$REPO")/mendaera/custom-code"
SRC="$CC/perf"
OUT="$HERE/webflow"
GSAP="https://cdn.prod.website-files.com/gsap/3.15.0"
FS="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"

for f in "$SRC/head-perf.html" "$SRC/footer-lenis.js" "$SRC/nav-hide.css" "$CC/home.js" "$CC/careers/custom.js"; do
  [ -f "$f" ] || { echo "missing source: $f" >&2; exit 1; }
done

mkdir -p "$OUT"

# ---------- HEAD site-wide ----------
{
  echo '<!-- HEAD SITE-WIDE · Project settings > Custom code > Head'
  echo '     Add at the top of the field, before whatever is already there. -->'
  echo
  cat "$SRC/head-perf.html"
  echo
  echo '<style>'
  cat "$SRC/nav-hide.css"
  echo '</style>'
} > "$OUT/head-sitewide.html"

# ---------- FOOTER site-wide ----------
{
  echo '<!-- FOOTER SITE-WIDE · Project settings > Custom code > Footer'
  echo '     Reemplaza TODO el contenido actual de ese campo.'
  echo
  echo '     Cambios respecto de lo que hay hoy:'
  echo '      - SplitText y Flip salen de aca: solo los usa home.js. Pasan al'
  echo '        footer de Home. registerPlugin queda solo con ScrollTrigger,'
  echo '        si no las otras paginas tiran ReferenceError.'
  echo '      - El tag de Finsweet sale de aca y va por pagina. En Home y'
  echo '        About no va. Es el cambio de +27 puntos en Home.'
  echo '      - Lenis: version sin loop manual de rAF, sin querySelector por'
  echo '        evento de scroll y sin estilos inline. -->'
  echo
  echo "<script src=\"$GSAP/gsap.min.js\"></script>"
  echo "<script src=\"$GSAP/ScrollTrigger.min.js\"></script>"
  echo '<script>gsap.registerPlugin(ScrollTrigger)</script>'
  echo
  echo '<script src="https://unpkg.com/lenis@1.2.3/dist/lenis.min.js"></script>'
  echo '<script>'
  cat "$SRC/footer-lenis.js"
  echo '</script>'
  echo
  echo '<script>'
  cat "$SRC/_block-testenv.js"
  echo '</script>'
  echo
  echo '<script>'
  cat "$SRC/_block-fadeup.js"
  echo '</script>'
} > "$OUT/footer-sitewide.html"

# ---------- HEAD de Home ----------
{
  echo '<!-- HEAD DE HOME · Page settings > Inside <head> tag'
  echo '     Reemplaza el <link> del CSS de Swiper, que bloqueaba el render'
  echo '     761 ms por abrir conexion a jsdelivr antes del primer paint. -->'
  echo '<style>'
  cat "$HERE/assets/swiper-bundle.min.css"
  echo '</style>'
} > "$OUT/head-home.html"

# ---------- FOOTER de Home ----------
{
  echo '<!-- FOOTER DE HOME · Page settings > before </body>'
  echo '     SplitText y Flip vienen aca porque solo Home los usa. El footer'
  echo '     site-wide ya cargo gsap, y home.js hace registerPlugin con los'
  echo '     tres en su linea 3. Finsweet NO va en Home. -->'
  echo
  echo "<script src=\"$GSAP/SplitText.min.js\"></script>"
  echo "<script src=\"$GSAP/Flip.min.js\"></script>"
  echo '<script src="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js"></script>'
  echo
  echo '<script>'
  cat "$CC/home.js"
  echo '</script>'
} > "$OUT/footer-home.html"

# ---------- FOOTER de Technology ----------
{
  echo '<!-- FOOTER DE TECHNOLOGY · Page settings > before </body>'
  echo '     chart.js baja del <head> a aca: bloqueaba el render con 71 KB.'
  echo '     Tiene que quedar ANTES de tech.min.js, que lo usa.'
  echo '     Finsweet NO va aca: ya esta aplicado en el <head> de la pagina con'
  echo '     fs-scrolldisable, y desde ahi funciona (verificado en vivo). -->'
  echo
  echo '<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/gh/wonderup-agency/Mendaera@3fea41f/tech.min.js"></script>'
  echo
  echo '<!-- Al cambiar tech.js hay que commitear, minificar y actualizar el'
  echo '     hash del pin de jsDelivr en la linea de arriba. -->'
} > "$OUT/footer-technology.html"

# ---------- FOOTER de About ----------
{
  echo '<!-- FOOTER DE ABOUT · Page settings > before </body>'
  echo '     About no usa ningun atributo fs-: aca NO va el tag de Finsweet. -->'
  echo
  echo '<script>'
  cat "$CC/about/about-page.js"
  echo '</script>'
} > "$OUT/footer-about.html"

# ---------- FOOTER de News & Events ----------
NE="$CC/news-events"
{
  echo '<!-- FOOTER DE NEWS & EVENTS · Page settings > before </body>'
  echo '     Unica pagina que usa Finsweet List de verdad: 18 fs-list-element,'
  echo '     load-more, filtros y paginacion. Solo el modulo list. -->'
  echo
  echo "<script async type=\"module\" src=\"$FS\" fs-list></script>"
  echo
  echo '<script>'
  cat "$NE/event-date-range.js"; echo
  cat "$NE/upcoming-placeholder.js"; echo
  cat "$NE/pagination.js"; echo
  echo '// OJO: este ultimo bloque viene de news-events/news.js. Si ya lo tenes'
  echo '// en otro embed de la pagina, borralo de aca para no duplicar listeners.'
  cat "$NE/news.js"
  echo '</script>'
} > "$OUT/footer-news-events.html"

# ---------- FOOTER del template de press release ----------
{
  echo '<!-- TEMPLATE DE PRESS RELEASE'
  echo '     Ya aplicado en el <head> de la pagina con fs-socialshare,'
  echo '     fs-formsubmit y fs-selectcustom, y desde ahi funciona'
  echo '     (verificado en vivo). Este archivo queda como referencia. -->'
  echo
  echo "<script async type=\"module\" src=\"$FS\" fs-socialshare fs-formsubmit fs-selectcustom></script>"
} > "$OUT/footer-press-template.html"


# ---------- FOOTER de Careers ----------
{
  echo '<!-- FOOTER DE CAREERS · Page settings > before </body>'
  echo '     Cambios respecto de lo que habia:'
  echo '      - El popup de testimonials ya no esta capado en 960 px: escala al'
  echo '        mayor tamano que entre en los dos ejes, con el aspect ratio real'
  echo '        del video (los 4 testimonials no comparten proporcion).'
  echo '      - Fuera los 7 console.log de debug.'
  echo '     El resto queda igual. -->'
  echo
  echo '<script src="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js"></script>'
  echo
  echo '<script>'
  cat "$CC/careers/custom.js"
  echo '</script>'
} > "$OUT/footer-careers.html"

# ---------- Finsweet: paginas con formularios ----------
# Resources y Contact us usan fs-formsubmit-element y fs-selectcustom-element y
# hoy no cargan ningun modulo: el formulario y el select custom estan muertos.
# Van en el <head> igual que Technology y el template de press release, que es
# donde se comprobo que funcionan. El tag es async + type=module, asi que en el
# head no bloquea el render.
for page in resources contact-us; do
  {
    echo "<!-- FINSWEET · $page · Page settings > Inside <head> tag"
    echo '     Usa fs-formsubmit-element y fs-selectcustom-element. Sin esto el'
    echo '     envio del formulario y el select custom no funcionan. -->'
    echo
    echo "<script async type=\"module\" src=\"$FS\" fs-formsubmit fs-selectcustom></script>"
  } > "$OUT/finsweet-$page.html"
done

# ---------- nota del head de Technology ----------
cat > "$OUT/head-technology.md" <<'MD'
# HEAD de Technology · Page settings > Inside <head> tag

Borrar esta linea del head:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

Bloquea el render con 71 KB desde un origen de terceros. Ya esta incluida en
`footer-technology.html`, antes de `tech.min.js`, que es quien la usa.
MD

echo "listo: $(ls "$OUT" | wc -l | tr -d ' ') bloques en perf/webflow/"

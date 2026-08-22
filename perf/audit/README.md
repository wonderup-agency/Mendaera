# Harness de medición

Los tres scripts con los que se midió la auditoría. Sirven para volver a medir
después de publicar los cambios.

## Instalar

```bash
cd perf/audit && npm install
```

Usa el Chrome del sistema, no descarga ninguno. Si está en otra ruta:
`export CHROME=/ruta/al/binario`.

## `lighthouse.mjs` — el score

```bash
node lighthouse.mjs                 # mobile, 3 corridas por página, mediana
node lighthouse.mjs desktop
node lighthouse.mjs mobile 5        # 5 corridas
node lighthouse.mjs mobile 3 home   # solo home
```

Es el mismo motor que PageSpeed Insights, con **throttling simulado**. Corré
siempre 3 corridas como mínimo y quedate con la mediana: la varianza es alta
(Technology dio 82, 54 y 55 en tres corridas seguidas).

Los reportes completos quedan en `out/`, así que se pueden mirar audits sueltos
después sin volver a medir:

```bash
node -e "const d=require('./out/home.mobile.1.json');
console.log(d.audits['render-blocking-insight'].details.items)"
```

## `waterfall.mjs` — por qué

```bash
node waterfall.mjs                  # home mobile
node waterfall.mjs technology
node waterfall.mjs home desktop
```

Throttling **aplicado**, no simulado: red slow 4G real y CPU a 4×. Es la única
forma de ver la contención de ancho de banda. Lo que importa de la salida es la
línea `Bytes en vuelo antes del FCP` y la sección de fuentes: si las fuentes
terminan a los 9 segundos, algo les está comiendo el ancho de banda.

Esta diferencia entre simulado y aplicado es la razón por la que el fix de video
baja 11 MB del critical path y no mueve el score: Lighthouse no modela la
contención de recursos de prioridad baja.

## `filmstrip.mjs` — cómo se ve

```bash
node filmstrip.mjs                  # home mobile, 20 frames
node filmstrip.mjs home desktop
node filmstrip.mjs technology mobile 30
```

Capturas cada 400 ms durante la carga. En el baseline la home quedaba en blanco
hasta los 4,5 s y ningún número de Lighthouse lo dice.

## `fonts.mjs` — verificar una conversión de fuentes

```bash
node fonts.mjs <dir-otf> <dir-woff2>
```

Renderiza cada par OTF/WOFF2 en Chrome y compara `measureText` y el bitmap del
canvas, pixel a pixel, en 8 textos × 3 tamaños. Los textos incluyen pares con
kerning (`AV Ta To Wa`), ligaduras (`fi fl ffi ffl`), acentos y puntuación
tipográfica.

Que un archivo comprima no dice nada sobre si renderiza igual. Esto sí. Las 14
WOFF2 de `../assets/fonts-woff2/` pasaron las 336 comparaciones sin una
diferencia.

## `pages.mjs`

Las 5 páginas del alcance, la ruta de Chrome y los valores de throttling. Para
medir otro entorno: `BASE=https://mendaera.com node lighthouse.mjs`.

## Lo que no está acá

El servidor local que parcheaba la home para medir cada fix por separado. Estaba
atado a las definiciones de cada parche de la auditoría y no sirve para medir el
sitio publicado, que es lo que hace falta de acá en adelante.

## Chequeo pre-deploy

Los seis scripts del QA del 2026-08-21. Corren contra staging por defecto;
`BASE=https://www.mendaera.com node <script>` para medir prod.

```bash
node qa.mjs            # crawl: errores JS, 4xx, links vacios, imagenes, IDs duplicados -> out/qa.json
node linkcheck.mjs     # estado HTTP de cada link que junto qa.mjs        -> out/links.json
node sweep.mjs         # las 57 URLs del sitemap: errores JS y placeholders -> out/sweep.json
node errtrace.mjs /una-ruta /otra    # stack trace completo de los errores de una pagina
node submitproof.mjs   # llena los forms y clickea Submit. No envia nada: aborta
                       # todo POST a nivel de red antes de que salga.
node extcheck.mjs      # revisa en Chrome los links externos que dieron 403 por bot-blocking
```

`qa.mjs` arranca de 7 seeds y sigue links internos hasta `MAX_PAGES` (40 por
defecto). `sweep.mjs` cubre el sitemap entero, que es la lista autoritativa.

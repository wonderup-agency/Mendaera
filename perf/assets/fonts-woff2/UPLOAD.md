# Subir las fuentes WOFF2 a Webflow

## Verificación (por qué se puede confiar en estos archivos)

Convertidas de los OTF que sirve hoy el CDN de Webflow, con `fontTools`. Verificado:

- **Tablas**: mismos glifos, mismo `cmap`, mismas métricas verticales (`hhea`,
  `OS/2` typo y win), mismos anchos de avance glifo por glifo, outlines CFF y
  `GPOS` (kerning) presentes en las 14.
- **Render en Chrome**: las 14 cargan vía `FontFace` y renderizan **pixel a pixel
  idénticas al OTF** en 24 combinaciones cada una (8 textos × 3 tamaños: 16, 48 y
  120 px), comparando `measureText` y el bitmap del canvas. Los textos incluyen
  pares con kerning (`AV Ta To Wa`), ligaduras (`fi fl ffi ffl`), acentos y
  puntuación tipográfica. 336 comparaciones, cero diferencias.
- **Itálicas**: marcadas con `fsSelection.ITALIC` y `macStyle.italic`. El
  `italicAngle` es 0 en todas, pero eso ya viene así en los OTF originales.

## Ojo con la familia que auto-detecta Webflow

Los nombres internos declaran **seis familias distintas** — `Suisse Intl`,
`Suisse Intl Light`, `Suisse Intl Book`, `Suisse Intl Medium`,
`Suisse Intl SemiBold`, `Suisse Intl Black` — pero el CSS del sitio usa **una sola**
familia `Suisseintl` con pesos, más `Suisseintl Book` aparte.

Si se acepta la familia auto-detectada, quedan 6 familias y el CSS actual deja de
encontrar los pesos. **Hay que asignar familia, peso y estilo a mano**, con esta tabla
(sacada de los `@font-face` que sirve hoy el sitio, así que es exactamente lo que el
CSS espera):

| Archivo | Family | Weight | Style |
|---|---|---|---|
| `SuisseIntl-Light.woff2` | `Suisseintl` | 300 | normal |
| `SuisseIntl-LightItalic.woff2` | `Suisseintl` | 300 | italic |
| `SuisseIntl-Book.woff2` | `Suisseintl Book` | 400 | normal |
| `SuisseIntl-Regular.woff2` | `Suisseintl` | 400 | normal |
| `SuisseIntl-RegularItalic.woff2` | `Suisseintl` | 400 | italic |
| `SuisseIntl-Medium.woff2` | `Suisseintl` | 500 | normal |
| `SuisseIntl-MediumItalic.woff2` | `Suisseintl` | 500 | italic |
| `SuisseIntl-SemiBold.woff2` | `Suisseintl` | 600 | normal |
| `SuisseIntl-SemiBoldItalic.woff2` | `Suisseintl` | 600 | italic |
| `SuisseIntl-Bold.woff2` | `Suisseintl` | 700 | normal |
| `SuisseIntl-BoldItalic.woff2` | `Suisseintl` | 700 | italic |
| `SuisseIntl-Black.woff2` | `Suisseintl` | 900 | normal |
| `SuisseIntl-BlackItalic.woff2` | `Suisseintl` | 900 | italic |
| `JetBrainsMono-Medium.woff2` | `Jetbrainsmono` | 500 | normal |

Son 14 archivos. Cuando estén los 14 arriba, borrar los `.otf`.

## Qué esperar del cambio

Poco, y conviene saberlo antes: el CDN de Webflow **ya sirve los OTF con brotli**,
así que la transferencia real de las 3 fuentes que carga Home baja de 252 KB a
207 KB (−18 %), no el −60 % que sugiere el tamaño en disco. En el score de
Lighthouse midió 0 puntos de diferencia.

Lo que hoy hace lentas a las fuentes no es el formato: es que arrancan a ~1,1 s y
terminan entre 7,6 y 9,7 s porque los videos les comen el ancho de banda. Eso lo
arregla `webflow/head-sitewide.html`, no este cambio.

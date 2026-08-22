# Paso B — posters: reemplazo de URLs (sin subir archivos)

Webflow ya genera y hostea una variante `-p-1080.avif` de cada imagen subida.
El `poster` de estos `<video>` es un **custom attribute** (son custom elements,
no elementos Video nativos), así que alcanza con editar el texto de la URL en
`Element settings → Custom attributes → poster`. No hay que subir nada.

Medido en Home mobile, solo con este cambio: LCP llega a **5.762 ms** (mediana de
3 corridas). El baseline oscila entre 9,4 s y 12,6 s segun la corrida. Son 18 elementos `<video>` con 17 archivos de poster distintos:
2.782 KB → 501 KB (−82 %).

> **Ojo, defecto aparte**: en Home hay dos `<video>` con el **mismo**
> `id="new-hero-video"` y el mismo `data-home-hero="video"` (el hero de desktop y
> el de mobile). El `id` duplicado es HTML inválido y `querySelector` solo
> encuentra el primero. Además los dos tienen `autoplay`, así que el que está
> oculto en el breakpoint actual **también se descarga**. Conviene darles ids
> distintos. El snippet `head-perf.html` ya tapa la parte de la descarga: un
> elemento en `display:none` nunca intersecta el viewport, así que no se pide.

**La regla es una sola**: insertar `-p-1080` antes de la extensión y cambiar la
extensión por `.avif`.

```
…/699e000816de1cedeb67fd44_thumb (2).jpg
…/699e000816de1cedeb67fd44_thumb (2)-p-1080.avif
```

## Home

- `id="new-hero-video"` — **168 KB → 9 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/697cc089bdfa51e180d0c004_hero-poster.png`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/697cc089bdfa51e180d0c004_hero-poster-p-1080.avif`
- `id="new-hero-video"` — **168 KB → 9 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/697cc089bdfa51e180d0c004_hero-poster.png`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/697cc089bdfa51e180d0c004_hero-poster-p-1080.avif`
- `data-home-video="video"` — **575 KB → 45 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e000816de1cedeb67fd44_thumb%20(2).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e000816de1cedeb67fd44_thumb%20(2)-p-1080.avif`
- `data-video-card="video"` — **89 KB → 21 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e2e79d3fdf480e6d25f41_thumb%20(4).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e2e79d3fdf480e6d25f41_thumb%20(4)-p-1080.avif`
- `data-video-card="video"` — **141 KB → 32 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e2e2f83c33d4c1669f80d_thumb%20(3).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/699e2e2f83c33d4c1669f80d_thumb%20(3)-p-1080.avif`
- `data-video-card="video"` — **102 KB → 11 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a29b0bcf2e21e9cbcc21137_ef8d576df44d39fc1cf7d75b73bb4509_thumb%20%2814%29.jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a29b0bcf2e21e9cbcc21137_ef8d576df44d39fc1cf7d75b73bb4509_thumb%20%2814%29-p-1080.avif`

## Technology

- `data-modal-video="video"` — **82 KB → 37 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503c0245ad28f7c1a4ec0_thumb.jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503c0245ad28f7c1a4ec0_thumb-p-1080.avif`
- `data-modal-video="video"` — **95 KB → 43 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf2172148e2d8a9d83_thumb%20(1).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf2172148e2d8a9d83_thumb%20(1)-p-1080.avif`
- `data-modal-video="video"` — **62 KB → 27 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf944647926066a4b7_thumb%20(2).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf944647926066a4b7_thumb%20(2)-p-1080.avif`
- `data-modal-video="video"` — **104 KB → 49 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf8d38fd5f52d89513_thumb%20(3).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf8d38fd5f52d89513_thumb%20(3)-p-1080.avif`
- `data-modal-video="video"` — **45 KB → 18 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf2172148e2d8a9d66_thumb%20(4).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf2172148e2d8a9d66_thumb%20(4)-p-1080.avif`
- `data-modal-video="video"` — **71 KB → 29 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bfe53318e5c6ce3ca0_thumb%20(5).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bfe53318e5c6ce3ca0_thumb%20(5)-p-1080.avif`
- `data-modal-video="video"` — **81 KB → 35 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bfe0e9f0d26b6ebe6e_thumb%20(6).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bfe0e9f0d26b6ebe6e_thumb%20(6)-p-1080.avif`
- `data-modal-video="video"` — **81 KB → 38 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf6163cfff345970ab_thumb%20(7).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf6163cfff345970ab_thumb%20(7)-p-1080.avif`
- `data-modal-video="video"` — **39 KB → 16 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf28705702ac387206_thumb%20(8).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69d503bf28705702ac387206_thumb%20(8)-p-1080.avif`
- `data-home-video="video"` — **389 KB → 41 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69f20ac6d4e2bc820d53bcb9_thumb%20(12).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/69f20ac6d4e2bc820d53bcb9_thumb%20(12)-p-1080.avif`

## About

- `data-home-video="video"` — **460 KB → 26 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a32e444ae0392e2fbaabdfa_thumb%20(17).jpg`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a32e444ae0392e2fbaabdfa_thumb%20(17)-p-1080.avif`
- `data-home-video="video"` — **29 KB → 17 KB**
  - actual: `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a340e0408064284866744cf_thumb%20(18).avif`
  - nuevo:  `https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a340e0408064284866744cf_thumb%20(18)-p-1080.avif`

**Total: 2782 KB → 501 KB**

Nota sobre AVIF: soportado en Chrome 85+, Safari 16+, Firefox 93+. El sitio ya
sirve AVIF sin fallback en varios `<img>`, así que no agrega un riesgo nuevo. Si
preferís máxima compatibilidad, usar `-p-1080.jpg` en lugar de `.avif`: pesa
~60 % más que el AVIF pero sigue siendo una fracción del original.
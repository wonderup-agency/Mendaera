# HEAD de Technology · Page settings > Inside <head> tag

Borrar esta linea del head:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

Bloquea el render con 71 KB desde un origen de terceros. Ya esta incluida en
`footer-technology.html`, antes de `tech.min.js`, que es quien la usa.

---

## Agregar al head: estado inicial del acordeon mobile

El acordeon de Product Overview arma su estado inicial desde JS
(`gsap.set(dropdown, { height: 0 })` en las tres cards, y despues abre la
primera). Hasta que `tech.min.js` llega, el HTML pinta las tres cards
expandidas y sin item activo.

Medido en un reload a 390x844 con red y CPU throttleadas: ese estado se pinta
a los 321 ms y recien queda correcto a los 693 ms. Son ~370 ms de acordeon
abierto de par en par, que es el "mini flash" que se ve al recargar.

El CSS lo adelanta al primer paint. La clase y el `setTimeout` son el seguro:
si `tech.min.js` no llega -- bloqueado, 404, o servido por http desde
localhost contra una pagina https -- la clase se cae y las cards quedan
abiertas y usables en lugar de trabadas cerradas.

```html
<script>
  document.documentElement.classList.add('md-accordion-collapsed')
  setTimeout(function () {
    if (!window.__mdAccordionReady) {
      document.documentElement.classList.remove('md-accordion-collapsed')
    }
  }, 4000)
</script>

<style>
  @media (max-width: 991px) {
    /* Estado inicial que despues toma el JS */
    .md-accordion-collapsed .product-overview_card-tablet {
      height: 0;
      overflow: hidden;
    }
    /* La primera arranca abierta, igual que hace openCardDropdown() */
    .md-accordion-collapsed .product-overview_card-item:first-child
      .product-overview_card-tablet {
      height: auto;
    }
    /* Y con su primer item ya en teal, para que no aparezca despues */
    .md-accordion-collapsed .product-overview_card-item:first-child
      .product_modal-tab-text-item:first-child {
      background-color: #2de7b0;
    }
  }
</style>
```

`tech.js` pone `window.__mdAccordionReady = true` al terminar de inicializar el
acordeon mobile, asi que el seguro no se dispara en el caso normal.

---

## Agregar al head: reservar el alto del Lottie de "Precision for every provider"

`.target_lottie` no tiene alto propio en CSS: lo define el `<svg>` que inyecta
el player de Webflow. Como el elemento es `data-loading="lazy"`, el SVG llega
recien cuando la seccion se acerca al viewport, y ahi el contenedor pasa de 0 a
758 px: `.section_target` crece de 450 a 990 px y todo lo que esta abajo baja
540 px.

Ese corrimiento es el bug del video de Product en desktop. ScrollTrigger guarda
el `start` del pin como un numero absoluto de scroll y solo lo recalcula en un
`refresh()`; los dos que hay corren en `load` y `load + 1.5 s`, siempre antes de
que el Lottie cargue. Con el `start` viejo el pin dispara 540 px antes de tiempo:
el titulo "Discover Focalist" queda encima del video fijo, y el video reaparece
una segunda vez cuando el pin se suelta.

El `viewBox` del Lottie es 1725x1725, cuadrado, asi que el alto se reserva con
un aspect ratio:

```html
<style>
  /* El player inyecta el SVG recien al entrar al viewport: sin esto la
     seccion crece 540 px y corre el pin del video de abajo. */
  .target_lottie {
    aspect-ratio: 1 / 1;
  }
</style>
```

Alternativa equivalente y mas limpia: setear el aspect ratio en el Designer,
sobre el div del Lottie. Si se hace ahi, este bloque no va.

`tech.js` ademas tiene una red de seguridad (`refreshOnLateLayoutShift`) que
llama a `ScrollTrigger.refresh()` cuando la pagina crece sola, para cubrir
cualquier otro contenido lazy que aparezca despues. Las dos cosas se
complementan: el CSS evita el salto, el JS lo corrige si igual pasa.

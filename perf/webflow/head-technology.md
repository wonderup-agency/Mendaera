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

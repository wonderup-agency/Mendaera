# HEAD de Technology · Page settings > Inside <head> tag

Borrar esta linea del head:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

Bloquea el render con 71 KB desde un origen de terceros. Ya esta incluida en
`footer-technology.html`, antes de `tech.min.js`, que es quien la usa.

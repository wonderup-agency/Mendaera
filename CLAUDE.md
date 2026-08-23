# Mendaera

Custom code de un sitio Webflow. Sin build ni tests: el JS se pega en los campos
de custom code o se sirve minificado desde jsDelivr.

## Comentarios en código — regla dura

1. **Siempre en inglés.** JS, CSS y JS embebido en HTML. No importa que el
   archivo que estoy tocando ya tenga comentarios en español: la convención gana
   sobre la consistencia local. Si toco una función con comentarios en español,
   los que toco quedan en inglés.
2. **Pocos.** Un comentario explica *por qué*, nunca *qué*. Si la línea se lee
   sola, no lleva comentario. Nada de banners ASCII ni changelogs dentro del
   código: eso va al README o al commit.
3. **Excepción:** la prosa de documentación sigue en español — README, notas de
   deploy, y los headers `<!-- ... -->` de "dónde pegar esto en Webflow" que
   genera `perf/build.sh`. La regla de inglés es solo para comentarios de código.

## `perf/webflow/` es carpeta generada

No editar a mano. Las fuentes canónicas viven fuera del repo, en
`../mendaera/custom-code/`. Se edita ahí y se rearma con `perf/build.sh`.
Igual criterio para `scripts/sync.sh`.

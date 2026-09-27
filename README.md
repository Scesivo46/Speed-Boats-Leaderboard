# Speed Boat · clasificación

Web pública y estática para el campeonato. Durante el evento solo se muestra Jarama; el selector y las opciones de DomusRing y Karting permanecen preparados en `index.html` y `app.js` para habilitarlos después. Muestra Time Attack y Drift, y calcula las clasificaciones individuales y por equipos. GitHub Pages sirve los archivos; la página consulta de solo lectura el Apps Script de la hoja cada minuto y al volver a la pestaña.

Web creada por Scesivo para Domus Aeterna SMP. El código de esta web se distribuye bajo la licencia MIT; el logo proporcionado para el proyecto no queda incluido en esa licencia.

## Publicación

1. En el Apps Script de la hoja, sustituye `Code.gs` por la versión de `integrations/google-sheets/Code.gs` del repositorio privado del mod.
2. En **Implementar → Gestionar implementaciones**, edita la implementación web existente, selecciona **Nueva versión** y confirma. Mantén **Ejecutar como: yo** y **Quién tiene acceso: cualquiera**. La URL `/exec` no debe cambiar.
3. La web se publica desde `main` / raíz del repositorio público mediante GitHub Pages.

## Equipos y puntuación

Edita `roster.js` cuando se conozcan las parejas. Cada equipo debe contener exactamente dos UUID distintas, por ejemplo:

```js
'Ducati Lenovo Team': ['uuid-del-piloto-a', 'uuid-del-piloto-b']
```

No se adjudican puntos de equipo hasta que tenga las dos UUID. Un piloto no puede figurar en dos equipos. Los puntos por puesto en cada modalidad son `15, 12, 10, 8, 6, 5, 4, 3, 2, 1`; a partir del 11.º son 0. Cada piloto suma sus puntos de Time Attack y Drift, y cada equipo suma los de sus dos pilotos. Los empates en la marca se ordenan por la fecha del récord más antiguo y, si aún empatan, por UUID.

El endpoint `?feed=1` devuelve exclusivamente circuito, jugador, UUID, tiempo o puntos Drift y fecha. Nunca devuelve `SPEEDBOATS_SECRET`. La hoja y el script permiten lectura pública de estos resultados; no publiques datos privados en esas columnas.

Las skins se cargan por UUID desde Visage, que devuelve la skin actual de los jugadores. Si falla, la web prueba MCHeads y, si tampoco funciona, muestra la inicial del piloto. No hay que registrar manualmente a los nuevos jugadores.

# Speed Boat · clasificación

Web pública y estática para los récords de contrarreloj de DomusRing, Jarama y Karting. GitHub Pages sirve los archivos; la página consulta de solo lectura el Apps Script de la hoja cada minuto y al volver a la pestaña.

## Publicación

1. En el Apps Script de la hoja, sustituye `Code.gs` por la versión de `integrations/google-sheets/Code.gs` del repositorio privado del mod.
2. En **Implementar → Gestionar implementaciones**, edita la implementación web existente, selecciona **Nueva versión** y confirma. Mantén **Ejecutar como: yo** y **Quién tiene acceso: cualquiera**. La URL `/exec` no debe cambiar.
3. La web se publica desde `main` / raíz del repositorio público mediante GitHub Pages.

El endpoint `?feed=1` devuelve exclusivamente circuito, jugador, UUID, tiempo y fecha. Nunca devuelve `SPEEDBOATS_SECRET`. La hoja y el script permiten lectura pública de estos resultados; no publiques datos privados en esas columnas.

Las skins se cargan desde Crafatar usando el UUID de cada jugador. Si el servicio de skins falla, se muestra la inicial del piloto.

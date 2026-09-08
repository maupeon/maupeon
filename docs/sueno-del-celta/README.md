# El sueño del celta

Aventura narrativa 3D en español, integrada como una ruta independiente del sitio existente.

## Ejecutar

```sh
npm ci
npm run dev
```

Abre http://localhost:3000/app/sueno-del-celta.

Para ejecutar la versión de producción:

```sh
npm run build
npm run start
```

## Jugar

- **Escritorio:** WASD o flechas para caminar, E para interactuar, J para abrir el cuaderno y Esc para pausar.
- **Móvil:** joystick izquierdo para moverse y botón derecho para interactuar. Compatible con orientación vertical y horizontal.
- **Ayuda de navegación:** «Guiarme al objetivo» sigue un camino transitable hasta el encuentro. Mover el joystick o pulsar una dirección recupera el control manual.
- **Historia:** Congo, Amazonía e Irlanda, con tres misiones por capítulo y un desenlace histórico fijo.
- **Cuaderno:** las decisiones cambian nueve reflexiones originales. El progreso se guarda automáticamente en este navegador.
- **Ajustes:** sonido ambiental, calidad automática/ahorro/alta, movimiento reducido, pantalla completa y reinicio con confirmación.

## Estructura

- `src/pages/app/sueno-del-celta.jsx`: ruta independiente mediante la excepción existente para `/app/`.
- `src/components/celta/CeltaGame.jsx`: narrativa, cuaderno, ajustes y controles.
- `src/components/celta/engine.js`: escena Three.js, cámara, movimiento, reflejos y gestión de recursos.
- `src/components/celta/models.js`: geometría y materiales del personaje y los escenarios.
- `src/components/celta/audio.js`: ambiente sonoro sintetizado con Web Audio.
- `src/lib/celta/story.js`: misiones, fuentes, validación del guardado y progresión.
- `src/lib/celta/navigation.js`: búsqueda de caminos para la ayuda de navegación.
- `public/celta/`: texturas originales generadas, incluidas localmente.

## Verificación

```sh
node --test tests/celta-state.test.mjs
npm run build
```

Consulta `VERIFICATION.md` para las pruebas realizadas, `NARRATIVE.md` para las fuentes y el criterio de adaptación, y `ART.md` para la procedencia de los recursos visuales.

Requiere WebGL 2. La resolución se limita y se reduce automáticamente si cae el rendimiento; también hay un modo ahorro. Las geometrías se agrupan por material. La escena y el audio se detienen al ocultar la pestaña. No necesita cuenta ni servicios externos durante el juego. El guardado es local: no incluye sincronización en la nube ni instalación sin conexión.

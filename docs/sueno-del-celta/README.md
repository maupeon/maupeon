# El sueño del celta

Aventura de investigación 3D en español. Tres escenarios distintos y cuatro personajes con esqueletos animados, creados en Blender; nueve misiones; cámara de campo con enfoque, zoom y álbum; documentos interactivos y expedientes de pruebas.

## Ejecutar

```sh
npm ci
npm run dev
```

Abre [el juego](http://localhost:3000/app/sueno-del-celta). Para producción: `npm run build` y `npm run start`.

## Controles

- Escritorio: WASD / flechas para caminar, Mayús para acelerar, arrastrar para mirar, E para interactuar, C para abrir/guardar la cámara, espacio para fotografiar, J para el cuaderno y Esc para salir o pausar.
- Móvil: joystick para caminar, arrastrar el escenario para mirar, botones de acción y cámara. Compatible con orientación vertical y horizontal.
- Fotografía: encuadrar el sujeto, regular el enfoque y acercar con el zoom. El disparador indica cuándo puede conservarse la prueba. Fuera de una actividad fotográfica también se pueden guardar hasta ocho fotografías libres.
- «Guiarme al objetivo» recorre caminos transitables. Una dirección manual cancela la guía.
- Documentos: tocar las anotaciones, interpretar la fuente y relacionar las pruebas. Una respuesta errónea explica el problema y permite reintentar.
- Cuaderno: nueve entradas, fotografías, contexto y fuentes. Guardado automático local después de cada actividad, incluidos los pasos intermedios de una misión. No se sincroniza entre dispositivos.
- Ajustes: sonido, calidad automática/ahorro/alta, movimiento reducido, pantalla completa y reinicio con confirmación.

## Código y recursos

- `src/pages/app/sueno-del-celta.jsx`: ruta aislada, sin modificar la navegación del sitio.
- `src/components/celta/CeltaGame.jsx`: interfaz, guardado, álbum, controles y transiciones.
- `src/components/celta/Investigation.jsx`: testimonios, documentos y mesa de pruebas.
- `src/components/celta/engine.js`: Three.js, carga de GLB, cámara, fotografía, navegación y renderizado.
- `src/components/celta/photoLens.js`: enfoque óptico con profundidad real de la escena, activo durante las fotografías.
- `src/components/celta/photoOcclusion.js`: visibilidad del sujeto respetando los huecos transparentes de la vegetación.
- `src/components/celta/models.js`: materiales, vegetación secundaria y escena de prisión.
- `src/components/celta/audio.js`: ambiente sintetizado con Web Audio.
- `src/lib/celta/expeditions.js`: diseño y textos originales de las actividades.
- `src/lib/celta/story.js`: contexto, cuaderno, fuentes y validación de progreso.
- `src/lib/celta/{worlds,navigation,photography}.js`: superficies transitables, rutas y evaluación del encuadre.
- `public/celta/models/`: ocho GLB locales y metadatos de mundos, personajes y vegetación.
- `tools/celta/`: scripts de autoría y cinco fuentes `.blend` con texturas empaquetadas. Las adaptaciones profesionales conservan mapas originales, hashes y licencias.

Requiere WebGL 2. Los capítulos se cargan según se necesitan, las mallas estáticas se agrupan y la resolución se adapta al rendimiento. El modo móvil evita el posprocesado HDR; existe un ajuste de ahorro. La pestaña en segundo plano detiene el renderizado. No requiere cuenta ni servicios externos durante la partida. No incluye instalación sin conexión.

## Verificar

```sh
node --test tests/celta-state.test.mjs tests/celta-assets.test.mjs tests/celta-photo-occlusion.test.mjs
npm run build
```

Consulta [NARRATIVE.md](NARRATIVE.md) para el criterio de adaptación, [ART.md](ART.md) para la autoría de modelos y texturas, [ASSET-LICENSES.md](ASSET-LICENSES.md) para los recursos externos y [VERIFICATION.md](VERIFICATION.md) para las pruebas realizadas y sus límites.

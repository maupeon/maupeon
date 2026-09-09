# Verificación de la versión con recursos profesionales

Pruebas locales en Chrome sobre macOS, 9 de septiembre de 2026. La entrega incorpora los personajes de la ronda 15, el Congo de la ronda 15, los demás escenarios profesionales y la biblioteca vegetal de la ronda 14. Los archivos publicados coinciden con los hashes de la entrega; sus fuentes `.blend` incluyen las texturas empaquetadas.

La compilación de producción y las 16 pruebas permanentes pasan. Un navegador nuevo completó la campaña sobre los archivos publicados: 17 actividades, nueve misiones y tres fotografías, sin errores de página o consola. Se verificaron también respuestas incorrectas, recarga después de la primera fotografía, el desenlace fijo, las nueve entradas, el álbum final y los créditos con sus enlaces de licencia.

## Compilación y pruebas permanentes

`npm run build` incluye `/app/sueno-del-celta`. Las advertencias generales corresponden a otras páginas del repositorio y a la base local de Browserslist.

```sh
node --test tests/celta-state.test.mjs tests/celta-assets.test.mjs tests/celta-photo-occlusion.test.mjs
npm run build
```

Las 16 pruebas verifican orden y persistencia de las 17 actividades, nueve investigaciones, fotografías necesarias, rechazo de progreso corrupto, navegación entre todos los destinos, visibilidad fotográfica a través del recorte alfa y la exportación animada de los cuatro personajes. Los controles de recursos comprueban 17 huesos, pesos normalizados, índices válidos, clips continuos y orientación exterior de ojos y cabello. Esta última comprobación reproduce y evita la inversión causada por una conversión de ejes.

## Cámara y controles

La prueba de lente pasó a 1280×800, 390×844 y 844×390: el desenfoque impide guardar la prueba, enfocar permite el disparo y se conserva un JPEG real. Los tres recorridos terminaron sin errores y registraron 60 FPS. El disparador y el desenfoque óptico comparten ahora la misma tolerancia; el indicador ya no considera enfocado un retrato a 1,8 m cuando el sujeto está a 2,55 m.

La guía se detiene aproximadamente a 2,55 m del objetivo, dentro del alcance de conversación y fuera de la distancia mínima de fotografía. El enfoque usa la profundidad real de la escena; en dispositivos sin búfer HDR se conserva el renderizado directo y la evaluación de enfoque.

Los controles táctiles admiten orientación vertical y horizontal. La comprobación final sobre producción a 390×844 y 844×390 pasó movimiento con joystick, arrastre de cámara, fotografía guardada, álbum y desplazamiento de documentos mediante eventos táctiles. No hubo desbordamiento horizontal ni errores de consola; ambas vistas registraron 60 FPS al terminar el recorrido.

## Rendimiento medido

Una prueba adicional muestrea el rendimiento mientras cambia realmente la posición de Roger durante el recorrido de la guía, y separa esos datos de la escena quieta.

| Vista | Resolución CSS | Densidad de render | FPS durante la marcha |
| --- | --- | --- | --- |
| Escritorio | 1536×1024 | 1 | 45–49 |
| Emulación móvil vertical | 390×844 | 1,15 | 59–60 |
| Emulación móvil horizontal | 844×390 | 1,5 | 59–60 |

Son medidas de Chrome en un Mac, **no pruebas en teléfonos físicos**. La ejecución comparte la máquina con otras aplicaciones; los resultados no garantizan una tasa en otro equipo.

La optimización final usa sombras de 3072 píxeles en escritorio y 2048 en táctil; las plantas dispersas usan modelos ligeros y las plantas compuestas de llegada conservan su detalle. Se probó dividir el bosque en lotes espaciales y se descartó porque aumentaba las llamadas de dibujo sin mejorar los FPS. El modo táctil evita el posprocesado de escritorio y reduce el reflejo del agua a 512 píxeles. La resolución se adapta bajo carga y existe un modo Ahorro. Los capítulos posteriores se cargan al necesitarlos y el renderizado se detiene en segundo plano.

## Geometría, fuentes y revisión visual

Los 100 497 contactos finos del Congo se comprobaron contra el GLB comprimido. La corrección final de techo y corteza conserva exactamente el terreno, las superficies de contacto y la navegación de la ronda anterior. La exportación normal desde el `.blend` final produce el mismo GLB bruto byte a byte, sin requerir carpetas temporales; la receta está en `tools/celta/assets/environment/BUILD.md`.

La reimportación de los personajes verifica UV, escala, pivotes y animaciones. La marcha de Roger conserva un ciclo de 1,20 m sin penetración del suelo plano de verificación. Esto no equivale a captura de movimiento, animación facial ni ajuste independiente de cada pie a cualquier pendiente.

Se inspeccionaron las capturas reales de producción de los tres escenarios y de los controles táctiles. Los 11 recursos web del manifiesto (ocho GLB y tres archivos JSON) se descargaron desde el servidor local y coincidieron con sus hashes de entrega. La captura final del Congo a resolución nativa registra 46 FPS estáticos, sin errores de consola.

La comparación visual utiliza la referencia aprobada de la segunda versión, de 1536×1024. Las rondas profesionales 13, 14 y 15 obtuvieron 6,7, 6,7 y 6,8/10; el mejor resultado anterior era 6,9. El ciclo visual terminó por estancamiento después de sustituir recursos y reconstruir geometría. Composición e iluminación están aceptadas, pero la naturalidad del terreno, la paja, la madera y los personajes sigue por debajo de la referencia. **No se alcanzó la meta de 8/10 ni se presenta esta entrega como calidad AAA.**

## Límites y trazabilidad

Requiere WebGL 2. El guardado `celta.journey.v2` vive en el navegador, sin sincronización entre dispositivos ni instalación sin conexión. Documentos, conversaciones y fotos son dramatizaciones y capturas del juego; no son reproducciones de documentos históricos ni citas de la novela. No se tuvo acceso al texto íntegro del libro; las fuentes consultadas se describen en NARRATIVE.md y en el cuaderno.

Los recursos externos, autores, licencias y adaptaciones están documentados en [ASSET-LICENSES.md](ASSET-LICENSES.md) y dentro del juego. Los hashes, scripts temporales, capturas, resultados JSON y juicios de arte se conservan en `.dream-loop/v2/professional/` y `.dream-loop/v2/`, excluidos de Git.

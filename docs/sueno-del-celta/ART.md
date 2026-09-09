# Dirección visual y autoría

Revisión cinematográfica de la aventura, con escenas propias y recursos profesionales adaptados en Blender 5.2.1 y renderizado interactivo en Three.js. La referencia inicial aprobada se mantuvo como dirección de estilo. Para la segunda versión se capturó el juego en funcionamiento y se generó una referencia mejorada del mismo encuadre. Las referencias y revisiones están en `.dream-loop/v2/`, excluido de Git. Ninguna imagen de concepto sustituye al escenario 3D jugable.

## Modelos Blender editables

Los cinco archivos de `tools/celta/blend/` incluyen sus texturas empaquetadas. `environments.py`, `characters.py` y `foliage.py` conservan la autoría de base; `professional_environments.py`, `professional_environment_runtime.py`, `professional_characters.py`, `professional_npcs.py` y `professional_foliage.py` realizan las adaptaciones finales. Los mapas de origen y su procedencia se conservan en `tools/celta/assets/`. Los ocho GLB de `public/celta/models/` se cargan desde el propio sitio.

| Recurso | Geometría exportada | Tamaño aproximado |
| --- | ---: | ---: |
| Congo | 605 945 triángulos | 12,36 MB |
| Amazonía | 166 434 triángulos | 5,66 MB |
| Irlanda | 142 377 triángulos | 2,88 MB |
| Roger Casement | 76 829 triángulos | 11,59 MB |
| Testigo del Congo | 22 845 triángulos | 4,12 MB |
| Testigo de Amazonía | 22 845 triángulos | 4,06 MB |
| Contacto de Irlanda | 22 845 triángulos | 4,43 MB |
| Biblioteca vegetal, ambos niveles de detalle | 54 172 triángulos | 8,40 MB |

Los mundos tienen entre 9 y 23 lotes estáticos por material, antes de añadir personajes, agua y vegetación complementaria del motor. Los GLB de los mundos usan Meshopt; el motor incluye su decodificador. Las cifras no son el número total de llamadas de dibujo de una escena. La biblioteca vegetal contiene once variantes y sus once versiones ligeras: 42 915 triángulos para el conjunto detallado y 11 257 para el ligero (73,77 % menos). Los controles táctiles usan las versiones ligeras. Las plantas dispersas y las copas lejanas también usan versiones ligeras; el detalle completo se reserva para la vegetación compuesta junto a la cámara de llegada. Los mapas profesionales se mantienen locales, con recorte alfa que escribe profundidad y sin pases adicionales de transparencia.

- **Congo:** ribera elevada y curvada, relieve con surcos, depósito administrativo de madera, tejados de 485 grupos con 4 426 fibras longitudinales y flecos en los aleros, estación de pesaje, embarcadero y vapor. Árboles con raíces asimétricas unidas por remallado, 63 placas finas de corteza angular, cavidades y bosque al otro lado del río.
- **Amazonía:** montículos entre humedales, pasarelas curvas elevadas, maloca, almacén cauchero y árbol con incisión y recipiente. Paleta húmeda y fría, lluvia ligera.
- **Irlanda:** playa en media luna, dunas, muros y casa de piedra, afloramiento rocoso y horizonte atlántico. Topografía y materiales propios.
- **Personajes:** caras modeladas y texturizadas, pelo, ropa con pliegues y costuras, manos, calzado y accesorios. Roger lleva cartera y cámara. Un esqueleto de 17 huesos deforma cada personaje con pesos por vértice. Roger combina clips nativos de reposo (4 s) y marcha (1 s, 1,20 m por ciclo), con rodillas y codos articulados; los testigos tienen reposo. La velocidad del ciclo sigue la distancia recorrida. El algodón y el cuero utilizan los mapas PBR profesionales Fabric030 y Leather030, con UV a escala física. Cabezas, cuellos y manos se adaptaron de la base humana de Blender Studio; cada personaje conserva su mapa facial e identidad originales. El pelo de Roger procede de Short02 de MakeHuman: tarjetas con atlas RGBA de hebras, ajuste al cráneo y vinculación al esqueleto. Los pliegues y la cartera incorporan cavidad horneada en colores de vértice. Las animaciones se crearon en Blender, sin captura de movimiento ni animación facial.
- **Vegetación cercana:** mallas y mapas fotografiados de Pachira Aquatica 01, Anthurium Botany 01 y Fern 02 de Poly Haven, con curvaturas, nervaduras y bordes propios de las plantas originales. Se adaptaron densidad, materiales y tamaño. Las dos palmas largas de la composición conservan la autoría original del proyecto. Los conjuntos se agrupan por material en cada escenario.

`worlds.json` contiene alturas, superficies de pasarelas, obstáculos, puntos de misión y máscaras de navegación. El sendero cercano del Congo añade una cuadrícula de altura de 6,25 cm, muestreada después de comprimir el GLB, que permite apoyar los pies sobre el mismo relieve modelado. `characters.json` registra dimensiones, mallas, pivotes, piel ponderada y clips. Los GLB finales fueron decodificados y reimportados en Blender para verificar escala, límites y materiales.

La receta para volver a exportar los escenarios desde las fuentes entregadas está en `tools/celta/assets/environment/BUILD.md`. Se comprobó que la exportación normal del Congo desde su `.blend` final reproduce los mismos bytes del GLB bruto sin depender de archivos temporales de trabajo.

## Texturas originales conservadas

Se utilizó la herramienta integrada de generación de imágenes. Estos recursos originales se conservan junto a los recursos profesionales incorporados posteriormente; su procedencia y licencias están en [ASSET-LICENSES.md](ASSET-LICENSES.md).

- `public/celta/materials.jpg`: atlas 3×2 de madera envejecida, corteza tropical, suelo húmedo, lino caqui, hoja y caliza. Superficies ortográficas, iluminación difusa neutra y sin rótulos.
- `public/celta/surfaces.jpg`: atlas 2×2 de madera continua con vetas y nudos, corteza con fisuras, tela con pliegues diagonales y pelo oscuro. Las regiones se reutilizan para materiales Blender y elementos secundarios.
- Atlas botánico transparente: copa irregular de hojas, fronda de palma, helecho y rama tropical. Se distribuye mediante mallas curvas y recorte alfa en el mundo real.
- `public/celta/canopy-spray-v2.png`: rama botánica independiente con transparencia entre hojas, usada en las copas para evitar recortes densos y repetitivos. Generada con `image_gen` integrado; prompt: una rama tropical africana asimétrica de unos dos metros, cinco bifurcaciones delgadas, hojas elípticas verdes mate de unos seis centímetros, huecos interiores, iluminación difusa neutra y fondo realmente transparente; sin paisaje, texto, resplandor ni sombras horneadas. Se conserva el canal alfa original.
- `public/celta/palm-frond-v2.png` y `public/celta/broadleaf-atlas-v2.png`: fronda completa y cuatro hojas con nervaduras, daños y bordes diferentes. Generación integrada, alfa original y mapeado sobre mallas de Blender. Los prompts completos están en [FOLIAGE-PROMPTS.md](FOLIAGE-PROMPTS.md).
- Cielo panorámico: amanecer tropical dorado, nubes suaves, sin suelo, agua ni árboles. La luz solar y el reflejo del río se calculan durante el juego.
- Atlas de superficies costeras: arena seca y húmeda, pizarra estratificada y césped de dunas; integrado en Irlanda.
- Atlas de paja y madera pintada: paja real y pintura marfil desgastada, integrados en el tejado del Congo y el vapor.
- `public/celta/thatch-edge-v2.png`: fibras finas con transparencia, empaquetadas en el alero de Blender. Generación integrada con este prompt: franja horizontal ortográfica 3:1 del borde de un techo de palma seca, parte superior compacta y borde inferior deshilachado con fibras delgadas de 8–20 cm, huecos transparentes, marrón moderado e iluminación neutra; sin edificios, texto, haces triangulares gruesos ni repetición regular. El GLB conserva el PNG original; el recorte alfa a 0,72 descarta la franja de baja opacidad alrededor de las fibras.
- `public/celta/soil-pbr-v2.png`: material original de tierra aluvial con cuatro canales alineados (albedo, normales, altura y rugosidad). Sus mapas se integran en Blender; el mapa de altura desplaza la malla cercana y se exporta también como superficie de contacto.
- Atlas facial de la segunda versión: superficies originales de piel, ojos y labios para los cuatro personajes, ajustadas a sus mallas. Texturas integradas en los GLB y en `characters.blend`.

El prompt de referencia de la segunda versión pide mejorar una captura real de 1536×1024 conservando posiciones de Roger, testigo, cabaña, árbol y vapor: proporciones humanas, ropa y cuero creíbles, relieve, paja y madera envejecidas, vegetación variable y luz de atardecer con sombras legibles. El prompt completo se conserva en `.dream-loop/v2/concept-prompt.txt` y la salida en `.dream-loop/v2/concept.png`.

## Cámara, materiales y rendimiento

La exploración utiliza una cámara cercana que gira al arrastrar, movimiento relativo a la mirada y prevención de intersecciones mediante los obstáculos del mundo. La cámara de campo ofrece vista en primera persona, encuadre, zoom y enfoque manual. Durante la fotografía, un pase de lente usa la profundidad real para desenfocar los planos fuera de foco; el JPEG conserva ese resultado. El disparador comprueba distancia, visibilidad, tamaño del sujeto y enfoque. El álbum conserva JPEG capturados del lienzo 3D; sus tonos de época se aplican al mostrarlos. En dispositivos sin soporte de buffer HDR se conserva el renderizado directo y la comprobación de enfoque, sin desenfoque óptico.

Agua con reflexión planar, variaciones de oleaje y luz especular; materiales físicos, normales y parches de humedad en el terreno; geometrías secundarias agrupadas por material. La ruta de escritorio combina HDR, brillo moderado y FXAA. Los dispositivos táctiles evitan ese posprocesado y reducen vegetación lejana. La resolución tiene límites y ajuste automático. La comprobación en un teléfono físico sigue siendo necesaria antes de prometer una tasa de fotogramas concreta en ese dispositivo.

## Material de suelo de la revisión

Generado con la herramienta integrada `image_gen`; fuente conservada en `public/celta/soil-pbr-v2.png` y mapas empaquetados en `tools/celta/blend/congo.blend`. Esta textura documenta la primera revisión del suelo; la versión profesional utiliza Red Dirt Mud 01 de Poly Haven en las superficies principales del Congo.

Prompt: atlas PBR cuadrado de cuatro cuadrantes registrados, sin bordes ni rótulos: albedo difuso arriba a la izquierda, normal OpenGL arriba a la derecha, altura en gris abajo a la izquierda y rugosidad abajo a la derecha. Un parche ortográfico de 2×2 metros de tierra aluvial tropical marrón oscura, con agregados irregulares de arcilla, grano fino, guijarros de 1–6 cm parcialmente enterrados, escasas raíces sinuosas y pequeños canales de lluvia; 0–8 cm de relieve. Color umber moderado, sin grandes manchas naranjas ni patrones circulares. Iluminación difusa neutra, sin sombras ni reflejos direccionales horneados. Misma topografía en los cuatro canales, bordes continuos, calidad de material fotogramétrico para un juego contemporáneo.

## Archivo de la primera textura de ropa y cuero de Roger

La adaptación profesional emplea ambientCG. Se conserva además la fuente de la primera revisión: `public/celta/hero-fabric-leather-v2.png`, generada mediante `image_gen` integrado. Contiene pares de albedo y normales para algodón y cuero; se conserva la imagen original. Prompt completo:

Use case: photorealistic-natural. Asset type: original PBR texture atlas for an early 1900s investigator's 3D jacket and leather satchel in Blender. Square atlas divided into FOUR EXACT matching square quadrants, NO gutters borders text or labels. Top-left: diffuse ALBEDO of a 60cm square patch of dark warm umber/olive-brown heavy cotton twill jacket cloth, with natural asymmetrical soft diagonal drape folds under tension from the upper-left shoulder and small waist compression creases toward bottom; 5 to 8 broad uneven cloth creases rather than a periodic wrinkled pattern, very fine clearly visible woven threads, gently faded highpoints. No garment outline, buttons, seams, clothing accessories or background. Top-right: precisely spatially registered tangent-space OpenGL NORMAL MAP of the exact top-left draped cloth, purple-blue neutral Z, curved asymmetric broad folds 1–4 cm deep and delicate woven detail, every wrinkle matches albedo. Bottom-left: diffuse ALBEDO of a 35cm square patch of rich muted chestnut-brown worn flexible leather satchel surface, natural fine irregular grain, restrained lighter abrasion, shallow asymmetrical pressure creases around upper-right and bottom, no seams buckle logo or object outline. Bottom-right: spatially registered tangent-space OpenGL NORMAL MAP of the exact bottom-left leather, purple-blue neutral Z with supple shallow creases and fine leather grain. Whole image orthographic surface scans, materials fill each quadrant to all edges, neutral diffuse even lighting without directional shadows or glossy highlights, nonmetallic physically plausible albedo of moderate darkness. Large drape structure must read at small game scale; fabric and leather must be distinct and natural, never plastic or noisy. Seamlessly repeating outer edges of each material where possible, same geometry exactly in each material's albedo and normal pair. No text, watermarks or perspective.

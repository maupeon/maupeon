# Recursos profesionales y atribución

El usuario autorizó incorporar recursos profesionales el 9 de septiembre de 2026. Los archivos se sirven desde el propio proyecto; el juego no consulta bibliotecas ni APIs externas durante la partida. Los recursos se adaptaron en Blender y se combinan con escenas, vestuario, animaciones y texturas originales del proyecto.

## Personajes

**Realistic Human Base Mesh**, Julien Kaspar / Blender Studio, Project Heist. [Fuente original](https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/), licencia [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Se extrajeron cabeza, cuello, manos y ojos de la base; se adaptaron ejes, proporciones y densidad de malla a Roger y a los tres personajes secundarios, conservando las identidades faciales originales. Se integraron con el retrato original, vestuario, pelo y esqueleto del juego. Las animaciones son originales del proyecto. La base de Blender Studio no es un retrato histórico de Casement. Su archivo original se conserva sin cambios, con SHA256 `1d9d2a6070acd6a3d0d9b676af816001310fb0f6128d07a3ab3e0318c7fdd981`.

**Fabric030 y Leather030**, Lennart Demes / ambientCG. [Fabric030](https://ambientcg.com/view?id=Fabric030), [Leather030](https://ambientcg.com/view?id=Leather030), [licencia CC0](https://docs.ambientcg.com/license/). Se usan color, normales y rugosidad con escala UV, tinte del material y codificación web adaptados a la ropa de los cuatro personajes y la cartera de Roger. Los mapas originales se conservan.

**Short02**, MakeHuman system assets; Data Collection AB, Joel Palmius y Jonas Hauquier. [Catálogo y licencia oficiales](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). El OBJ y el material originales incluyen la declaración de liberación de septiembre de 2020. El cabello se ajustó al cráneo de Roger, se subdividieron las tarjetas una vez y se vinculó al hueso de la cabeza. Se conservan las UV y el atlas RGBA original de hebras. El archivo de origen es `makehuman_system_assets_cc0.zip`; sólo se extrajeron los cuatro archivos necesarios de Short02.

Descargas, hashes y cambios: `tools/celta/assets/characters/provenance.json` y `ATTRIBUTION.md`; las adaptaciones de los personajes secundarios están documentadas en `NPC-ATTRIBUTION.md`.

## Escenarios

Materiales de [Poly Haven](https://polyhaven.com/license), licencia [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):

| Recurso | Autoría | Adaptación |
| --- | --- | --- |
| [Red Dirt Mud 01](https://polyhaven.com/a/red_dirt_mud_01) | Rob Tuytel | Suelo y barro del Congo; escala física, reflectancia, rugosidad y relieve. |
| [Bark Brown 02](https://polyhaven.com/a/bark_brown_02) | Rob Tuytel | Corteza de los árboles modelados, UV y normales ajustadas. |
| [Thatch Roof Angled](https://polyhaven.com/a/thatch_roof_angled) | Dimitrios Savva, fotografía; Rob Tuytel, procesamiento | Superficie de haces de paja en las cubiertas. |
| [Wood Planks Dirt](https://polyhaven.com/a/wood_planks_dirt) | Rob Tuytel | Madera envejecida en edificios, pasarelas y elementos costeros. |
| [Wood Planks Grey](https://polyhaven.com/a/wood_planks_grey) | Rob Tuytel | Tablas de cerramientos, con escala UV y tintes adaptados. |

Las geometrías de los tres escenarios son propias del proyecto. En la orilla del Congo se volvió a unir y erosionar la malla; las alturas de contacto proceden de los triángulos exportados. La superficie de pintura marfil del vapor y los flecos de paja originales se conservan donde corresponden.

Descargas y hashes: `tools/celta/assets/environment/` y la documentación de `professional_environments.py`.

## Vegetación

**Pachira Aquatica 01, Anthurium Botany 01 y Fern 02**, Rob Tuytel, escaneo; Rico Cilliers, modelado. [Pachira](https://polyhaven.com/a/pachira_aquatica_01), [Anthurium](https://polyhaven.com/a/anthurium_botany_01), [Fern 02](https://polyhaven.com/a/fern_02). Licencia [CC0 1.0](https://polyhaven.com/license).

Se seleccionaron hojas, ramas y plantas de los modelos originales y se adaptaron su escala, distribución, materiales y niveles de detalle. Se retiraron elementos propios de cultivo, como el tronco trenzado de una variante. Son recursos de dirección artística; su uso no constituye una reconstrucción botánica exacta de cada región histórica.

Dos variantes de palma larga, `LongPalmA` y `LongPalmALow`, conservan la geometría y textura original del proyecto. El resto de las nuevas variantes deriva de los recursos profesionales indicados. Los nombres internos `PalmA/B/C` se conservan por compatibilidad y corresponden al recurso Fern 02; el manifiesto registra la fuente botánica correcta.

Fuentes, hashes y cambios: `tools/celta/assets/foliage-professional/provenance.json`. La biblioteca de origen de las palmas originales permite regenerar el conjunto sin sobrescribir su única copia.

## Conservación de créditos

El cuaderno del juego incluye «Arte y recursos 3D», con autores, enlaces y licencias. Los GLB de los personajes conservan la atribución en sus metadatos. Al redistribuir una adaptación del recurso CC BY 4.0, deben conservarse la atribución, el enlace de licencia y la indicación de cambios. CC0 no exige atribución, pero el proyecto la mantiene para documentar su procedencia.

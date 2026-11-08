# Villa Pastel · Mini ciudad 3D interactiva

Proyecto final de **Programación de Entornos Multimedia**. Es una ciudad LOW-POLY que se explora desde el navegador.
Usa React + TypeScript + Vite + Three.js (React Three Fiber / Drei), y los modelos se generan en **Blender** con Python y se exportan a `.glb`.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
npm run preview    # sirve dist/ localmente
```

## Modelos de Blender (.glb)

Los modelos se generan con un script de Python para Blender, igual que en la Semana 8. Ese script lee la **misma**
configuración que usa la web (`src/data/buildings.json`), así que las medidas coinciden.

```bash
# Desde la carpeta del proyecto (Blender 3.6+ en el PATH)
blender --background --python blender/generar_modelos.py
```

En este equipo Blender 5.2 quedó instalado fuera del PATH; con la ruta completa (Git Bash):

```bash
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/generar_modelos.py
```

O dentro de Blender: pestaña **Scripting → Open → `blender/generar_modelos.py` → Run Script**.
Cada vez que cambies `src/data/buildings.json`, vuelve a ejecutar el script para regenerar los GLB.

El script exporta:

| Archivo | Contenido |
| --- | --- |
| `public/assets/models/buildings/<id>.glb` | Los 10 edificios (ventanas, techos, toldos, letrero con texto 3D, pórtico, torre del reloj) |
| `public/assets/models/city/{tree,pine,bush,lamp,bench,fountain}.glb` | Mobiliario urbano |
| `public/assets/models/characters/personaje.glb` | Personaje con articulaciones nombradas (`cuerpo`, `cabeza`, `brazo_izq/der`, `pierna_izq/der`) |
| `public/assets/models/manifest.json` | Lista de modelos disponibles |

La app lee `manifest.json` al iniciar:
- Si un modelo aparece en el manifiesto, se carga el **GLB de Blender**.
- Si no aparece, o si falla al cargar, se usa el **modelo procedural** equivalente.

Las manecillas del reloj (`manecilla_hora` y `manecilla_minuto`) se exportan como objetos aparte para que la web las
anime con la hora real. Si modelas algo a mano en Blender, conserva el origen en el centro de la base, con la fachada
hacia **−Y** (que es +Z en three.js), y agrega la ruta a `manifest.json`.

## Controles

| Tecla | Acción |
| --- | --- |
| W A S D / flechas | Caminar (relativo a la cámara) |
| Shift | Correr |
| Espacio | Saltar |
| Mouse | Mirar: clic en la ciudad para capturar el puntero; sin captura, arrastrar |
| Rueda | Acercar / alejar la cámara |
| Esc | Pausa (también al soltar el puntero) |

En pantallas táctiles aparecen un joystick y botones para saltar y correr.
Con `?fisica` en la URL se dibujan los colliders de Rapier (depuración).

## Personaje y física (Fase 2)

- **Rapier** (`@react-three/rapier`) con cuerpos fijos para la ciudad: suelo, aceras, edificios, fuente, kiosco, troncos, farolas, bancas, autos y límites del mundo. Todo son primitivas, sin trimesh.
- **Personaje:** cuerpo cinemático con `KinematicCharacterController`. Sube escalones de hasta 0.45 m, se pega al suelo, maneja pendientes y empuja objetos dinámicos. El movimiento se calcula en cada paso fijo de física (`useBeforePhysicsStep`), con aceleración y frenado exponenciales, gravedad y salto.
- **Cámara en tercera persona:** gira con yaw/pitch y la distancia es ajustable. Un rayo de Rapier evita que atraviese paredes, y las copas de los árboles son sensores que solo detiene la cámara.
- **Animación procedural:** las poses de reposo, caminar, correr y saltar se calculan rotando las articulaciones. Esto funciona igual con el personaje procedural y con el GLB de Blender.
- **Objetos dinámicos:** 2 pelotas con rebote (`restitution` 0.82) y 3 cajas que se pueden empujar.

## Interacción con edificios (Fase 3)

- **Raycasting:** cada edificio registra una caja *proxy* invisible ([buildingPicker.ts](src/systems/interaction/buildingPicker.ts)). El rayo sale del centro de la pantalla si el puntero está capturado, o del cursor si no lo está. Los edificios decorativos también tienen proxy para tapar a los que están detrás.
- **Resaltado:** al apuntar o seleccionar un edificio interactivo aparecen un contorno y un volumen brillante. Sobre cada edificio interactivo flota un rombo: naranja si tiene interior, azul si solo muestra información.
- **Proximidad (tecla E):** un trigger radial (`distanceTo`) frente a cada puerta. Al acercarse, el anillo del suelo se ilumina y aparece «E · Ver …».
- **Panel de información:** muestra nombre, tipo, descripción, datos opcionales y coordenadas, y tiene el botón Entrar (se activará con los interiores de la Fase 4). Abrirlo libera el puntero sin pausar el juego y detiene al personaje. Esc o Cerrar lo cierran.
- **Pantallas táctiles:** tocar un edificio lo selecciona, y el indicador «E» también se puede tocar.

## Interiores (Fase 4)

- **Flujo:** se selecciona el edificio → **Entrar** → la cámara se acerca mientras la pantalla funde a negro con el nombre del lugar → se carga el interior → el personaje aparece en la entrada → fundido de vuelta. Las etapas son `out → loading → in` y las controla [TransitionController.tsx](src/systems/transitions/TransitionController.tsx).
- **Carga diferida:** cada interior es un *chunk* aparte (`React.lazy`) que se descarga la primera vez que se entra y se desmonta al salir. Solo hay un interior montado a la vez.
- **La ciudad no se destruye:** [SceneManager.tsx](src/scenes/SceneManager.tsx) la mantiene montada pero oculta, y cada interior vive lejos del mapa (x = ±600). Las pelotas, las cajas y el reloj conservan su estado.
- **Salir:** con el botón «Salir a la ciudad» o con **E** frente a la puerta. El personaje vuelve a la posición que tenía antes de entrar, mirando hacia la calle.
- **Objetos interactivos genéricos:** se declaran con `<Interactable>` ([Interactable.tsx](src/components/game/interactables/Interactable.tsx)) y una acción propia (`onActivate`). El motor ([interactables.ts](src/systems/interaction/interactables.ts) + InteractionSystem) no cambia al agregar objetos nuevos. Los textos están en [interiorContent.ts](src/data/interiorContent.ts).
  - **Cafetería:** mostrador (precios), máquina de café animada (piloto, vapor de partículas y taza que se llena), vitrina de postres y pizarra del día.
  - **Biblioteca:** 3 libros destacados que se levantan al leerlos y abren su ficha, mostrador de préstamos, globo terráqueo que gira y lámpara de lectura que se enciende y apaga.

## Audio, triggers y optimización (Fase 5)

- **Audio** ([audioManager.ts](src/systems/audio/audioManager.ts)): hay un único `AudioListener` en la cámara.
  - `PositionalAudio` anclado a la fuente: se oye completo a 3 m y deja de oírse a 16 m, con atenuación lineal.
  - `THREE.Audio` para los efectos globales: puerta al entrar o salir, clic al interactuar, y los sonidos de los triggers.
  - El audio se desbloquea al pulsar «Comenzar». El botón de silencio y el volumen (en la pausa) se recuerdan entre sesiones.
  - Los sonidos se **sintetizan** con [scripts/generar_audio.py](scripts/generar_audio.py), así que no dependen de descargas ni licencias externas.
- **Triggers** ([TriggerSystem.tsx](src/systems/interaction/TriggerSystem.tsx)): uno radial (`distanceTo`) en la fuente y otro AABB (`Box3`) en el parque. Cada uno guarda si el personaje está dentro y tiene un *cooldown*, así que solo se disparan al entrar, con sonido y un aviso en pantalla.
- **Rendimiento:**
  - El sol sigue al personaje, de modo que la sombra cubre ~76 m a su alrededor (en el menú cubre toda la ciudad) y se ve más nítida con el mismo mapa de 2048².
  - El HUD muestra los FPS. La partida se pausa sola al cambiar de pestaña, y en pausa el render se detiene.
  - Se mantiene lo de fases anteriores: instanciado, materiales compartidos, carga diferida de interiores y `AdaptiveDpr`.

## Checklist del proyecto final (Semana 10)

| # | Requisito | Dónde se cumple |
| --- | --- | --- |
| 1 | Escenario 3D importado desde Blender (.glb) con iluminación y sombras | `blender/generar_modelos.py` exporta 10 edificios, 6 props y el personaje; luz hemisférica y sol con sombras |
| 2 | Control de cámara fluido | Cámara en tercera persona con Pointer Lock, rueda y colisión (más órbita en el menú) |
| 3 | 1 `PositionalAudio` anclado + 1 `THREE.Audio` de evento global | Agua de la fuente (posicional); puerta, clic y triggers (globales) |
| 4 | 2 triggers: radial (`distanceTo`) y AABB (`Box3`) con cooldown | `TriggerSystem.tsx` (fuente y parque); también las zonas del HUD y las entradas con E |
| 5 | Partículas con `BufferGeometry` + `Float32Array` | Chorro de la fuente y vapor de la máquina de café (con reciclaje) |
| 6 | Objeto dinámico con masa, gravedad y rebote | Pelotas (`restitution` 0.82) y cajas con Rapier, empujadas por el personaje |
| 7 | HUD con zona actual y coordenadas en tiempo real | `Hud.tsx`: zona, X/Z y FPS, actualizados cada 100 ms sin re-render de React |
| 8 | ~60 FPS sin crear objetos dentro del bucle | Vectores y objetos preasignados; instanciado; FPS visibles en el HUD |

## Estructura

```
blender/generar_modelos.py      Script bpy: modela y exporta todos los GLB
src/
  types/city.ts                 Interfaces: BuildingConfig, StreetConfig, ZoneConfig, ModelManifest…
  data/                         Configuración centralizada
    buildings.json / .ts        10 edificios (id, nombre, descripción, coordenadas, tipo, interiorId, estilo)
    cityLayout.ts               Calles, aceras, parque, mobiliario, señales, zonas (triggers)
    palette.ts, controls.ts
  stores/useGameStore.ts        Zustand: fase, escena actual, selección, transición, manifiesto
  systems/
    assets/modelManifest.ts     Carga del manifiesto de modelos
    interaction/                Zonas (distanceTo / Box3), picker por raycasting y sistema de proximidad (E)
    telemetry.ts                Datos que cambian por frame (fuera de React)
    audio/                      AudioListener, PositionalAudio de la fuente y efectos globales
    FpsMeter.tsx                Medición de FPS para el HUD
    movement/                   Entrada (teclado/táctil), estado de cámara y personaje, cámara 3.ª persona
    physics/                    Colliders de la ciudad y objetos dinámicos
    transitions/                Fundido + acercamiento de cámara entre escenas
  components/
    game/                       Canvas, cámara, luces, instanciado, edificios y props
    ui/                         Pantalla inicial, carga, HUD, pausa, controles
  scenes/city/                  Calles, parque, fuente con partículas, señalización, edificios
  scenes/SceneManager.tsx       Ciudad siempre montada + interior activo (lazy)
  scenes/interiors/             Sala base, muebles, cafetería y biblioteca
  hooks/ utils/ pages/
public/assets/models/{city,buildings,interiors,characters}, textures/, audio/
scripts/generar_audio.py        Síntesis de los efectos de sonido (WAV)
```

## Rendimiento

- `InstancedMesh` para árboles, pinos, arbustos, farolas, bancas, flores, ventanas y franjas viales.
- Geometrías unitarias compartidas y materiales cacheados por color.
- Las farolas y semáforos usan materiales emisivos en lugar de luces dinámicas. Hay una sola luz con sombras.
- La fuente usa partículas con `BufferGeometry` + `Float32Array` y reciclaje (pooling), sin crear objetos dentro del bucle.
- El HUD lee la telemetría cada 100 ms en vez de re-renderizar React en cada frame.
- El render se detiene durante la pausa (`frameloop="never"`) y se usa `AdaptiveDpr`.

## Despliegue

El build genera una SPA estática en `dist/`:

```bash
npm run build
npm run preview   # prueba local de producción en http://localhost:4173
```

- **Vercel:** importar el repositorio. [vercel.json](vercel.json) ya define el comando de build, la salida `dist/`, el *rewrite* de la SPA (que excluye `/assets`) y la caché de los modelos GLB.
- **Cloudflare Pages:** usar el comando `npm run build` y la carpeta de salida `dist`. Como no hay `404.html`, Pages sirve la SPA y las rutas como `/acerca` funcionan sin configuración extra.
- Todas las rutas a recursos (GLB, audio) pasan por `assetUrl()`, que respeta `import.meta.env.BASE_URL`. Si se publica en un subdirectorio, basta con ajustar `base` en `vite.config.ts`.
- Los interiores y Rapier se cargan en *chunks* separados. Los modelos, el audio y las texturas se sirven desde `public/assets` sin pasar por el bundler.

## Fases

| Fase | Estado |
| --- | --- |
| 1. Proyecto, Canvas, terreno, ciudad provisional, iluminación, cámara | ✅ |
| 2. Personaje, movimiento WASD/Shift/Espacio, cámara 3.ª persona, Rapier | ✅ |
| 3. Selección por raycasting, resaltado, panel de información, tecla E | ✅ |
| 4. Escenas interiores (cafetería, biblioteca) con transición y fundido | ✅ |
| 5. Audio posicional/global, triggers, optimización, pulido y despliegue | ✅ |

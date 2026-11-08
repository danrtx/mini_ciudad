import { useFrame } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { INTERIORS } from '../../../data/interiors';
import { isPlayerFrozen, useGameStore } from '../../../stores/useGameStore';
import { cameraState } from '../../../systems/movement/cameraState';
import { input, readMoveAxes } from '../../../systems/movement/input';
import { PLAYER, playerState } from '../../../systems/movement/playerState';
import { detectZone } from '../../../systems/interaction/zones';
import { telemetry } from '../../../systems/telemetry';
import { animateRig, type CharacterRig } from './characterRig';
import { CharacterModel } from './CharacterModel';

const tmpWish = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Personaje jugable.
 * - Cuerpo cinemático + KinematicCharacterController de Rapier: colisiones, escalones (autostep),
 *   pegado al suelo, pendientes y empuje de objetos dinámicos.
 * - El movimiento se calcula en cada paso fijo de física (useBeforePhysicsStep), relativo a la cámara,
 *   con aceleración/desaceleración suaves, gravedad y salto.
 * - La animación y la rotación visual se hacen por fotograma (useFrame), sin estado de React.
 */
export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const colliderRef = useRef<RapierCollider>(null);
  const visualRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const motion = useRef({
    velocity: new THREE.Vector3(),
    vertical: 0,
    grounded: true,
    jumpLatch: false,
    facing: PLAYER.spawnFacing,
    animPhase: { phase: 0 },
    telemetryTimer: 0,
  });
  const { world } = useRapier();

  // Se crea y destruye en el mismo efecto (compatible con el doble montaje de StrictMode)
  const controllerRef = useRef<KinematicCharacterController | null>(null);
  useEffect(() => {
    const c = world.createCharacterController(0.06);
    c.enableAutostep(0.45, 0.2, false);
    c.enableSnapToGround(0.35);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(true);
    c.setCharacterMass(55);
    c.setSlideEnabled(true);
    controllerRef.current = c;
    return () => {
      controllerRef.current = null;
      world.removeCharacterController(c);
    };
  }, [world]);

  useEffect(() => {
    playerState.object = visualRef.current;
    playerState.body = bodyRef.current;
    playerState.teleport = (position, facing) => {
      const body = bodyRef.current;
      if (!body) return;
      const m = motion.current;
      const target = { x: position[0], y: position[1], z: position[2] };
      body.setTranslation(target, true);
      body.setNextKinematicTranslation(target);
      m.velocity.set(0, 0, 0);
      m.vertical = 0;
      m.grounded = false;
      m.facing = facing;
      if (modelRef.current) modelRef.current.rotation.y = facing;
      cameraState.yaw = facing + Math.PI;
      cameraState.snap = true;
    };
    cameraState.yaw = PLAYER.spawnFacing + Math.PI; // cámara detrás del personaje
    // Acceso de depuración desde la consola (solo en desarrollo)
    if (import.meta.env.DEV) Object.assign(window, { __juego: { playerState, input, cameraState, motion: motion.current } });
    return () => {
      playerState.object = null;
      playerState.body = null;
      playerState.teleport = null;
    };
  }, []);

  const onRig = useCallback((rig: CharacterRig) => {
    rigRef.current = rig;
  }, []);

  // ------------------------------------------------------------ física (paso fijo)
  useBeforePhysicsStep((physicsWorld) => {
    const body = bodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    if (!body || !collider || !controller) return;
    const m = motion.current;
    const dt = physicsWorld.timestep;
    // Con un panel abierto, en pausa o durante una transición el personaje se queda quieto
    const playing = !isPlayerFrozen();

    // Dirección deseada relativa a la cámara
    const axes = playing ? readMoveAxes() : { x: 0, y: 0 };
    const yaw = cameraState.yaw;
    tmpWish.set(-Math.sin(yaw) * axes.y + Math.cos(yaw) * axes.x, 0, -Math.cos(yaw) * axes.y - Math.sin(yaw) * axes.x);
    const speed = playing && input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    tmpTarget.copy(tmpWish).multiplyScalar(speed);

    // Aceleración / desaceleración exponencial
    const moving = tmpWish.lengthSq() > 0.001;
    const accel = m.grounded ? (moving ? PLAYER.groundAccel : PLAYER.groundDecel) : PLAYER.airAccel;
    m.velocity.lerp(tmpTarget, 1 - Math.exp(-accel * dt));

    // Gravedad y salto
    if (!input.jump) m.jumpLatch = false;
    if (m.grounded) {
      m.vertical = -2; // mantiene el contacto con el suelo en bajadas
      if (playing && input.jump && !m.jumpLatch) {
        m.vertical = PLAYER.jumpVelocity;
        m.jumpLatch = true;
        m.grounded = false;
      }
    } else {
      m.vertical = Math.max(m.vertical + PLAYER.gravity * dt, -40);
    }

    const desired = { x: m.velocity.x * dt, y: m.vertical * dt, z: m.velocity.z * dt };
    controller.computeColliderMovement(collider, desired);
    const move = controller.computedMovement();
    const wasRising = m.vertical > 0;
    m.grounded = controller.computedGrounded() && !(wasRising && move.y > 0.0001);
    if (wasRising && move.y < desired.y * 0.5) m.vertical = 0; // golpe contra un techo

    // Si una pared frena el avance, la velocidad también se reduce (evita "empujar" sin moverse)
    if (dt > 0) {
      m.velocity.x = THREE.MathUtils.lerp(m.velocity.x, move.x / dt, 0.5);
      m.velocity.z = THREE.MathUtils.lerp(m.velocity.z, move.z / dt, 0.5);
    }

    const p = body.translation();
    let nx = p.x + move.x;
    let ny = p.y + move.y;
    let nz = p.z + move.z;
    if (ny < -15) {
      // Red de seguridad: si cae fuera del mundo, reaparece
      [nx, ny, nz] = PLAYER.spawn;
      m.velocity.set(0, 0, 0);
      m.vertical = 0;
    }
    body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });

    if (moving && m.velocity.lengthSq() > 0.25) m.facing = Math.atan2(m.velocity.x, m.velocity.z);
    playerState.facing = m.facing;
    playerState.grounded = m.grounded;
    playerState.speed = Math.hypot(m.velocity.x, m.velocity.z);
    playerState.verticalVelocity = m.vertical;
  });

  // ------------------------------------------------------------ visual (por fotograma)
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const m = motion.current;
    const model = modelRef.current;
    if (model) model.rotation.y += shortestAngle(model.rotation.y, m.facing) * (1 - Math.exp(-PLAYER.turnSpeed * delta));

    const speedNorm = playerState.speed / PLAYER.walkSpeed;
    if (rigRef.current) {
      animateRig(rigRef.current, { speed: speedNorm, grounded: m.grounded, verticalVelocity: m.vertical }, m.animPhase, delta);
    }

    useGameStore
      .getState()
      .setPlayerMotion(!m.grounded ? 'air' : speedNorm > 1.3 ? 'run' : speedNorm > 0.1 ? 'walk' : 'idle');

    // Telemetría para el HUD (zona + coordenadas del personaje)
    m.telemetryTimer += delta;
    const visual = visualRef.current;
    if (visual && m.telemetryTimer > 0.12) {
      m.telemetryTimer = 0;
      visual.getWorldPosition(tmpPos);
      telemetry.x = tmpPos.x;
      telemetry.y = tmpPos.y;
      telemetry.z = tmpPos.z;
      const scene = useGameStore.getState().currentScene;
      if (scene === 'city') {
        const zone = detectZone(tmpPos);
        telemetry.zoneId = zone.id;
        telemetry.zoneName = zone.name;
      } else {
        // Dentro de un interior se muestran coordenadas locales de la sala
        const o = INTERIORS[scene].origin;
        telemetry.x = tmpPos.x - o[0];
        telemetry.z = tmpPos.z - o[2];
        telemetry.zoneId = scene;
        telemetry.zoneName = INTERIORS[scene].name;
      }
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={PLAYER.spawn}
      enabledRotations={[false, false, false]}
      name="personaje"
    >
      <CapsuleCollider ref={colliderRef} args={[PLAYER.capsuleHalfHeight, PLAYER.capsuleRadius]} />
      <group ref={visualRef}>
        <group ref={modelRef} position={[0, -PLAYER.footOffset, 0]} rotation={[0, PLAYER.spawnFacing, 0]}>
          <CharacterModel onRig={onRig} />
        </group>
        {/* Sombra de contacto suave bajo los pies */}
        <mesh position={[0, -PLAYER.footOffset + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}

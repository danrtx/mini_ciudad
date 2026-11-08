import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { PARK, PARK_Y } from '../../data/cityLayout';
import type { Vec3 } from '../../types/city';
import { GEO, getMaterial } from '../../utils/sharedResources';

/**
 * Objetos dinámicos con masa, gravedad y rebote (requisito de físicas del curso).
 * El personaje los empuja al caminar contra ellos (impulsos del controlador cinemático).
 */
function BeachBall({ position, color }: { position: Vec3; color: string }) {
  return (
    <RigidBody colliders={false} position={position} restitution={0.82} friction={0.6} linearDamping={0.35} angularDamping={0.4} canSleep name="pelota">
      <BallCollider args={[0.5]} mass={0.8} />
      <mesh geometry={GEO.ico1} material={getMaterial(color, { roughness: 0.45 })} scale={1} castShadow />
      <mesh geometry={GEO.ico1} material={getMaterial('#ffffff', { roughness: 0.45 })} scale={[1.01, 0.35, 1.01]} />
    </RigidBody>
  );
}

function Crate({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <RigidBody colliders={false} position={position} rotation={[0, rotationY, 0]} restitution={0.15} friction={0.9} canSleep name="caja">
      <CuboidCollider args={[0.45, 0.45, 0.45]} mass={6} />
      <mesh geometry={GEO.box} material={getMaterial('#c8955d')} scale={0.9} castShadow receiveShadow />
      <mesh geometry={GEO.box} material={getMaterial('#9c6b3c')} scale={[0.94, 0.16, 0.94]} />
      <mesh geometry={GEO.box} material={getMaterial('#9c6b3c')} scale={[0.16, 0.94, 0.94]} />
    </RigidBody>
  );
}

export function PhysicsToys() {
  const [fx, , fz] = PARK.fountainCenter;
  return (
    <group name="objetos-dinamicos">
      <BeachBall position={[fx + 5.2, PARK_Y + 3, fz]} color="#e8735a" />
      <BeachBall position={[fx, PARK_Y + 5, fz - 8.5]} color="#7cc6e8" />
      {/* Cajas de fruta frente al mercado */}
      <Crate position={[13, 0.5, 26.4]} />
      <Crate position={[14.1, 0.5, 26.6]} rotationY={0.3} />
      <Crate position={[13.5, 1.45, 26.5]} rotationY={-0.2} />
    </group>
  );
}

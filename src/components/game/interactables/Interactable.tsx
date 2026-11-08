import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../stores/useGameStore';
import { registerInteractable } from '../../../systems/interaction/interactables';

const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitEdges = new THREE.EdgesGeometry(unitBox);

export interface InteractableProps {
  id: string;
  name: string;
  verb?: string;
  description?: string;
  details?: Record<string, string>;
  position: [number, number, number];
  rotationY?: number;
  /** Volumen seleccionable [ancho, alto, fondo] (con la base en y = 0). */
  size: [number, number, number];
  /** Radio del trigger de proximidad (tecla E). */
  radius?: number;
  color?: string;
  onActivate?: () => void;
  children?: ReactNode;
}

/**
 * Envoltorio genérico para cualquier objeto interactivo de una escena.
 * Registra su caja de selección y su trigger de proximidad; dibuja un contorno al apuntarlo o
 * acercarse. El contenido visual (children) y la acción (onActivate) los define cada escena.
 */
export function Interactable({
  id,
  name,
  verb = 'Ver',
  description,
  details,
  position,
  rotationY = 0,
  size,
  radius = 2.2,
  color = '#ffb347',
  onActivate,
  children,
}: InteractableProps) {
  const groupRef = useRef<THREE.Group>(null);
  const proxyRef = useRef<THREE.Mesh>(null);
  const activateRef = useRef(onActivate);
  activateRef.current = onActivate;

  const highlighted = useGameStore(
    (s) => s.hoveredObjectId === id || s.nearbyObjectId === id || s.activeInteractionId === id,
  );
  const edgeMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false }),
    [color],
  );
  useEffect(() => () => edgeMaterial.dispose(), [edgeMaterial]);

  useEffect(() => {
    const group = groupRef.current;
    const proxy = proxyRef.current;
    if (!group || !proxy) return;
    group.updateWorldMatrix(true, true);
    proxy.userData.interactableId = id;
    const point = new THREE.Vector3();
    group.getWorldPosition(point);
    point.y = 0;
    return registerInteractable({
      id,
      name,
      verb,
      description,
      details,
      proxy,
      point,
      radius,
      onActivate: () => activateRef.current?.(),
    });
  }, [id, name, verb, description, details, radius]);

  const [w, h, d] = size;
  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} name={`interactivo-${id}`}>
      {children}
      <mesh ref={proxyRef} geometry={unitBox} material={proxyMaterial} position={[0, h / 2, 0]} scale={[w, h, d]} />
      {highlighted && (
        <lineSegments geometry={unitEdges} material={edgeMaterial} position={[0, h / 2, 0]} scale={[w * 1.04, h * 1.04, d * 1.04]} renderOrder={10} />
      )}
    </group>
  );
}

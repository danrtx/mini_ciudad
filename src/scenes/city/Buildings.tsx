import { Building } from '../../components/game/buildings/Building';
import { BUILDINGS } from '../../data/buildings';

export function Buildings() {
  return (
    <group name="edificios">
      {BUILDINGS.map((b) => (
        <Building key={b.id} config={b} />
      ))}
    </group>
  );
}

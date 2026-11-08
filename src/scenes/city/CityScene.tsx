import { UrbanProps } from '../../components/game/props/UrbanProps';
import { Buildings } from './Buildings';
import { Park } from './Park';
import { StreetFurniture } from './StreetFurniture';
import { Streets } from './Streets';

/** Escena exterior: compone todas las capas de la ciudad. */
export function CityScene() {
  return (
    <group name="ciudad">
      <Streets />
      <Park />
      <Buildings />
      <UrbanProps />
      <StreetFurniture />
    </group>
  );
}

import { BookOpen, Building2, Coffee, Croissant, Home, Hotel, Landmark, ShoppingBasket, type LucideIcon } from 'lucide-react';
import type { BuildingType } from '../../types/city';

export const BUILDING_ICONS: Record<BuildingType, LucideIcon> = {
  cafeteria: Coffee,
  biblioteca: BookOpen,
  tienda: ShoppingBasket,
  casa: Home,
  apartamentos: Building2,
  oficinas: Building2,
  ayuntamiento: Landmark,
  hotel: Hotel,
  panaderia: Croissant,
};

export const BUILDING_TYPE_LABEL: Record<BuildingType, string> = {
  cafeteria: 'Cafetería',
  biblioteca: 'Biblioteca',
  tienda: 'Tienda',
  casa: 'Vivienda',
  apartamentos: 'Apartamentos',
  oficinas: 'Oficinas',
  ayuntamiento: 'Centro cultural',
  hotel: 'Hotel',
  panaderia: 'Panadería',
};

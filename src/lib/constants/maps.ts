import type { MapData } from '../types';

export const MAPS: MapData[] = [
  { id: 'abyss', name: 'Abyss', image: '/images/maps/abyss.jpg' },
  { id: 'ascent', name: 'Ascent', image: '/images/maps/ascent.jpg' },
  { id: 'bind', name: 'Bind', image: '/images/maps/bind.jpg' },
  { id: 'breeze', name: 'Breeze', image: '/images/maps/breeze.jpg' },
  { id: 'fracture', name: 'Fracture', image: '/images/maps/fracture.jpg' },
  { id: 'haven', name: 'Haven', image: '/images/maps/haven.jpg' },
  { id: 'icebox', name: 'Icebox', image: '/images/maps/icebox.jpg' },
  { id: 'lotus', name: 'Lotus', image: '/images/maps/lotus.jpg' },
  { id: 'pearl', name: 'Pearl', image: '/images/maps/pearl.jpg' },
  { id: 'split', name: 'Split', image: '/images/maps/split.jpg' },
  { id: 'sunset', name: 'Sunset', image: '/images/maps/sunset.jpg' },
];

export function getMapById(id: string): MapData | undefined {
  return MAPS.find((map) => map.id === id);
}

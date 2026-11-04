import { colors } from '@/constants/theme';
import type { OpeningSide } from './types';

export const SCHEMA_VIEW_WIDTH = 240;
export const SCHEMA_VIEW_HEIGHT = 180;

export const SCHEMA_ROLE_COLORS: Record<SchemaRole, string> = {
  wall: colors.wall,
  door: colors.primary,
  guide: colors.border,
  caption: colors.textMuted,
};

const WALL_Y = 90;
const OPENING_START = 80;
const OPENING_END = 160;
const LEAF_LENGTH = OPENING_END - OPENING_START;
const AJAR_ANGLE = (50 * Math.PI) / 180;

export type SchemaRole = 'wall' | 'door' | 'guide' | 'caption';

export type SchemaElement =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; role: SchemaRole; strokeWidth: number; dashed?: boolean }
  | { kind: 'path'; d: string; role: SchemaRole; strokeWidth: number; dashed?: boolean }
  | { kind: 'circle'; cx: number; cy: number; r: number; role: SchemaRole }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; role: SchemaRole }
  | { kind: 'text'; x: number; y: number; text: string; role: SchemaRole };

function getSwingElements(side: OpeningSide): SchemaElement[] {
  const isPull = side.startsWith('pull');
  const isPush = side.startsWith('push');
  if (!isPull && !isPush) return [];

  const hingeOnLeft = side.endsWith('left');
  const hingeX = hingeOnLeft ? OPENING_START : OPENING_END;
  const directionX = hingeOnLeft ? 1 : -1;
  const directionY = isPull ? 1 : -1;

  const closedX = hingeX + directionX * LEAF_LENGTH;
  const leafX = hingeX + directionX * LEAF_LENGTH * Math.cos(AJAR_ANGLE);
  const leafY = WALL_Y + directionY * LEAF_LENGTH * Math.sin(AJAR_ANGLE);

  const startAngle = Math.atan2(leafY - WALL_Y, leafX - hingeX);
  const endAngle = Math.atan2(0, closedX - hingeX);
  let delta = endAngle - startAngle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  const sweep = delta > 0 ? 1 : 0;

  return [
    {
      kind: 'path',
      d: `M ${leafX} ${leafY} A ${LEAF_LENGTH} ${LEAF_LENGTH} 0 0 ${sweep} ${closedX} ${WALL_Y}`,
      role: 'guide',
      strokeWidth: 1.5,
      dashed: true,
    },
    { kind: 'line', x1: hingeX, y1: WALL_Y, x2: leafX, y2: leafY, role: 'door', strokeWidth: 2.5 },
    { kind: 'circle', cx: hingeX, cy: WALL_Y, r: 3, role: 'door' },
  ];
}

export function getSchemaElements(side: OpeningSide | null): SchemaElement[] {
  const walls: SchemaElement[] = [
    { kind: 'line', x1: 0, y1: WALL_Y, x2: OPENING_START, y2: WALL_Y, role: 'wall', strokeWidth: 4 },
    { kind: 'line', x1: OPENING_END, y1: WALL_Y, x2: SCHEMA_VIEW_WIDTH, y2: WALL_Y, role: 'wall', strokeWidth: 4 },
  ];

  const door: SchemaElement[] = [];
  if (side === 'slide-outer') door.push({ kind: 'rect', x: 70, y: 78, width: 100, height: 8, role: 'door' });
  if (side === 'slide-inner') door.push({ kind: 'rect', x: 70, y: 94, width: 100, height: 8, role: 'door' });
  if (side) door.push(...getSwingElements(side));

  const caption: SchemaElement = {
    kind: 'text',
    x: SCHEMA_VIEW_WIDTH / 2,
    y: 170,
    text: 'коридор',
    role: 'caption',
  };

  return [...walls, ...door, caption];
}

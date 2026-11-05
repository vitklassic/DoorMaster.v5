export const FLOOR_OPTIONS = ['Подвал', '1 этаж', '2 этаж', '3 этаж'] as const;

export const ROOM_OPTIONS = [
  'Зал',
  'Кухня',
  'Ванная',
  'С/у',
  'Спальня',
  'Детская',
  'Кладовая',
  'Постирочная',
  'Гардероб',
  'Тамбур',
  'Подвал',
] as const;

export const OPENING_SIDE_OPTIONS = [
  { id: 'pull-left', label: 'На себя влево' },
  { id: 'pull-right', label: 'На себя вправо' },
  { id: 'push-left', label: 'От себя влево' },
  { id: 'push-right', label: 'От себя вправо' },
  { id: 'slide-outer', label: 'Раздвижные по наружной стене' },
  { id: 'slide-inner', label: 'Раздвижные по внутренней стене' },
] as const;

export type OpeningSide = (typeof OPENING_SIDE_OPTIONS)[number]['id'];

export const DIMENSION_LIMITS = {
  height: { min: 1500, max: 3000 },
  width: { min: 400, max: 2500 },
  thickness: { min: 20, max: 200 },
} as const;

export type Opening = {
  id: string;
  floor: string | null;
  room: string | null;
  photoDataUrl: string | null;
  height: number | null;
  width: number | null;
  thickness: number | null;
  side: OpeningSide | null;
};

export type OpeningInput = Omit<Opening, 'id'>;

export type MeasurementDetails = {
  homeName: string;
  address: string;
  clientName: string;
  floor: string;
  entrance: string;
  apartment: string;
  notes: string;
};

export const MEASUREMENT_STATUSES = ['draft', 'active', 'done', 'archived'] as const;

export type MeasurementStatus = (typeof MEASUREMENT_STATUSES)[number];

export type Measurement = MeasurementDetails & {
  id: string;
  createdAt: string;
  status: MeasurementStatus;
  openings: Opening[];
};

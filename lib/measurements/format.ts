import { OPENING_SIDE_OPTIONS, type Opening, type OpeningSide } from './types';

export const NOT_SPECIFIED = 'не указано';

export function textOrNotSpecified(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? NOT_SPECIFIED : trimmed;
}

export function millimetersOrNotSpecified(value: number | null): string {
  return value === null ? NOT_SPECIFIED : `${value} мм`;
}

export function getRoomLabels(openings: Opening[]): string[] {
  const totals = new Map<string, number>();
  for (const opening of openings) {
    if (opening.room) totals.set(opening.room, (totals.get(opening.room) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return openings.map((opening) => {
    if (!opening.room) return NOT_SPECIFIED;
    if ((totals.get(opening.room) ?? 0) < 2) return opening.room;
    const number = (seen.get(opening.room) ?? 0) + 1;
    seen.set(opening.room, number);
    return `${opening.room} ${number}`;
  });
}

export function getSideLabel(side: OpeningSide | null): string {
  if (!side) return NOT_SPECIFIED;
  return OPENING_SIDE_OPTIONS.find((option) => option.id === side)?.label ?? side;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

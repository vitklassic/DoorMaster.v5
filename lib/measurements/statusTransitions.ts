import type { MeasurementStatus } from './types';

// Единая таблица допустимых переходов статуса замера (используют api, mock и UI).
// Зеркалит проверку в RPC set_measurement_status — при изменении менять оба места.
export const STATUS_TRANSITIONS: Record<MeasurementStatus, MeasurementStatus[]> = {
  draft: ['active'],
  active: ['done', 'draft'],
  done: ['archived', 'active'],
  archived: ['done'],
};

export const STATUS_LABELS: Record<MeasurementStatus, string> = {
  draft: 'Черновик',
  active: 'В работе',
  done: 'Готово',
  archived: 'В архиве',
};

const STATUS_TRANSITION_LABELS: Partial<Record<`${MeasurementStatus}->${MeasurementStatus}`, string>> = {
  'draft->active': 'Начать замер',
  'active->done': 'Завершить замер',
  'active->draft': 'Вернуть в черновик',
  'done->active': 'Вернуть в работу',
  'done->archived': 'В архив',
  'archived->done': 'Вернуть из архива',
};

export function getTransitionLabel(from: MeasurementStatus, to: MeasurementStatus): string {
  return STATUS_TRANSITION_LABELS[`${from}->${to}`] ?? to;
}

export function canTransition(from: MeasurementStatus, to: MeasurementStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(status: MeasurementStatus): MeasurementStatus[] {
  return STATUS_TRANSITIONS[status];
}

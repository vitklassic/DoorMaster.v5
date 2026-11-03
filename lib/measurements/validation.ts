export type DimensionCheck = {
  value: number | null;
  error: string | null;
  warning: string | null;
};

type Limits = { min: number; max: number };

export function checkDimension(text: string, limits: Limits): DimensionCheck {
  const trimmed = text.trim();
  if (!trimmed) return { value: null, error: null, warning: null };
  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: 'Введите целое число в миллиметрах', warning: null };
  }
  const value = Number(trimmed);
  if (value === 0) {
    return { value: null, error: 'Размер не может быть нулевым', warning: null };
  }
  if (value < limits.min) {
    return { value, error: null, warning: `Значение меньше ${limits.min} мм. Проверьте замер` };
  }
  if (value > limits.max) {
    return { value, error: null, warning: `Значение больше ${limits.max} мм. Проверьте замер` };
  }
  return { value, error: null, warning: null };
}

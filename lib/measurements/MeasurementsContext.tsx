import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as measurementsApi from '@/lib/backend/measurementsApi';
import { subscribeToCompanyMeasurements } from '@/lib/backend/measurementsRealtime';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Tenant } from '@/lib/auth/tenant';
import type { Measurement, MeasurementDetails, OpeningInput } from './types';

const SYNC_ERROR_MESSAGE = 'Не удалось сохранить изменения. Проверьте соединение и попробуйте еще раз';
const LOAD_ERROR_MESSAGE = 'Не удалось загрузить замеры. Обновите страницу';

type MeasurementsContextValue = {
  measurements: Measurement[];
  loading: boolean;
  syncError: string | null;
  createMeasurement: (input: MeasurementDetails) => Promise<string | null>;
  updateMeasurement: (measurementId: string, input: MeasurementDetails) => Promise<boolean>;
  addOpening: (measurementId: string, opening: OpeningInput) => Promise<boolean>;
  updateOpening: (openingId: string, opening: OpeningInput) => Promise<boolean>;
  deleteOpening: (openingId: string) => Promise<boolean>;
  deleteMeasurement: (measurementId: string) => Promise<boolean>;
};

const MeasurementsContext = createContext<MeasurementsContextValue | null>(null);

export function MeasurementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const companyId = user?.companyId ?? null;
  const tenant = useMemo<Tenant | null>(
    () => (userId && companyId ? { userId, companyId } : null),
    [userId, companyId]
  );
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setMeasurements([]);
    setSyncError(null);
    if (!tenant) return;
    let active = true;
    const load = () =>
      measurementsApi
        .listMeasurements(tenant)
        .then((list) => {
          if (active) setMeasurements(list);
        })
        .catch(() => {
          if (active) setSyncError(LOAD_ERROR_MESSAGE);
        });
    setLoading(true);
    load().finally(() => {
      if (active) setLoading(false);
    });
    const unsubscribe = subscribeToCompanyMeasurements(tenant, () => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [tenant]);

  const runAction = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setSyncError(null);
    try {
      return await action();
    } catch {
      setSyncError(SYNC_ERROR_MESSAGE);
      return null;
    }
  }, []);

  const createMeasurement = useCallback(
    async (input: MeasurementDetails) => {
      if (!tenant) return null;
      const created = await runAction(() => measurementsApi.createMeasurement(tenant, input));
      if (!created) return null;
      setMeasurements((prev) => [created, ...prev]);
      return created.id;
    },
    [tenant, runAction]
  );

  const updateMeasurement = useCallback(
    async (measurementId: string, input: MeasurementDetails) => {
      if (!tenant) return false;
      const result = await runAction(() => measurementsApi.updateMeasurement(tenant, measurementId, input));
      if (result === null) return false;
      setMeasurements((prev) =>
        prev.map((item) => (item.id === measurementId ? { ...item, ...input } : item))
      );
      return true;
    },
    [tenant, runAction]
  );

  const addOpening = useCallback(
    async (measurementId: string, opening: OpeningInput) => {
      if (!tenant) return false;
      const created = await runAction(() => measurementsApi.addOpening(tenant, measurementId, opening));
      if (!created) return false;
      setMeasurements((prev) =>
        prev.map((item) =>
          item.id === measurementId ? { ...item, openings: [...item.openings, created] } : item
        )
      );
      return true;
    },
    [tenant, runAction]
  );

  const updateOpening = useCallback(
    async (openingId: string, opening: OpeningInput) => {
      if (!tenant) return false;
      const result = await runAction(() => measurementsApi.updateOpening(tenant, openingId, opening));
      if (result === null) return false;
      setMeasurements((prev) =>
        prev.map((item) =>
          item.openings.some((existing) => existing.id === openingId)
            ? {
                ...item,
                openings: item.openings.map((existing) =>
                  existing.id === openingId ? { ...opening, id: openingId } : existing
                ),
              }
            : item
        )
      );
      return true;
    },
    [tenant, runAction]
  );

  const deleteOpening = useCallback(
    async (openingId: string) => {
      if (!tenant) return false;
      const result = await runAction(() => measurementsApi.deleteOpening(tenant, openingId));
      if (result === null) return false;
      setMeasurements((prev) =>
        prev.map((item) =>
          item.openings.some((existing) => existing.id === openingId)
            ? { ...item, openings: item.openings.filter((existing) => existing.id !== openingId) }
            : item
        )
      );
      return true;
    },
    [tenant, runAction]
  );

  const deleteMeasurement = useCallback(
    async (measurementId: string) => {
      if (!tenant) return false;
      const result = await runAction(() => measurementsApi.deleteMeasurement(tenant, measurementId));
      if (result === null) return false;
      setMeasurements((prev) => prev.filter((item) => item.id !== measurementId));
      return true;
    },
    [tenant, runAction]
  );

  const value = useMemo(
    () => ({
      measurements,
      loading,
      syncError,
      createMeasurement,
      updateMeasurement,
      addOpening,
      updateOpening,
      deleteOpening,
      deleteMeasurement,
    }),
    [
      measurements,
      loading,
      syncError,
      createMeasurement,
      updateMeasurement,
      addOpening,
      updateOpening,
      deleteOpening,
      deleteMeasurement,
    ]
  );

  return <MeasurementsContext.Provider value={value}>{children}</MeasurementsContext.Provider>;
}

export function useMeasurements(): MeasurementsContextValue {
  const context = useContext(MeasurementsContext);
  if (!context) {
    throw new Error('useMeasurements must be used inside MeasurementsProvider');
  }
  return context;
}

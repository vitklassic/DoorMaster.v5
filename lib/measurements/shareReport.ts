import { Platform } from 'react-native';
import type { Measurement } from './types';

type ShareReportModule = {
  shareReport: (measurement: Measurement) => Promise<void>;
  previewReport: (measurement: Measurement) => Promise<void>;
};

// Диспетчер платформенных реализаций: на web Metro резолвит сразу
// shareReport.web.ts, на native — этот файл, который подгружает нужную реализацию.
// (Файлы названы не report.web.ts/report.native.ts, чтобы не перекрывать
// платформенным резолвингом чистый модуль report.ts.)
function loadModule(): Promise<ShareReportModule> {
  return Platform.OS === 'web' ? import('./shareReport.web') : import('./shareReport.native');
}

export async function shareReport(measurement: Measurement): Promise<void> {
  return (await loadModule()).shareReport(measurement);
}

export async function previewReport(measurement: Measurement): Promise<void> {
  return (await loadModule()).previewReport(measurement);
}

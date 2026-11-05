import { getOpeningPhotoUrl } from '@/lib/backend/photoStorage';
import { buildReportHtml } from './report';
import type { Measurement } from './types';

// Фото для HTML: подписанные URL Storage; data URL (mock) проходят как есть
async function collectPhotos(measurement: Measurement): Promise<Record<string, string>> {
  const photos: Record<string, string> = {};
  await Promise.all(
    measurement.openings.map(async (opening) => {
      const path = opening.photoDataUrl;
      if (!path) return;
      if (path.startsWith('data:')) {
        photos[opening.id] = path;
        return;
      }
      try {
        const url = await getOpeningPhotoUrl(path);
        if (url) photos[opening.id] = url;
      } catch {
        // фото пропускаем, отчёт формируем без него
      }
    })
  );
  return photos;
}

export async function shareReport(measurement: Measurement): Promise<void> {
  // Окно открываем синхронно до await, чтобы браузер не заблокировал всплывающее окно
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) throw new Error('Браузер заблокировал окно отчета');
  try {
    const photos = await collectPhotos(measurement);
    reportWindow.document.open();
    reportWindow.document.write(buildReportHtml(measurement, photos));
    reportWindow.document.close();
    setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
    }, 300);
  } catch (error) {
    reportWindow.close();
    throw error;
  }
}

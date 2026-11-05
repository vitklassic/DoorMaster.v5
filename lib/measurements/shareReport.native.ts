import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getOpeningPhotoUrl } from '@/lib/backend/photoStorage';
import { buildReportHtml, getReportFileName } from './report';
import type { Measurement } from './types';

// Фото для HTML: скачиваем по signed URL во временный файл, в HTML — file:// путь;
// временные файлы удаляются после формирования PDF
async function collectPhotos(
  measurement: Measurement
): Promise<{ photos: Record<string, string>; tempFiles: string[] }> {
  const photos: Record<string, string> = {};
  const tempFiles: string[] = [];
  for (const opening of measurement.openings) {
    const path = opening.photoDataUrl;
    if (!path) continue;
    if (path.startsWith('data:')) {
      photos[opening.id] = path;
      continue;
    }
    try {
      const signedUrl = await getOpeningPhotoUrl(path);
      if (!signedUrl) continue;
      const target = `${FileSystem.cacheDirectory}report-photo-${opening.id}.jpg`;
      await FileSystem.deleteAsync(target, { idempotent: true });
      const { uri } = await FileSystem.downloadAsync(signedUrl, target);
      photos[opening.id] = uri;
      tempFiles.push(uri);
    } catch {
      // фото пропускаем, отчёт формируем без него
    }
  }
  return { photos, tempFiles };
}

export async function shareReport(measurement: Measurement): Promise<void> {
  const { photos, tempFiles } = await collectPhotos(measurement);
  try {
    const html = buildReportHtml(measurement, photos);
    const { uri } = await Print.printToFileAsync({ html });
    const target = `${FileSystem.cacheDirectory}${getReportFileName(measurement)}`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: target });
    try {
      await Sharing.shareAsync(target, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Отчёт по замеру',
      });
    } catch (error) {
      // Отмена системного меню «Поделиться» — не ошибка
      console.log('Отчёт не отправлен:', error);
    }
  } finally {
    for (const file of tempFiles) {
      await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    }
  }
}

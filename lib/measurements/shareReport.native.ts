import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getOpeningPhotoUrl } from '@/lib/backend/photoStorage';
import { buildReportHtml, getReportFileName } from './report';
import type { Measurement } from './types';

// Фото для HTML: скачиваем по signed URL во временный файл и встраиваем как data URL.
// Локальный file:// в HTML WebView при печати не загружается, поэтому нужен base64.
// Временные файлы удаляются после формирования PDF.
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
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      photos[opening.id] = `data:image/jpeg;base64,${base64}`;
      tempFiles.push(uri);
    } catch {
      // фото пропускаем, отчёт формируем без него
    }
  }
  return { photos, tempFiles };
}

async function prepareReport(measurement: Measurement): Promise<string> {
  const { photos, tempFiles } = await collectPhotos(measurement);
  try {
    const html = buildReportHtml(measurement, photos);
    // Expo Go на Android запрещает читать созданный PDF из cache/Print другим модулям.
    // Получаем содержимое PDF сразу в base64 и записываем собственный файл в корень кэша.
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    if (!base64) throw new Error('Expo Print не вернул данные PDF.');
    const target = `${FileSystem.cacheDirectory}${getReportFileName(measurement)}`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
    return target;
  } finally {
    for (const file of tempFiles) {
      await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    }
  }
}

export async function shareReport(measurement: Measurement): Promise<void> {
  const target = await prepareReport(measurement);
  // Ошибки не скрываем: MeasurementDetail покажет причину на экране.
  await Sharing.shareAsync(target, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Отчёт по замеру',
  });
}

export async function previewReport(measurement: Measurement): Promise<void> {
  const target = await prepareReport(measurement);
  // Системный предпросмотр: документ виден до печати, отправки или сохранения.
  await Print.printAsync({ uri: target });
}

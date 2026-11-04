import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildReportHtml } from './report';
import type { Measurement } from './types';
import { textOrNotSpecified } from './format';

export function getReportFileName(measurement: Measurement): string {
  const date = new Date(measurement.createdAt).toLocaleDateString('ru-RU').replace(/\./g, '-');
  const address = textOrNotSpecified(measurement.address)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `Замер ${address} ${date}.pdf`;
}

async function createNamedPdf(measurement: Measurement): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: buildReportHtml(measurement) });
  const target = `${FileSystem.cacheDirectory}${getReportFileName(measurement)}`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: target });
  return target;
}

export async function sharePdf(measurement: Measurement): Promise<void> {
  const uri = await createNamedPdf(measurement);
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: getReportFileName(measurement),
  });
}

export type SaveResult = 'saved' | 'cancelled';

export async function savePdfToFiles(measurement: Measurement): Promise<SaveResult> {
  if (Platform.OS !== 'android') {
    await sharePdf(measurement);
    return 'saved';
  }

  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) return 'cancelled';

  const uri = await createNamedPdf(measurement);
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    getReportFileName(measurement).replace(/\.pdf$/, ''),
    'application/pdf'
  );
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return 'saved';
}

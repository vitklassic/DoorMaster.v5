import * as ImagePicker from 'expo-image-picker';
import type { PhotoSource, PickedPhoto } from './photo';

export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { quality: 0.7, allowsEditing: false };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : (result.assets?.[0] ?? null);
  if (!asset) return null;

  // На native (Hermes) Blob из байтов не поддерживается — отдаём uri файла,
  // загрузка идёт напрямую с диска через expo-file-system (C17)
  return { blob: null, uri: asset.uri, previewUrl: asset.uri };
}

// На native превью — это asset.uri, освобождать нечего
export function revokePreview(_url: string | null): void {}

// Mock-режим существует только на web — на native не используется
export async function blobToDataUrl(_blob: Blob): Promise<string> {
  throw new Error('blobToDataUrl доступен только в web mock-режиме');
}

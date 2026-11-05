import { Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

// blob — сжатое jpeg-фото для загрузки в Storage (только web);
// uri — путь к файлу на устройстве (native: загрузка через expo-file-system, C17);
// previewUrl — uri для мгновенного превью (object URL на web, asset.uri на native)
export type PickedPhoto = {
  blob: Blob | null;
  uri: string | null;
  previewUrl: string;
};

type PhotoModule = {
  pickPhoto: (source: PhotoSource) => Promise<PickedPhoto | null>;
  revokePreview: (url: string | null) => void;
  // Только mock-режим (web без env): blob → data URL для хранения в localStorage
  blobToDataUrl: (blob: Blob) => Promise<string>;
};

// Диспетчер платформенных реализаций: на web Metro резолвит сразу photo.web.ts,
// на native — этот файл, который подгружает нужную реализацию.
function loadModule(): Promise<PhotoModule> {
  return Platform.OS === 'web' ? import('./photo.web') : import('./photo.native');
}

export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  return (await loadModule()).pickPhoto(source);
}

export function revokePreview(url: string | null): void {
  if (!url) return;
  void loadModule().then((module) => module.revokePreview(url));
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return (await loadModule()).blobToDataUrl(blob);
}

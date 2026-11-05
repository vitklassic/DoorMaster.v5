import { useEffect, useState } from 'react';
import type { Tenant } from '@/lib/auth/tenant';
import { supabase } from './supabaseClient';

const PHOTO_BUCKET = 'opening-photos';
const SIGNED_URL_TTL_SECONDS = 3600;

export function openingPhotoPath(tenant: Tenant, measurementId: string, openingId: string): string {
  return `${tenant.companyId}/${measurementId}/${openingId}.jpg`;
}

export async function uploadOpeningPhoto(
  tenant: Tenant,
  measurementId: string,
  openingId: string,
  blob: Blob
): Promise<string> {
  if (!supabase) throw new Error('Supabase не настроен');
  const path = openingPhotoPath(tenant, measurementId, openingId);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return path;
}

// Кэш подписанных URL в памяти: путь → { url, expiresAt }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getOpeningPhotoUrl(path: string): Promise<string | null> {
  // data URL — только mock-режим, подписывать нечего
  if (path.startsWith('data:')) return path;
  if (!supabase) return null;
  const cached = signedUrlCache.get(path);
  // Обновляем заранее, пока URL ещё жив с запасом в 5 минут
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.url;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}

// Best-effort: ошибки Storage не должны ломать UI удаления
export async function deleteOpeningPhoto(path: string | null | undefined): Promise<void> {
  if (!supabase || !path || path.startsWith('data:')) return;
  try {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    if (!error) signedUrlCache.delete(path);
  } catch {
    // игнорируем: файл мог быть уже удалён или недоступен
  }
}

export async function deleteOpeningPhotos(paths: Array<string | null | undefined>): Promise<void> {
  await Promise.all(paths.map((path) => deleteOpeningPhoto(path)));
}

// Хук отображения: путь Storage → подписанный URL (data URL проходит как есть)
export function usePhotoUrl(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith('data:')) {
      setUrl(path);
      return;
    }
    getOpeningPhotoUrl(path)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

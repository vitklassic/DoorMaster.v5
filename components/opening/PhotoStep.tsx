import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { usePhotoUrl } from '@/lib/backend/photoStorage';
import { pickPhoto, revokePreview, type PickedPhoto } from '@/lib/measurements/photo';

type Props = {
  existingPhoto: string | null; // путь Storage или data URL (mock)
  photo: PickedPhoto | null; // новое фото, ещё не сохранённое
  onChange: (photo: PickedPhoto | null) => void;
  onRemoveExisting: () => void;
};

export function PhotoStep({ existingPhoto, photo, onChange, onRemoveExisting }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const existingUrl = usePhotoUrl(existingPhoto);
  const previewUri = photo?.previewUrl ?? existingUrl;
  const hasPhoto = previewUri !== null;

  async function handlePick(source: 'camera' | 'library') {
    if (picking) return;
    setError(null);
    setPicking(true);
    try {
      const next = await pickPhoto(source);
      if (next) {
        revokePreview(photo?.previewUrl ?? null);
        onChange(next);
      }
    } catch {
      setError('Не удалось прикрепить фото. Попробуйте еще раз.');
    } finally {
      setPicking(false);
    }
  }

  function handleRemove() {
    if (photo) {
      revokePreview(photo.previewUrl);
      onChange(null);
    } else {
      onRemoveExisting();
    }
  }

  return (
    <View style={styles.wrapper}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Camera size={40} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.placeholderText}>Фото не добавлено</Text>
        </View>
      )}
      <AppButton
        label={hasPhoto ? 'Переснять фото' : 'Сделать фото'}
        variant="secondary"
        disabled={picking}
        onPress={() => handlePick('camera')}
      />
      {Platform.OS !== 'web' ? (
        <AppButton
          label="Выбрать из галереи"
          variant="secondary"
          disabled={picking}
          onPress={() => handlePick('library')}
        />
      ) : null}
      {hasPhoto ? <AppButton label="Удалить фото" variant="secondary" onPress={handleRemove} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.borderSoft,
  },
  placeholder: {
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 9,
    color: colors.error,
  },
});

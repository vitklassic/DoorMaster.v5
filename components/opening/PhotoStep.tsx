import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { pickPhoto } from '@/lib/measurements/photo';

type Props = {
  photoDataUrl: string | null;
  onChange: (dataUrl: string | null) => void;
};

export function PhotoStep({ photoDataUrl, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const canPick = Platform.OS === 'web';

  async function handlePick() {
    setError(null);
    try {
      const dataUrl = await pickPhoto();
      if (dataUrl) onChange(dataUrl);
    } catch {
      setError('Не удалось прикрепить фото. Попробуйте еще раз.');
    }
  }

  if (!canPick) {
    return (
      <View style={styles.note}>
        <Text style={styles.noteText}>Прикрепление фото пока доступно в веб-версии приложения. Этот шаг можно пропустить.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {photoDataUrl ? (
        <Image source={{ uri: photoDataUrl }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Camera size={40} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.placeholderText}>Фото не добавлено</Text>
        </View>
      )}
      <AppButton
        label={photoDataUrl ? 'Переснять фото' : 'Сделать фото'}
        variant="secondary"
        onPress={handlePick}
      />
      {photoDataUrl ? (
        <AppButton label="Удалить фото" variant="secondary" onPress={() => onChange(null)} />
      ) : null}
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
  note: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  noteText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.text,
  },
  error: {
    fontSize: 9,
    color: colors.error,
  },
});

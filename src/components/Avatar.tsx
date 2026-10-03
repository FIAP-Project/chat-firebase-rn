import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/theme';

type Props = { uri: string; name: string; size?: number; isGroup?: boolean };

/** Foto com imagem padrão (iniciais) quando ausente ou se falhar ao carregar. */
export default function Avatar({ uri, name, size = 44, isGroup = false }: Props): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.image, dimension]} onError={() => setFailed(true)} />;
  }
  const initials = isGroup ? '👥' : name.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});

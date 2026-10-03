import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/theme';

type Props = { message: string | null; tone?: 'error' | 'warning' };

export default function ErrorMessage({ message, tone = 'error' }: Props): React.JSX.Element | null {
  if (!message) return null;
  const bg = tone === 'error' ? '#fee2e2' : '#fef3c7';
  const fg = tone === 'error' ? colors.danger : '#92400e';
  return (
    <View style={[styles.box, { backgroundColor: bg }]} accessibilityRole="alert">
      <Text style={{ color: fg }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 10, borderRadius: 8, marginVertical: 8 },
});

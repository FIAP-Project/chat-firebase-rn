import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TextField from './TextField';
import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  sending: boolean;
  mentionable: PublicProfile[];
  selectedMentions: string[];
  onToggleMention: (uid: string) => void;
  onSend: (text: string) => Promise<boolean>;
};

export default function ChatInput({ sending, mentionable, selectedMentions, onToggleMention, onSend }: Props): React.JSX.Element {
  const [text, setText] = useState('');

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    const ok = await onSend(text);
    if (ok) setText(''); // mantém o texto em caso de falha para reenviar
  }, [text, sending, onSend]);

  return (
    <View style={styles.container}>
      {mentionable.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} keyboardShouldPersistTaps="handled">
          <Text style={styles.chipLabel}>Mencionar:</Text>
          {mentionable.map((m) => {
            const selected = selectedMentions.includes(m.uid);
            return (
              <Pressable key={m.uid} onPress={() => onToggleMention(m.uid)} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && { color: '#fff' }]}>@{m.name.split(' ')[0]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.inputRow}>
        <TextField
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem"
          multiline
          maxLength={2000}
        />
        <Pressable onPress={handleSend} disabled={sending || !text.trim()} style={[styles.send, (sending || !text.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>{sending ? '...' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: 8 },
  chips: { flexGrow: 0, marginBottom: 6 },
  chipLabel: { alignSelf: 'center', color: colors.muted, marginRight: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, marginRight: 6 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, maxHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.bg },
  send: { marginLeft: 8, backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: '#fff', fontWeight: '600' },
});

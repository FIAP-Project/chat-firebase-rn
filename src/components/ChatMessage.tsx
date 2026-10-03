import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage as ChatMessageType } from '../types/chat';
import { colors } from '../utils/theme';

type Props = {
  message: ChatMessageType;
  mine: boolean;
  authorName: string;
  showAuthor: boolean;
  targetName: string | null;
};

function ChatMessage({ message, mine, authorName, showAuthor, targetName }: Props): React.JSX.Element {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {showAuthor && !mine ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? <Text style={styles.target}>→ para {targetName}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

export default React.memo(ChatMessage);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 10, paddingVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.bubbleMine },
  bubbleOther: { backgroundColor: colors.bubbleOther },
  author: { fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  target: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  text: { fontSize: 16, color: colors.text },
  time: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end', marginTop: 4 },
});

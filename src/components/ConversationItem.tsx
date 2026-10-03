import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import type { ConversationListItem } from '../types/chat';
import { colors } from '../utils/theme';

type Props = { item: ConversationListItem; onPress: (item: ConversationListItem) => void };

function ConversationItem({ item, onPress }: Props): React.JSX.Element {
  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      <Avatar uri={item.photoUrl} name={item.title} isGroup={item.type === 'group'} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={[styles.badge, item.type === 'group' ? styles.badgeGroup : styles.badgeDirect]}>
        <Text style={styles.badgeText}>{item.type === 'group' ? 'GRUPO' : 'INDIVIDUAL'}</Text>
      </View>
    </Pressable>
  );
}

export default React.memo(ConversationItem);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  info: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGroup: { backgroundColor: '#ede9fe' },
  badgeDirect: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.text },
});

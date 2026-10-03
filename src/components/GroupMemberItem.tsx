import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  member: PublicProfile;
  isOwner: boolean;
  isMe: boolean;
  onPress: (uid: string) => void;
  onRemove?: (uid: string) => void;
};

function GroupMemberItem({ member, isOwner, isMe, onPress, onRemove }: Props): React.JSX.Element {
  return (
    <Pressable style={styles.row} onPress={() => onPress(member.uid)}>
      <Avatar uri={member.photoUrl} name={member.name} size={40} />
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}{isMe ? ' (você)' : ''}</Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {onRemove && !isOwner ? (
        <Pressable onPress={() => onRemove(member.uid)} hitSlop={10}>
          <Text style={styles.remove}>Remover</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default React.memo(GroupMemberItem);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, color: colors.text },
  owner: { color: colors.primary, fontSize: 12, marginTop: 2 },
  remove: { color: colors.danger, fontWeight: '600' },
});

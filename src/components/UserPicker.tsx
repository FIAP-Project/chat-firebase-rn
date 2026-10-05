import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TextField from './TextField';
import Avatar from './Avatar';
import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  users: PublicProfile[];
  excludeIds: string[];
  selectedIds?: string[];
  onPressUser: (uid: string) => void;
  emptyText?: string;
  /** Use true quando o picker estiver dentro de um ScrollView (evita FlatList aninhada). */
  embedded?: boolean;
};

/** Lista pesquisável de usuários. O próprio usuário (e IDs excluídos) nunca aparecem. */
export default function UserPicker({
  users,
  excludeIds,
  selectedIds = [],
  onPressUser,
  emptyText = 'Nenhum usuário disponível.',
  embedded = false,
}: Props): React.JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => !excludeIds.includes(u.uid))
      .filter((u) => (term ? u.name.toLowerCase().includes(term) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, excludeIds, search]);

  const renderRow = (item: PublicProfile): React.JSX.Element => {
    const selected = selectedIds.includes(item.uid);
    return (
      <Pressable key={item.uid} style={[styles.row, selected && styles.rowSelected]} onPress={() => onPressUser(item.uid)}>
        <Avatar uri={item.photoUrl} name={item.name} size={38} />
        <Text style={styles.name}>{item.name}</Text>
        {selected ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>
    );
  };

  const emptyMessage = <Text style={styles.empty}>{search ? 'Nenhum resultado para a busca.' : emptyText}</Text>;

  return (
    <View style={styles.container}>
      <TextField style={styles.search} placeholder="Buscar usuário" value={search} onChangeText={setSearch} autoCapitalize="none" />
      {embedded ? (
        // Dentro de um ScrollView: lista simples com rolagem interna (sem FlatList aninhada).
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? emptyMessage : filtered.map(renderRow)}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={emptyMessage}
          renderItem={({ item }) => renderRow(item)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowSelected: { backgroundColor: '#eff6ff' },
  name: { flex: 1, marginLeft: 12, fontSize: 16, color: colors.text },
  check: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
});
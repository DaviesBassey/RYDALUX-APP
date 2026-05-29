import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, right, onPress }: Props) {
  const Content = (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.item}>
        {Content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.item}>{Content}</View>;
}

const styles = StyleSheet.create({
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1, paddingRight: 12 },
  title: { color: colors.gray900, fontSize: 15, fontWeight: '800' },
  subtitle: { color: colors.gray500, fontSize: 13, marginTop: 3, lineHeight: 18 },
  right: { color: colors.gray500, fontSize: 13, fontWeight: '800' },
});

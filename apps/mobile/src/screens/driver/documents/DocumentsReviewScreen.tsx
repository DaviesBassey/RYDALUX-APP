import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors } from '../../../constants/colors';

const DOCUMENTS = [
  { id: '1', type: 'Driver License', status: 'VERIFIED', uploadedAt: '2025-05-20' },
  { id: '2', type: 'Insurance', status: 'PENDING', uploadedAt: '2025-05-20' },
  { id: '3', type: 'Registration', status: 'REJECTED', uploadedAt: '2025-05-15' },
];

type Props = {
  navigation: any;
};

export default function DocumentsReviewScreen({ navigation }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'REJECTED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderDocument = ({ item }: any) => (
    <View style={styles.documentItem}>
      <View style={styles.documentHeader}>
        <Text style={styles.documentType}>{item.type}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.uploadedAt}>Uploaded: {item.uploadedAt}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Review</Text>
      <FlatList
        data={DOCUMENTS}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  listContent: {
    gap: 12,
  },
  documentItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadedAt: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

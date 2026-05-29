import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

const REQUIRED_DOCUMENTS = [
  { id: 'license', name: 'Driver License', icon: '📋', status: 'pending' },
  { id: 'insurance', name: 'Vehicle Insurance', icon: '🛡️', status: 'pending' },
  { id: 'registration', name: 'Vehicle Registration', icon: '📄', status: 'pending' },
  { id: 'roadworthiness', name: 'Roadworthiness Certificate', icon: '✅', status: 'pending' },
];

type Props = {
  navigation: any;
};

export default function DocumentsUploadScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState(REQUIRED_DOCUMENTS);

  const handleUploadDocument = (documentId: string) => {
    navigation.navigate('DocumentsUploadDetail', { documentId });
  };

  const renderDocument = ({ item }: any) => (
    <View style={styles.documentCard}>
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{item.name}</Text>
        <Text style={styles.documentStatus}>{item.status}</Text>
      </View>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => handleUploadDocument(item.id)}>
        <Text style={styles.uploadButtonText}>Upload</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Documents</Text>
      <Text style={styles.subtitle}>Complete your profile by uploading required documents</Text>
      <FlatList
        data={documents}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  listContent: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  documentStatus: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 4,
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
});

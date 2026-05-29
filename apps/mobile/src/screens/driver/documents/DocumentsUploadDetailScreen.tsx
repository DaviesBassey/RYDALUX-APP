import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
  route: any;
};

export default function DocumentsUploadDetailScreen({ navigation, route }: Props) {
  const { documentId } = route.params;
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFile = () => {
    Alert.alert('Select File', 'File picker placeholder', [
      { text: 'Cancel', onPress: () => {} },
      { text: 'Camera', onPress: () => {} },
      { text: 'Gallery', onPress: () => {} },
    ]);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      setIsUploading(false);
      Alert.alert('Success', 'Document uploaded successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 2000);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Upload Document</Text>

      {/* Document Type Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Document Type</Text>
        <Text style={styles.documentType}>{documentId === 'license' ? 'Driver License' : 'Vehicle Document'}</Text>
        <Text style={styles.requirements}>
          Requirements:
          {'\n'}• Clear, readable image{'\n'}• All text visible{'\n'}• JPG or PNG format{'\n'}• Max 5MB
        </Text>
      </View>

      {/* Upload Area */}
      <View style={styles.uploadArea}>
        <Text style={styles.uploadIcon}>📷</Text>
        <Text style={styles.uploadText}>No file selected</Text>
        <TouchableOpacity style={styles.selectButton} onPress={handleSelectFile}>
          <Text style={styles.selectButtonText}>Select File</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>Tips for Best Results</Text>
        <Text style={styles.instructionItem}>✓ Use good lighting</Text>
        <Text style={styles.instructionItem}>✓ Keep document flat and straight</Text>
        <Text style={styles.instructionItem}>✓ Avoid shadows or glare</Text>
        <Text style={styles.instructionItem}>✓ Include all four corners</Text>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={isUploading}>
        <Text style={styles.uploadButtonText}>
          {isUploading ? '⏳ Uploading...' : '📤 Upload Document'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  requirements: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  uploadArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  selectButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  selectButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  instructionsCard: {
    backgroundColor: colors.info + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 32,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

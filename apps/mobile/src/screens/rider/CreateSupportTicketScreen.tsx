import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, Input, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'CreateTicket'>;
const TYPES = ['Trip issue', 'Payment', 'Safety', 'Account'];

export default function CreateSupportTicketScreen({ route, navigation }: Props) {
  const [type, setType] = useState(TYPES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleError = title && title.trim().length < 4 ? 'Use a clearer title.' : '';
  const descriptionError = description && description.trim().length < 12 ? 'Add a few more details.' : '';
  const canSubmit = title.trim().length >= 4 && description.trim().length >= 12;

  return (
    <Screen>
      <SectionHeader title="Create support ticket" />
      <Card>
        <Text style={styles.label}>Ticket type</Text>
        <View style={styles.types}>
          {TYPES.map((item) => (
            <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.type, type === item && styles.typeActive]}>
              <Text style={[styles.typeText, type === item && styles.typeTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="What happened?" error={titleError} />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Add enough detail for support to help."
          multiline
          style={styles.description}
          error={descriptionError}
        />
        <Text style={styles.linked}>Linked trip: {route.params?.tripId ?? 'None selected'}</Text>
        <Button
          title="Submit ticket"
          disabled={!canSubmit}
          onPress={() => {
            Alert.alert('Ticket submitted', 'Support ticket submission is mocked for Section 21 UI.');
            navigation.navigate('SupportTickets');
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.gray700, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  type: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  typeActive: { backgroundColor: colors.darkNavy, borderColor: colors.darkNavy },
  typeText: { color: colors.gray700, fontSize: 12, fontWeight: '800' },
  typeTextActive: { color: colors.white },
  description: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  linked: { color: colors.gray500, fontSize: 13, marginBottom: 14, fontWeight: '700' },
});

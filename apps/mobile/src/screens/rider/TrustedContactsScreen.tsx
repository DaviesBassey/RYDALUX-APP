import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Card, Input, ListItem, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';
import { MOCK_CONTACTS } from '../../mock/rider';

export default function TrustedContactsScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <Screen>
      <SectionHeader title="Trusted contacts" />
      <Card>
        {MOCK_CONTACTS.map((contact) => (
          <ListItem
            key={contact.id}
            title={contact.name}
            subtitle={contact.phone}
            right="Remove"
            onPress={() => Alert.alert('Remove contact', 'Removal is a placeholder until safety contacts API is connected.')}
          />
        ))}
      </Card>
      <SectionHeader title="Add contact" />
      <Card>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Contact name" />
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+234..." keyboardType="phone-pad" />
        <Button title="Add trusted contact" onPress={() => Alert.alert('Contact saved', 'This is a placeholder action.')} disabled={!name.trim() || !phone.trim()} />
      </Card>
      <Text style={{ color: colors.gray500, lineHeight: 19, fontSize: 13 }}>
        Trusted contacts can receive trip information when you choose to share a ride or trigger safety support.
      </Text>
    </Screen>
  );
}

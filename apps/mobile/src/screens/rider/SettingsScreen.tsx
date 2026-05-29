import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, ListItem, Screen, SectionHeader } from '../../components/rider';

export default function SettingsScreen() {
  const { logout } = useAuth();
  return (
    <Screen>
      <SectionHeader title="Settings" />
      <Card>
        <ListItem title="Notifications" subtitle="Ride updates, driver arrival, safety alerts" right="On" />
        <ListItem title="Privacy settings" subtitle="Location sharing and trusted contact controls" right="Review" />
        <ListItem title="App version" subtitle="Section 21 rider foundation" right="0.0.1" />
      </Card>
      <Button
        title="Log out"
        variant="danger"
        onPress={() => Alert.alert('Log out', 'End this rider session?', [{ text: 'Cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])}
      />
    </Screen>
  );
}

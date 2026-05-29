import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Avatar, Button, Card, ListItem, Screen, SectionHeader } from '../../components/rider';
import { formatPhone } from '../../utils/formatting';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const name = `${user?.firstName ?? 'Rider'} ${user?.lastName ?? ''}`.trim();
  return (
    <Screen>
      <SectionHeader title="Profile" />
      <Card>
        <Avatar name={name} size={64} />
        <ListItem title={name} subtitle={user?.email || 'Email not added'} />
        <ListItem title="Phone" subtitle={formatPhone(user?.phone)} />
        <ListItem title="Edit profile" subtitle="Profile editing placeholder" right="Soon" />
      </Card>
      <Button title="Payment methods" variant="secondary" onPress={() => navigation.navigate('PaymentMethods')} />
      <Button title="Settings" variant="secondary" onPress={() => navigation.navigate('Settings')} style={{ marginTop: 10 }} />
      <Button
        title="Log out"
        variant="danger"
        onPress={() => Alert.alert('Log out', 'End this rider session?', [{ text: 'Cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])}
        style={{ marginTop: 18 }}
      />
    </Screen>
  );
}

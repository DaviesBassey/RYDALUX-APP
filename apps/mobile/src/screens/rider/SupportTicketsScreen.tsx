import React, { useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, EmptyState, ListItem, Screen, SectionHeader, StatusBadge } from '../../components/rider';
import { MOCK_SUPPORT_TICKETS } from '../../mock/rider';
import { formatDate } from '../../utils/formatting';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'SupportTickets'>;

export default function SupportTicketsScreen({ navigation }: Props) {
  const [showTickets, setShowTickets] = useState(true);
  return (
    <Screen>
      <SectionHeader title="Support tickets" />
      <Button title="Create ticket" onPress={() => navigation.navigate('CreateTicket', {})} />
      <Button title={showTickets ? 'Show empty state' : 'Show tickets'} variant="secondary" onPress={() => setShowTickets((value) => !value)} style={{ marginTop: 10 }} />
      {showTickets ? (
        <Card style={{ marginTop: 14 }}>
          {MOCK_SUPPORT_TICKETS.map((ticket) => (
            <View key={ticket.id}>
              <StatusBadge label={ticket.status} tone={ticket.status === 'RESOLVED' ? 'success' : 'warning'} />
              <ListItem title={ticket.title} subtitle={formatDate(ticket.date)} right={ticket.id.replace('ticket_', '#')} />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState title="No support tickets" message="Create a ticket when you need help with a trip, fare, payment, or safety concern." />
      )}
    </Screen>
  );
}

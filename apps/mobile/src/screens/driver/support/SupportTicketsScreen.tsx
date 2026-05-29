import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

const TICKETS = [
  { id: '1', title: 'Issue with payout', status: 'OPEN', priority: 'HIGH', date: '2025-05-28' },
  { id: '2', title: 'Document upload failed', status: 'IN_PROGRESS', priority: 'MEDIUM', date: '2025-05-25' },
  { id: '3', title: 'Payment dispute', status: 'RESOLVED', priority: 'HIGH', date: '2025-05-20' },
];

type Props = {
  navigation: any;
};

export default function SupportTicketsScreen({ navigation }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return colors.error;
      case 'IN_PROGRESS':
        return colors.warning;
      case 'RESOLVED':
        return colors.success;
      default:
        return colors.info;
    }
  };

  const renderTicket = ({ item }: any) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>{item.title}</Text>
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
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>{item.date}</Text>
        <Text style={[styles.priorityBadge, { color: item.priority === 'HIGH' ? colors.error : colors.warning }]}>
          {item.priority}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Support Tickets</Text>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateSupportTicket')}>
        <Text style={styles.createButtonText}>+ Create Ticket</Text>
      </TouchableOpacity>

      <FlatList
        data={TICKETS}
        renderItem={renderTicket}
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
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  createButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});

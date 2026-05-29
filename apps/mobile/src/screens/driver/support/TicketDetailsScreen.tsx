import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
  route: any;
};

export default function TicketDetailsScreen({ navigation, route }: Props) {
  const { ticketId } = route.params;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Support Ticket #{ticketId}</Text>

      {/* Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.statusText, { color: colors.warning }]}>IN_PROGRESS</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Priority</Text>
          <Text style={styles.priorityText}>HIGH</Text>
        </View>
      </View>

      {/* Ticket Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Ticket Details</Text>
        <Text style={styles.title2}>Issue with payout</Text>
        <Text style={styles.description}>
          I requested a payout on May 28, but it hasn't been processed yet. My account shows the funds are available. Please help me resolve this issue.
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.label}>Timeline</Text>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTime}>2025-05-28 10:30 AM</Text>
          <Text style={styles.timelineEvent}>Ticket Created</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTime}>2025-05-28 3:45 PM</Text>
          <Text style={styles.timelineEvent}>Support Team Assigned</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTime}>2025-05-29 9:00 AM</Text>
          <Text style={styles.timelineEvent}>Team Investigating</Text>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.card}>
        <Text style={styles.label}>Messages</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageSender}>Support Team</Text>
          <Text style={styles.messageTime}>2025-05-28 3:45 PM</Text>
          <Text style={styles.messageText}>
            Thank you for reporting this issue. We're investigating your payout request. We'll update you soon.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.replyButton}>
        <Text style={styles.replyButtonText}>💬 Reply to Ticket</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Close Ticket</Text>
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
  title2: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  description: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  timelineItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  timelineEvent: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  messageCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  replyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  replyButtonText: {
    color: colors.surface,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: colors.border,
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
});

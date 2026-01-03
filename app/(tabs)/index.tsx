import LedgerSwitcher from '@/components/LedgerSwitcher';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/transactionStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const {
    transactions,
    deleteTransaction,
    subscribeToTransactions,
    ledgers,
    activeLedgerId,
    subscribeToLedgers,
    fetchLedgers
  } = useTransactionStore();

  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);

  // Initial fetch and subscriptions
  useEffect(() => {
    fetchLedgers();
    const unsubscribeLedgers = subscribeToLedgers();
    return () => {
      unsubscribeLedgers();
    };
  }, []);

  // Update transaction subscription when active ledger changes
  useEffect(() => {
    if (activeLedgerId) {
      const unsubscribe = subscribeToTransactions();
      return () => unsubscribe();
    }
  }, [activeLedgerId]);

  const activeLedger = ledgers.find(l => l.id === activeLedgerId);

  // Calculate Totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  const renderLeftActions = (id: string) => {
    return (
      <Pressable
        style={[styles.deleteAction, { backgroundColor: theme.danger }]}
        onPress={() => deleteTransaction(id)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(item.id)}
      friction={2}
      leftThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <Link href={`/modal?id=${item.id}`} asChild>
        <Pressable>
          <View style={[styles.transactionItem, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 0 }]}>
            <View style={styles.transactionLeft}>
              <View style={[styles.categoryIcon, { backgroundColor: item.type === 'expense' ? theme.danger + '10' : theme.success + '10' }]}>
                <Ionicons
                  name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={item.type === 'expense' ? theme.danger : theme.success}
                />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={[styles.transactionTitle, { color: theme.text }]}>{item.title}</Text>
                  {item.isSyncing && (
                    <Ionicons name="cloud-upload" size={14} color={theme.icon} style={styles.syncIcon} />
                  )}
                </View>
                <Text style={styles.transactionDate}>{item.category} • {item.date}</Text>
              </View>
            </View>
            <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? theme.text : theme.success }]}>
              {item.type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)}
            </Text>
          </View>
        </Pressable>
      </Link>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <LedgerSwitcher
        visible={ledgerModalVisible}
        onClose={() => setLedgerModalVisible(false)}
      />

      <View style={styles.fixedHeader}>
        {/* Ledger Selector Header */}
        <View style={styles.topHeader}>
          <Pressable
            style={styles.ledgerSelector}
            onPress={() => setLedgerModalVisible(true)}
          >
            <View style={[styles.ledgerBadge, { backgroundColor: (activeLedger?.color || theme.primary) + '20' }]}>
              <Ionicons name="book" size={16} color={activeLedger?.color || theme.primary} />
            </View>
            <Text style={[styles.ledgerName, { color: theme.text }]}>
              {activeLedger?.name || 'Loading...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.icon} />
          </Pressable>
          <Pressable style={[styles.profileButton, { backgroundColor: theme.card }]}>
            <Ionicons name="person" size={24} color={theme.primary} />
          </Pressable>
        </View>

        {/* Total Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
          <View style={styles.balanceFooter}>
            <Text style={styles.balanceDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            {transactions.some(t => t.isSyncing) && (
              <View style={styles.syncingBadge}>
                <Ionicons name="sync" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.syncingText}>Syncing...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="arrow-down" size={20} color={theme.success} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.text }]}>Income</Text>
              <Text style={[styles.statAmount, { color: theme.success }]}>${totalIncome.toFixed(2)}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.danger + '20' }]}>
              <Ionicons name="arrow-up" size={20} color={theme.danger} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.text }]}>Expense</Text>
              <Text style={[styles.statAmount, { color: theme.danger }]}>${totalExpense.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
      </View>

      {/* Scrollable Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={theme.icon} />
            <Text style={[styles.emptyStateText, { color: theme.icon }]}>
              No transactions in this book yet.
            </Text>
          </View>
        }
      />

      <Link href="/modal" asChild>
        <Pressable style={styles.fabContainer}>
          <View style={[styles.fabShadow, { shadowColor: theme.primary }]}>
            <LinearGradient
              colors={[theme.primary, '#818CF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Ionicons name="add" size={32} color="#fff" />
            </LinearGradient>
          </View>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ledgerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ledgerBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ledgerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  syncingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginLeft: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  syncIcon: {
    opacity: 0.5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  fabShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 35,
  },
  fab: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
});

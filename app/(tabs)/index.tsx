import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTransactionStore } from '@/store/transactionStore';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const transactions = useTransactionStore((state) => state.transactions);
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions);

  // Fetch transactions when component mounts
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Calculate Totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Total Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
        <Text style={styles.balanceDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
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
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.transactionItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.transactionLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: item.type === 'expense' ? theme.danger + '10' : theme.success + '10' }]}>
          <Ionicons
            name={item.category === 'Food' ? 'fast-food' : item.category === 'Transport' ? 'car' : item.category === 'Housing' ? 'home' : 'cash'}
            size={20}
            color={item.type === 'expense' ? theme.danger : theme.success}
          />
        </View>
        <View>
          <Text style={[styles.transactionTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>
      <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? theme.text : theme.success }]}>
        {item.type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
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
  headerContainer: {
    marginBottom: 20,
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
  balanceDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
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
    marginBottom: 12,
    borderWidth: 1,
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
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9BA1A6',
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
    borderRadius: 35, // Match closest to FAB radius for shadow
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
});

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTransactionStore } from '@/store/transactionStore';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const transactions = useTransactionStore((state) => state.transactions);

  // Aggregate expenses by category
  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>

        {/* Placeholder Chart Area */}
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart" size={64} color={theme.primary} />
            <Text style={[styles.placeholderText, { color: theme.icon }]}>Spending Trends</Text>
            <Text style={{ color: theme.text, marginTop: 8 }}>Total Expense: ${totalExpense.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending by Category</Text>

        {sortedCategories.length === 0 ? (
          <Text style={{ color: theme.text, opacity: 0.5 }}>No expenses yet.</Text>
        ) : (
          sortedCategories.map((cat) => (
            <View key={cat.name} style={[styles.categoryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                <Text style={[styles.categoryAmount, { color: theme.text }]}>${cat.amount.toFixed(2)}</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${cat.percentage}%` }]} />
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  chartCard: {
    height: 200,
    borderRadius: 20,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

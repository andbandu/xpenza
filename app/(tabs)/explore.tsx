import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useTransactionStore } from '@/store/transactionStore';
import { generateCSV, generatePDF } from '@/utils/exportUtils';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const {
    transactions,
    activeLedgerId,
    ledgers,
    fetchLedgers,
    subscribeToLedgers,
    subscribeToTransactions
  } = useTransactionStore();

  const { currency } = useSettingsStore();

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  useEffect(() => {
    fetchLedgers();
    const unsubscribeLedgers = subscribeToLedgers();
    return () => unsubscribeLedgers();
  }, []);

  useEffect(() => {
    if (activeLedgerId) {
      const unsubscribeTx = subscribeToTransactions();
      return () => unsubscribeTx();
    }
  }, [activeLedgerId]);

  const activeLedger = ledgers.find(l => l.id === activeLedgerId);

  const handleExportPDF = async () => {
    if (!activeLedger) return;
    setIsExportingPDF(true);
    try {
      await generatePDF(activeLedger, transactions, currency.symbol);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeLedger) return;
    setIsExportingCSV(true);
    try {
      await generateCSV(activeLedger, transactions, currency.symbol);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate CSV report.');
    } finally {
      setIsExportingCSV(false);
    }
  };

  // --- PIE CHART DATA (Expense by Category) ---
  const expenseCategoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalExpense = Object.values(expenseCategoryTotals).reduce((sum, val) => sum + val, 0);

  // --- PIE CHART DATA (Income by Category) ---
  const incomeCategoryTotals = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalIncome = Object.values(incomeCategoryTotals).reduce((sum, val) => sum + val, 0);

  const chartColors = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E'
  ];

  const expensePieData = Object.entries(expenseCategoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount], index) => ({
      value: amount,
      color: chartColors[index % chartColors.length],
      label: name,
      text: `${((amount / totalExpense) * 100).toFixed(0)}%`
    }));

  const incomePieData = Object.entries(incomeCategoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount], index) => ({
      value: amount,
      color: chartColors[index % chartColors.length],
      label: name,
      text: `${((amount / totalIncome) * 100).toFixed(0)}%`
    }));

  // --- BAR CHART DATA (Income vs Expense) ---
  const barData = [
    { value: totalIncome, label: 'Income', frontColor: theme.success, spacing: 15 },
    { value: totalExpense, label: 'Expense', frontColor: theme.danger },
  ];

  const sortedExpenseCategories = Object.entries(expenseCategoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

  const sortedIncomeCategories = Object.entries(incomeCategoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    }));

  const renderLegend = (data: any[]) => {
    return (
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              {activeLedger?.name || 'Loading...'}
            </Text>
          </View>
          <View style={[styles.bookIcon, { backgroundColor: (activeLedger?.color || theme.primary) + '20' }]}>
            <Ionicons name="stats-chart" size={24} color={activeLedger?.color || theme.primary} />
          </View>
        </View>

        {/* Bar Chart Section */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Income vs Expense</Text>
          <View style={styles.chartWrapper}>
            <BarChart
              data={barData}
              barWidth={45}
              noOfSections={3}
              barBorderRadius={8}
              frontColor="lightgray"
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              yAxisTextStyle={{ color: theme.icon, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.text, fontSize: 12, fontWeight: '600' }}
              isAnimated
            />
          </View>
        </View>

        {/* Expense Pie Chart Section */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Expense Breakdown</Text>
          {expensePieData.length > 0 ? (
            <View style={styles.pieWrapper}>
              <PieChart
                donut
                sectionAutoFocus
                radius={SCREEN_WIDTH * 0.22}
                innerRadius={SCREEN_WIDTH * 0.12}
                data={expensePieData}
                centerLabelComponent={() => {
                  return (
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: theme.icon }}>Total</Text>
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: 'bold' }}>
                        {currency.symbol} {totalExpense > 1000 ? (totalExpense / 1000).toFixed(1) + 'k' : totalExpense.toLocaleString()}
                      </Text>
                    </View>
                  );
                }}
              />
              {renderLegend(expensePieData)}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={theme.icon} />
              <Text style={{ color: theme.icon, marginTop: 8 }}>No expenses to display</Text>
            </View>
          )}
        </View>

        {/* Income Pie Chart Section */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Income Sources</Text>
          {incomePieData.length > 0 ? (
            <View style={styles.pieWrapper}>
              <PieChart
                donut
                sectionAutoFocus
                radius={SCREEN_WIDTH * 0.22}
                innerRadius={SCREEN_WIDTH * 0.12}
                data={incomePieData}
                centerLabelComponent={() => {
                  return (
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: theme.icon }}>Total</Text>
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: 'bold' }}>
                        {currency.symbol} {totalIncome > 1000 ? (totalIncome / 1000).toFixed(1) + 'k' : totalIncome.toLocaleString()}
                      </Text>
                    </View>
                  );
                }}
              />
              {renderLegend(incomePieData)}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={theme.icon} />
              <Text style={{ color: theme.icon, marginTop: 8 }}>No income to display</Text>
            </View>
          )}
        </View>

        {/* ---------------- DETAILS SECTIONS ---------------- */}

        {/* Expense Details */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending Details</Text>
        {sortedExpenseCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={theme.icon} />
            <Text style={{ color: theme.text, opacity: 0.5, marginTop: 12 }}>No expenses found.</Text>
          </View>
        ) : (
          sortedExpenseCategories.map((cat) => (
            <View key={cat.name} style={[styles.categoryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                <Text style={[styles.categoryAmount, { color: theme.text }]}>{currency.symbol} {cat.amount.toLocaleString()}</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: theme.danger, width: `${cat.percentage}%` }]} />
              </View>
            </View>
          ))
        )}

        {/* Income Details */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>Income Details</Text>
        {sortedIncomeCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={theme.icon} />
            <Text style={{ color: theme.text, opacity: 0.5, marginTop: 12 }}>No income found.</Text>
          </View>
        ) : (
          sortedIncomeCategories.map((cat) => (
            <View key={cat.name} style={[styles.categoryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                <Text style={[styles.categoryAmount, { color: theme.success }]}>{currency.symbol} {cat.amount.toLocaleString()}</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: theme.success, width: `${cat.percentage}%` }]} />
              </View>
            </View>
          ))
        )}

        {/* Export Reports Section */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>Export & Reports</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.exportDescription, { color: theme.icon }]}>
            Generate professional reports for your {activeLedger?.name || 'ledger'} to share with partners or accountants.
          </Text>
          <View style={styles.exportActions}>
            <Pressable
              style={[styles.exportButton, { backgroundColor: theme.primary }]}
              onPress={handleExportPDF}
              disabled={isExportingPDF}
            >
              {isExportingPDF ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#FFF" />
                  <Text style={styles.exportButtonText}>Export PDF</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.exportButton, { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1 }]}
              onPress={handleExportCSV}
              disabled={isExportingCSV}
            >
              {isExportingCSV ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={20} color={theme.primary} />
                  <Text style={[styles.exportButtonText, { color: theme.primary }]}>Export CSV</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bookIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
  },
  pieWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
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
  exportDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.8,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

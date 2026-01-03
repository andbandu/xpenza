import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/transactionStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';


export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id?: string }>();

  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);
  const addCategory = useTransactionStore((state) => state.addCategory);
  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (id && !isInitialized) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setNote(transaction.note || '');

        // Find matching category
        const matchingCategory = categories.find(c => c.name === transaction.category);
        if (matchingCategory) {
          setCategory(matchingCategory.id);
        }
        setIsInitialized(true);
      }
    }
  }, [id, transactions, categories, isInitialized]);

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(cat =>
    cat.type === type || cat.type === 'both' || !cat.type
  );

  // Auto-select first category for NEW transactions only
  useEffect(() => {
    if (!id && filteredCategories.length > 0 && !category) {
      setCategory(filteredCategories[0].id);
    }
    // Also reset if type changes for NEW transactions
    if (!id && category && !filteredCategories.find(c => c.id === category)) {
      setCategory(filteredCategories[0]?.id || '');
    }
  }, [type, filteredCategories.length, id]);

  const handleSave = async () => {
    if (!amount) return;

    const selectedCategory = categories.find(c => c.id === category);
    const transactionData = {
      title: note || selectedCategory?.name || 'Untitled',
      amount: parseFloat(amount),
      category: selectedCategory?.name || 'Other',
      type,
      note
    };

    try {
      if (id) {
        // Update existing transaction
        await updateTransaction(id, transactionData);
        console.log('Transaction updated successfully');
      } else {
        // Create new transaction
        await addTransaction(transactionData);
        console.log('Transaction created successfully');
      }

      router.back();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTransaction(id);
      router.back();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addCategory(newCategoryName, 'grid');
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: id ? 'Edit Transaction' : 'Add Transaction' }} />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />

      {/* Type Selector */}
      <View style={[styles.typeSelector, { backgroundColor: theme.card }]}>
        <Pressable
          style={[
            styles.typeButton,
            type === 'expense' && { backgroundColor: theme.danger }
          ]}
          onPress={() => setType('expense')}
        >
          <Text style={[
            styles.typeText,
            type === 'expense' ? { color: '#fff' } : { color: theme.text }
          ]}>Expense</Text>
        </Pressable>
        <Pressable
          style={[
            styles.typeButton,
            type === 'income' && { backgroundColor: theme.success }
          ]}
          onPress={() => setType('income')}
        >
          <Text style={[
            styles.typeText,
            type === 'income' ? { color: '#fff' } : { color: theme.text }
          ]}>Income</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
          <View style={[styles.amountContainer, { borderColor: theme.primary }]}>
            <Text style={[styles.currencySymbol, { color: theme.primary }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.primary }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={theme.icon}
              autoFocus
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  category === cat.id && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={category === cat.id ? theme.primary : theme.icon}
                />
                <Text style={[
                  styles.categoryText,
                  { color: theme.text },
                  category === cat.id && { color: theme.primary, fontWeight: 'bold' }
                ]}>{cat.name}</Text>
              </Pressable>
            ))}

            {/* Add Category Button */}
            <Pressable
              style={[
                styles.categoryItem,
                { backgroundColor: theme.card, borderColor: theme.border, borderStyle: 'dashed' },
              ]}
              onPress={() => setIsAddingCategory(true)}
            >
              <Ionicons name="add" size={24} color={theme.text} />
              <Text style={[styles.categoryText, { color: theme.text }]}>Add New</Text>
            </Pressable>
          </View>
        </View>

        {/* Add Category Input (Conditional) */}
        {isAddingCategory && (
          <View style={[styles.inputGroup, styles.newCategoryContainer, { backgroundColor: theme.card }]}>
            <TextInput
              style={[styles.input, { flex: 1, borderBottomWidth: 0, marginBottom: 0 }]} // Override styles
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category Name"
              placeholderTextColor={theme.icon}
              autoFocus
            />
            <Pressable onPress={handleAddCategory} style={{ padding: 10 }}>
              <Ionicons name="checkmark-circle" size={32} color={theme.success} />
            </Pressable>
            <Pressable onPress={() => setIsAddingCategory(false)} style={{ padding: 10 }}>
              <Ionicons name="close-circle" size={32} color={theme.danger} />
            </Pressable>
          </View>
        )}

        {/* Note Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Note</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor={theme.icon}
          />
        </View>

      </ScrollView>

      {/* Save & Delete Buttons */}
      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <View style={styles.footerButtons}>
          {id && (
            <Pressable
              style={[styles.deleteButton, { backgroundColor: theme.danger + '10', borderColor: theme.danger }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color={theme.danger} />
            </Pressable>
          )}
          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.primary, flex: 1 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Transaction</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: 'bold',
    minWidth: 100,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '25%', // roughly 3 columns
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    padding: 8,
  },
  categoryText: {
    fontSize: 10,
    marginTop: 2,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
  },
  saveButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

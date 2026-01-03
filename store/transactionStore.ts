import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Transaction {
    id: string;
    title: string;
    amount: number;
    date: string; // ISOString or formatted date
    category: string;
    type: 'income' | 'expense';
    note?: string;
    createdAt?: string;
    isSyncing?: boolean; // New flag for local-first
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    isCustom?: boolean;
    type?: 'income' | 'expense' | 'both'; // Categories can be specific to transaction type
}

const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
    { id: 'exp-1', name: 'Food', icon: 'fast-food', type: 'expense' },
    { id: 'exp-2', name: 'Transport', icon: 'car', type: 'expense' },
    { id: 'exp-3', name: 'Housing', icon: 'home', type: 'expense' },
    { id: 'exp-4', name: 'Shopping', icon: 'cart', type: 'expense' },
    { id: 'exp-5', name: 'Entertainment', icon: 'game-controller', type: 'expense' },
    { id: 'exp-6', name: 'Health', icon: 'medkit', type: 'expense' },
    { id: 'exp-7', name: 'Education', icon: 'school', type: 'expense' },
    { id: 'exp-8', name: 'Bills & Utilities', icon: 'receipt', type: 'expense' },
];

const DEFAULT_INCOME_CATEGORIES: Category[] = [
    { id: 'inc-1', name: 'Salary', icon: 'cash', type: 'income' },
    { id: 'inc-2', name: 'Freelance', icon: 'briefcase', type: 'income' },
    { id: 'inc-3', name: 'Business', icon: 'business', type: 'income' },
    { id: 'inc-4', name: 'Investment', icon: 'trending-up', type: 'income' },
    { id: 'inc-5', name: 'Gift', icon: 'gift', type: 'income' },
    { id: 'inc-6', name: 'Refund', icon: 'return-down-back', type: 'income' },
];

const DEFAULT_CATEGORIES: Category[] = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
    { id: 'both-1', name: 'Other', icon: 'grid', type: 'both' },
];

interface TransactionState {
    transactions: Transaction[];
    categories: Category[];
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
    updateTransaction: (id: string, transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (name: string, icon: string) => Promise<void>;
    fetchTransactions: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    subscribeToTransactions: () => () => void;
}

export const useTransactionStore = create<TransactionState>()(
    persist(
        (set, get) => ({
            transactions: [],
            categories: DEFAULT_CATEGORIES,

            addTransaction: async (newTx) => {
                const tempId = Date.now().toString();
                const txData = {
                    ...newTx,
                    id: tempId,
                    date: new Date().toDateString(),
                    createdAt: new Date().toISOString(),
                    isSyncing: true
                };

                // Optimistic UI update
                set((state) => ({
                    transactions: [txData, ...state.transactions],
                }));

                // Fire and forget the Firestore sync
                const syncToFirestore = async () => {
                    try {
                        const { id, isSyncing, ...firebaseData } = txData;
                        const docRef = await addDoc(collection(db, 'transactions'), firebaseData);

                        set((state) => ({
                            transactions: state.transactions.map(t =>
                                t.id === tempId ? { ...txData, id: docRef.id, isSyncing: false } : t
                            )
                        }));
                    } catch (error) {
                        console.error("Error adding transaction to Firestore: ", error);
                        set((state) => ({
                            transactions: state.transactions.map(t =>
                                t.id === tempId ? { ...t, isSyncing: false, error: true } as any : t
                            )
                        }));
                    }
                };

                syncToFirestore();
            },

            updateTransaction: async (id, updatedTx) => {
                const originalTx = get().transactions.find(t => t.id === id);
                if (!originalTx) return;

                const txData = {
                    ...updatedTx,
                    id,
                    date: originalTx.date,
                    updatedAt: new Date().toISOString(),
                    isSyncing: true
                };

                // Optimistic UI update
                set((state) => ({
                    transactions: state.transactions.map((t) =>
                        t.id === id ? txData : t
                    ),
                }));

                // Fire and forget the Firestore sync
                const syncUpdate = async () => {
                    try {
                        const { isSyncing, ...firebaseData } = txData;
                        await updateDoc(doc(db, 'transactions', id), firebaseData as any);

                        set((state) => ({
                            transactions: state.transactions.map(t =>
                                t.id === id ? { ...t, isSyncing: false } : t
                            )
                        }));
                    } catch (error) {
                        console.error("Error updating transaction in Firestore: ", error);
                    }
                };

                syncUpdate();
            },

            deleteTransaction: async (id) => {
                const originalTransactions = get().transactions;

                // Optimistic UI update
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                }));

                // Fire and forget the Firestore sync
                const syncDelete = async () => {
                    try {
                        await deleteDoc(doc(db, 'transactions', id));
                    } catch (error) {
                        console.error("Error deleting transaction from Firestore: ", error);
                        // Revert on error
                        set({ transactions: originalTransactions });
                    }
                };

                syncDelete();
            },

            addCategory: async (name, icon) => {
                try {
                    const newCat = { name, icon, isCustom: true };
                    const docRef = await addDoc(collection(db, 'categories'), newCat);

                    set((state) => ({
                        categories: [
                            ...state.categories,
                            { ...newCat, id: docRef.id }
                        ]
                    }));
                } catch (error) {
                    console.error("Error adding category: ", error);
                }
            },

            fetchTransactions: async () => {
                try {
                    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    const transactions: Transaction[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        transactions.push({
                            id: doc.id,
                            title: data.title,
                            amount: data.amount,
                            date: data.date,
                            category: data.category,
                            type: data.type,
                            note: data.note,
                            createdAt: data.createdAt
                        });
                    });
                    set({ transactions });
                } catch (error) {
                    console.error("Error fetching transactions: ", error);
                }
            },

            fetchCategories: async () => {
                try {
                    const querySnapshot = await getDocs(collection(db, 'categories'));
                    const customCategories: Category[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        customCategories.push({
                            id: doc.id,
                            name: data.name,
                            icon: data.icon,
                            isCustom: true
                        });
                    });
                    set({ categories: [...DEFAULT_CATEGORIES, ...customCategories] });
                } catch (error) {
                    console.error("Error fetching categories: ", error);
                }
            },

            subscribeToTransactions: () => {
                const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const transactions: Transaction[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        transactions.push({
                            id: doc.id,
                            title: data.title,
                            amount: data.amount,
                            date: data.date,
                            category: data.category,
                            type: data.type,
                            note: data.note,
                            createdAt: data.createdAt
                        });
                    });
                    set({ transactions });
                });
                return unsubscribe;
            }
        }),
        {
            name: 'xpenza-transactions',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

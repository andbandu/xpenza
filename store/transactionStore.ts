import { db } from '@/firebaseConfig';
import { useAuthStore } from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Ledger {
    id: string;
    userId: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
}

export interface Transaction {
    id: string;
    userId: string;
    title: string;
    amount: number;
    date: string; // ISOString or formatted date
    category: string;
    type: 'income' | 'expense';
    ledgerId: string;
    note?: string;
    createdAt?: string;
    isSyncing?: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    isCustom?: boolean;
    type?: 'income' | 'expense' | 'both';
}

const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
    { id: 'exp-1', name: 'Food', icon: 'fast-food', type: 'expense' },
    { id: 'exp-2', name: 'Transport', icon: 'car', type: 'expense' },
    { id: 'exp-3', name: 'Shopping', icon: 'cart', type: 'expense' },
    { id: 'exp-4', name: 'Health', icon: 'heart', type: 'expense' },
    { id: 'exp-5', name: 'Bills', icon: 'receipt', type: 'expense' },
    { id: 'exp-6', name: 'Entertainment', icon: 'film', type: 'expense' },
];

const DEFAULT_INCOME_CATEGORIES: Category[] = [
    { id: 'inc-1', name: 'Salary', icon: 'cash', type: 'income' },
    { id: 'inc-2', name: 'Freelance', icon: 'laptop', type: 'income' },
    { id: 'inc-3', name: 'Investment', icon: 'stats-chart', type: 'income' },
    { id: 'inc-4', name: 'Gift', icon: 'gift', type: 'income' },
];

const DEFAULT_CATEGORIES: Category[] = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
    { id: 'both-1', name: 'Other', icon: 'grid', type: 'both' },
];

interface TransactionState {
    transactions: Transaction[];
    categories: Category[];
    ledgers: Ledger[];
    activeLedgerId: string | null;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'ledgerId' | 'userId'>) => Promise<void>;
    updateTransaction: (id: string, updatedTx: Partial<Omit<Transaction, 'id' | 'userId'>>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (name: string, icon: string) => void;
    addLedger: (name: string, icon: string, color: string) => Promise<void>;
    setActiveLedger: (id: string) => void;
    deleteLedger: (id: string) => Promise<void>;
    fetchTransactions: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    fetchLedgers: () => Promise<void>;
    subscribeToTransactions: () => () => void;
    subscribeToLedgers: () => () => void;
    initializeLedgers: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>()(
    persist(
        (set, get) => ({
            transactions: [],
            categories: DEFAULT_CATEGORIES,
            ledgers: [],
            activeLedgerId: null,

            addTransaction: async (newTx) => {
                const activeId = get().activeLedgerId;
                const user = useAuthStore.getState().user;
                if (!activeId || !user) return;

                const id = Math.random().toString(36).substring(2, 9);
                const date = new Date().toISOString();
                const transaction: Transaction = {
                    ...newTx,
                    id,
                    userId: user.uid,
                    date,
                    ledgerId: activeId,
                    createdAt: date,
                    isSyncing: true,
                };

                set((state) => ({ transactions: [transaction, ...state.transactions] }));

                const syncToFirestore = async () => {
                    try {
                        const { isSyncing, id: tempId, ...docData } = transaction;
                        const docRef = await addDoc(collection(db, 'transactions'), docData);
                        set((state) => ({
                            transactions: state.transactions.map((t) =>
                                t.id === id ? { ...t, id: docRef.id, isSyncing: false } : t
                            ),
                        }));
                    } catch (error) {
                        console.error("Error adding transaction: ", error);
                        set((state) => ({
                            transactions: state.transactions.map((t) =>
                                t.id === id ? { ...t, isSyncing: false } : t
                            ),
                        }));
                    }
                };

                syncToFirestore();
            },

            updateTransaction: async (id, updatedTx) => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                set((state) => ({
                    transactions: state.transactions.map((t) =>
                        t.id === id ? { ...t, ...updatedTx, isSyncing: true } : t
                    ),
                }));

                const syncUpdate = async () => {
                    try {
                        const txnRef = doc(db, 'transactions', id);
                        await updateDoc(txnRef, updatedTx);
                        set((state) => ({
                            transactions: state.transactions.map((t) =>
                                t.id === id ? { ...t, isSyncing: false } : t
                            ),
                        }));
                    } catch (error) {
                        console.error("Error updating transaction: ", error);
                        set((state) => ({
                            transactions: state.transactions.map((t) =>
                                t.id === id ? { ...t, isSyncing: false } : t
                            ),
                        }));
                    }
                };

                syncUpdate();
            },

            deleteTransaction: async (id) => {
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                }));

                const syncDelete = async () => {
                    try {
                        await deleteDoc(doc(db, 'transactions', id));
                    } catch (error) {
                        console.error("Error deleting transaction: ", error);
                    }
                };

                syncDelete();
            },

            addCategory: (name, icon) => {
                const category: Category = {
                    id: Math.random().toString(36).substring(2, 9),
                    name,
                    icon,
                    isCustom: true,
                };
                set((state) => ({ categories: [...state.categories, category] }));
            },

            addLedger: async (name, icon, color) => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                const id = Math.random().toString(36).substring(2, 9);
                const date = new Date().toISOString();
                const ledger: Ledger = { id, userId: user.uid, name, icon, color, createdAt: date };

                try {
                    const { id: _, ...docData } = ledger;
                    const docRef = await addDoc(collection(db, 'ledgers'), docData);
                    const finalLedger = { ...ledger, id: docRef.id };
                    set((state) => {
                        // Check if subscription already added this ledger
                        const exists = state.ledgers.some(l => l.id === docRef.id);
                        if (exists) return { activeLedgerId: state.activeLedgerId || docRef.id };

                        return {
                            ledgers: [...state.ledgers, finalLedger],
                            activeLedgerId: state.activeLedgerId || finalLedger.id,
                        };
                    });
                } catch (error) {
                    console.error("Error adding ledger: ", error);
                }
            },

            setActiveLedger: (id) => set({ activeLedgerId: id }),

            deleteLedger: async (id) => {
                try {
                    const batch = writeBatch(db);
                    batch.delete(doc(db, 'ledgers', id));

                    const q = query(collection(db, 'transactions'), where('ledgerId', '==', id));
                    const snapshot = await getDocs(q);
                    snapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });

                    await batch.commit();

                    set((state) => ({
                        ledgers: state.ledgers.filter((l) => l.id !== id),
                        activeLedgerId: state.activeLedgerId === id ? (state.ledgers.find(l => l.id !== id)?.id || null) : state.activeLedgerId,
                        transactions: state.transactions.filter((t) => t.ledgerId !== id),
                    }));
                } catch (error) {
                    console.error("Error deleting ledger: ", error);
                }
            },

            fetchTransactions: async () => {
                const activeId = get().activeLedgerId;
                const user = useAuthStore.getState().user;
                if (!activeId || !user) return;

                try {
                    const q = query(
                        collection(db, 'transactions'),
                        where('userId', '==', user.uid),
                        where('ledgerId', '==', activeId)
                    );
                    const querySnapshot = await getDocs(q);
                    const transactions: Transaction[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        transactions.push({ id: doc.id, ...data } as Transaction);
                    });

                    transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                    set({ transactions });
                } catch (error) {
                    console.error("Error fetching transactions: ", error);
                }
            },

            fetchCategories: async () => {
                // Categories are local for now
            },

            fetchLedgers: async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                try {
                    const q = query(
                        collection(db, 'ledgers'),
                        where('userId', '==', user.uid)
                    );
                    const querySnapshot = await getDocs(q);
                    const ledgers: Ledger[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        ledgers.push({ id: doc.id, ...data } as Ledger);
                    });

                    set((state) => ({
                        ledgers,
                        activeLedgerId: state.activeLedgerId || ledgers[0]?.id || null,
                    }));
                } catch (error) {
                    console.error("Error fetching ledgers: ", error);
                }
            },

            subscribeToTransactions: () => {
                const activeId = get().activeLedgerId;
                const user = useAuthStore.getState().user;
                if (!activeId || !user) return () => { };

                const q = query(
                    collection(db, 'transactions'),
                    where('userId', '==', user.uid),
                    where('ledgerId', '==', activeId)
                );

                return onSnapshot(q, (snapshot) => {
                    const transactions: Transaction[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        transactions.push({ id: doc.id, ...data } as Transaction);
                    });

                    transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                    set({ transactions });
                }, (error) => {
                    console.error("Error in subscription: ", error);
                });
            },

            subscribeToLedgers: () => {
                const user = useAuthStore.getState().user;
                if (!user) return () => { };

                const q = query(
                    collection(db, 'ledgers'),
                    where('userId', '==', user.uid)
                );

                return onSnapshot(q, (snapshot) => {
                    const ledgers: Ledger[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        ledgers.push({ id: doc.id, ...data } as Ledger);
                    });

                    set((state) => ({
                        ledgers,
                        activeLedgerId: state.activeLedgerId || ledgers[0]?.id || null,
                    }));
                }, (error) => {
                    console.error("Error in subscription: ", error);
                });
            },

            initializeLedgers: async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                const q = query(collection(db, 'ledgers'), where('userId', '==', user.uid));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    await get().addLedger('Main Book', 'book', '#6366F1');
                } else {
                    get().fetchLedgers();
                }
            },
        }),
        {
            name: 'xpenza-transactions',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

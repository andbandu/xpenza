import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Ledger {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
}

export interface Transaction {
    id: string;
    title: string;
    amount: number;
    date: string; // ISOString or formatted date
    category: string;
    type: 'income' | 'expense';
    ledgerId: string; // Link to a book
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
    ledgers: Ledger[];
    activeLedgerId: string | null;

    // Transaction Actions
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'ledgerId'>) => Promise<void>;
    updateTransaction: (id: string, transaction: Omit<Transaction, 'id' | 'date' | 'ledgerId'>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;

    // Category Actions
    addCategory: (name: string, icon: string) => Promise<void>;

    // Ledger Actions
    addLedger: (name: string, icon: string, color: string) => Promise<void>;
    setActiveLedger: (id: string) => void;
    deleteLedger: (id: string) => Promise<void>;

    // Sync/Fetch Actions
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
                if (!activeId) return;

                const tempId = Date.now().toString();
                const txData = {
                    ...newTx,
                    id: tempId,
                    ledgerId: activeId,
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
                    ledgerId: originalTx.ledgerId,
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

                const syncDelete = async () => {
                    try {
                        await deleteDoc(doc(db, 'transactions', id));
                    } catch (error) {
                        console.error("Error deleting transaction from Firestore: ", error);
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

            addLedger: async (name, icon, color) => {
                const tempId = Date.now().toString();
                const newLedger = {
                    id: tempId,
                    name,
                    icon,
                    color,
                    createdAt: new Date().toISOString()
                };

                // Optimistic update
                set((state) => ({
                    ledgers: [...state.ledgers, newLedger],
                    activeLedgerId: state.activeLedgerId || tempId
                }));

                try {
                    const { id, ...firebaseData } = newLedger;
                    const docRef = await addDoc(collection(db, 'ledgers'), firebaseData);

                    set((state) => ({
                        ledgers: state.ledgers.map(l => l.id === tempId ? { ...newLedger, id: docRef.id } : l),
                        activeLedgerId: state.activeLedgerId === tempId ? docRef.id : state.activeLedgerId
                    }));
                } catch (error) {
                    console.error("Error adding ledger: ", error);
                }
            },

            setActiveLedger: (id) => {
                set({ activeLedgerId: id });
            },

            deleteLedger: async (id) => {
                const originalLedgers = get().ledgers;
                const originalActiveId = get().activeLedgerId;

                // Optimistic delete
                set((state) => ({
                    ledgers: state.ledgers.filter(l => l.id !== id),
                    activeLedgerId: state.activeLedgerId === id ? (state.ledgers.find(l => l.id !== id)?.id || null) : state.activeLedgerId
                }));

                try {
                    // Delete ledger document
                    await deleteDoc(doc(db, 'ledgers', id));

                    // Also delete associated transactions in background
                    const q = query(collection(db, 'transactions'), where('ledgerId', '==', id));
                    const snapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    snapshot.forEach((doc) => batch.delete(doc.ref));
                    await batch.commit();
                } catch (error) {
                    console.error("Error deleting ledger: ", error);
                    set({ ledgers: originalLedgers, activeLedgerId: originalActiveId });
                }
            },

            fetchTransactions: async () => {
                const activeId = get().activeLedgerId;
                if (!activeId) return;

                try {
                    const q = query(
                        collection(db, 'transactions'),
                        where('ledgerId', '==', activeId)
                    );
                    const querySnapshot = await getDocs(q);
                    const transactions: Transaction[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        transactions.push({ id: doc.id, ...data } as Transaction);
                    });

                    // Client-side sort to avoid Firestore index requirement
                    transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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

            fetchLedgers: async () => {
                try {
                    const q = query(collection(db, 'ledgers'), orderBy('createdAt', 'asc'));
                    const snapshot = await getDocs(q);
                    const ledgers: Ledger[] = [];
                    snapshot.forEach((doc) => {
                        ledgers.push({ id: doc.id, ...doc.data() } as Ledger);
                    });

                    if (ledgers.length > 0) {
                        set({
                            ledgers,
                            activeLedgerId: get().activeLedgerId || ledgers[0].id
                        });
                    } else {
                        await get().initializeLedgers();
                    }
                } catch (error) {
                    console.error("Error fetching ledgers: ", error);
                }
            },

            subscribeToTransactions: () => {
                const activeId = get().activeLedgerId;
                if (!activeId) return () => { };

                const q = query(
                    collection(db, 'transactions'),
                    where('ledgerId', '==', activeId)
                );

                return onSnapshot(q, (snapshot) => {
                    const transactions: Transaction[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Transaction));

                    // Client-side sort to avoid Firestore index requirement
                    transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                    set({ transactions });
                }, (error) => {
                    console.error("Firestore subscription error: ", error);
                });
            },

            subscribeToLedgers: () => {
                const q = query(collection(db, 'ledgers'), orderBy('createdAt', 'asc'));
                return onSnapshot(q, (snapshot) => {
                    const ledgers: Ledger[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Ledger));

                    set((state) => {
                        const newState: Partial<TransactionState> = { ledgers };
                        if (ledgers.length > 0 && !state.activeLedgerId) {
                            newState.activeLedgerId = ledgers[0].id;
                        }
                        return newState as TransactionState;
                    });
                });
            },

            initializeLedgers: async () => {
                // If no ledgers, create a default "Main Book"
                if (get().ledgers.length === 0) {
                    await get().addLedger('Main Book', 'book', '#6366F1');

                    // Migration: Assign any orphaned transactions to the new Main Book
                    const q = query(collection(db, 'transactions'), where('ledgerId', '==', null));
                    const snapshot = await getDocs(q);
                    const mainId = get().activeLedgerId;

                    if (snapshot.size > 0 && mainId) {
                        const batch = writeBatch(db);
                        snapshot.forEach((doc) => batch.update(doc.ref, { ledgerId: mainId }));
                        await batch.commit();
                    }
                }
            }
        }),
        {
            name: 'xpenza-transactions',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

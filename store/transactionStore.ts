import { db } from '@/firebaseConfig';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { create } from 'zustand';

export interface Transaction {
    id: string;
    title: string;
    amount: number;
    date: string; // ISOString or formatted date
    category: string;
    type: 'income' | 'expense';
    note?: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    isCustom?: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', name: 'Food', icon: 'fast-food' },
    { id: '2', name: 'Transport', icon: 'car' },
    { id: '3', name: 'Housing', icon: 'home' },
    { id: '4', name: 'Shopping', icon: 'cart' },
    { id: '5', name: 'Entertainment', icon: 'game-controller' },
    { id: '6', name: 'Health', icon: 'medkit' },
    { id: '7', name: 'Education', icon: 'school' },
    { id: '8', name: 'Other', icon: 'grid' },
];

interface TransactionState {
    transactions: Transaction[];
    categories: Category[];
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (name: string, icon: string) => Promise<void>;
    fetchTransactions: () => Promise<void>;
    fetchCategories: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    categories: DEFAULT_CATEGORIES,

    addTransaction: async (newTx) => {
        try {
            const txData = {
                ...newTx,
                date: new Date().toDateString(),
                createdAt: new Date().toISOString() // for sorting
            };
            const docRef = await addDoc(collection(db, 'transactions'), txData);

            set((state) => ({
                transactions: [
                    { ...txData, id: docRef.id },
                    ...state.transactions,
                ],
            }));
        } catch (error) {
            console.error("Error adding transaction: ", error);
        }
    },

    deleteTransaction: async (id) => {
        try {
            await deleteDoc(doc(db, 'transactions', id));
            set((state) => ({
                transactions: state.transactions.filter((t) => t.id !== id),
            }));
        } catch (error) {
            console.error("Error deleting transaction: ", error);
        }
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
                    note: data.note
                });
            });
            set({ transactions });
        } catch (error) {
            console.error("Error fetching transactions: ", error);
        }
    },

    fetchCategories: async () => {
        try {
            // Load custom categories
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
    }
}));

import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
    onAuthStateChanged,
    signOut,
    User
} from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Robust initialization to prevent "Firebase App already exists" or "Auth already exists"
// and support persistence in React Native
let authInstance;
try {
    authInstance = initializeAuth(db.app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e) {
    authInstance = getAuth(db.app);
}

export const auth = authInstance;

interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
}

interface AuthState {
    user: UserProfile | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isLoading: true,
            setUser: (user) => {
                if (user) {
                    set({
                        user: {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            phoneNumber: user.phoneNumber,
                        },
                        isLoading: false,
                    });
                } else {
                    set({ user: null, isLoading: false });
                }
            },
            logout: async () => {
                await signOut(auth);
                set({ user: null });
            },
        }),
        {
            name: 'xpenza-auth',
            storage: createJSONStorage(() => AsyncStorage as any),
        }
    )
);

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
    useAuthStore.getState().setUser(user);
});

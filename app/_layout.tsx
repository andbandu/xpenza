import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { useTransactionStore } from '@/store/transactionStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions);
  const fetchCategories = useTransactionStore((state) => state.fetchCategories);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
      useTransactionStore.getState().initializeLedgers();
    }
  }, [user]);

  useEffect(() => {
    // Wait until everything is ready
    if (!isMounted || isAuthLoading || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Small delay to ensure navigator is fully stable
      const timeout = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 10);
      return () => clearTimeout(timeout);
    } else if (user && inAuthGroup) {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [user, segments, isAuthLoading, navigationState?.key, isMounted]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Add Transaction', headerShown: true }} />
        </Stack>

        {(isAuthLoading || !isMounted) && (
          <View style={[StyleSheet.absoluteFill, {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            zIndex: 1000
          }]}>
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].primary} />
          </View>
        )}

        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

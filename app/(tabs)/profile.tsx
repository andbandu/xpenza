import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { SUPPORTED_CURRENCIES, useSettingsStore } from '@/store/settingsStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { user, logout } = useAuthStore();
    const { transactions, ledgers } = useTransactionStore();
    const { currency, setCurrency } = useSettingsStore();

    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

    const totalBalance = transactions.reduce((acc, t) =>
        t.type === 'income' ? acc + t.amount : acc - t.amount, 0
    );

    const stats = [
        { label: 'Books', value: ledgers.length, icon: 'book-outline', color: theme.primary },
        { label: 'Transactions', value: transactions.length, icon: 'receipt-outline', color: '#10B981' },
        { label: 'Balance', value: `${currency.symbol} ${totalBalance.toLocaleString()}`, icon: 'wallet-outline', color: '#6366F1' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
                </View>

                <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
                    <View style={styles.avatarContainer}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <LinearGradient
                                colors={[theme.primary, theme.primary + '80']}
                                style={styles.avatarPlaceholder}
                            >
                                <Text style={styles.avatarInitial}>
                                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                        <TouchableOpacity style={[styles.editBadge, { backgroundColor: theme.primary }]}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.userName, { color: theme.text }]}>
                        {user?.displayName || 'Xpenza User'}
                    </Text>
                    <Text style={[styles.userEmail, { color: theme.icon }]}>
                        {user?.email || user?.phoneNumber || 'No identifier'}
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    {stats.map((stat, i) => (
                        <View key={i} style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
                    <View style={[styles.settingsGroup, { backgroundColor: theme.card }]}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelGroup}>
                                <View style={[styles.settingIcon, { backgroundColor: '#F59E0B20' }]}>
                                    <Ionicons name="moon-outline" size={20} color="#F59E0B" />
                                </View>
                                <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
                            </View>
                            <Switch value={colorScheme === 'dark'} />
                        </View>

                        <View style={styles.separator} />

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => setCurrencyModalVisible(true)}
                        >
                            <View style={styles.settingLabelGroup}>
                                <View style={[styles.settingIcon, { backgroundColor: '#10B98120' }]}>
                                    <Ionicons name="cash-outline" size={20} color="#10B981" />
                                </View>
                                <Text style={[styles.settingLabel, { color: theme.text }]}>Currency</Text>
                            </View>
                            <View style={styles.settingAction}>
                                <Text style={[styles.settingValue, { color: theme.icon }]}>{currency.code} ({currency.symbol})</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.icon} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingLabelGroup}>
                                <View style={[styles.settingIcon, { backgroundColor: '#3B82F620' }]}>
                                    <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
                                </View>
                                <Text style={[styles.settingLabel, { color: theme.text }]}>Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingLabelGroup}>
                                <View style={[styles.settingIcon, { backgroundColor: '#EC489920' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color="#EC4899" />
                                </View>
                                <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy & Security</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: theme.danger }]}
                    onPress={logout}
                >
                    <Ionicons name="log-out-outline" size={20} color={theme.danger} />
                    <Text style={[styles.logoutText, { color: theme.danger }]}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0 (Build 42)</Text>
            </ScrollView>

            {/* Currency Selection Modal */}
            <Modal
                visible={currencyModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCurrencyModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setCurrencyModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
                            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={SUPPORTED_CURRENCIES}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.currencyItem,
                                        currency.code === item.code && { backgroundColor: theme.primary + '15' }
                                    ]}
                                    onPress={() => {
                                        setCurrency(item);
                                        setCurrencyModalVisible(false);
                                    }}
                                >
                                    <View style={styles.currencyInfo}>
                                        <Text style={[styles.currencyCode, { color: theme.text }]}>{item.code}</Text>
                                        <Text style={[styles.currencyName, { color: theme.icon }]}>{item.name}</Text>
                                    </View>
                                    <Text style={[styles.currencySymbol, { color: theme.primary }]}>{item.symbol}</Text>
                                    {currency.code === item.code && (
                                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
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
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    profileCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        color: '#FFF',
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        opacity: 0.7,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    settingsGroup: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    currencyInfo: {
        flex: 1,
    },
    currencyCode: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    currencyName: {
        fontSize: 13,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        marginRight: 12,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginHorizontal: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        opacity: 0.5,
        marginBottom: 20,
    }
});

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionStore } from '@/store/transactionStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface LedgerSwitcherProps {
    visible: boolean;
    onClose: () => void;
}

export default function LedgerSwitcher({ visible, onClose }: LedgerSwitcherProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const { ledgers, activeLedgerId, setActiveLedger, addLedger } = useTransactionStore();

    const [isAdding, setIsAdding] = useState(false);
    const [newLedgerName, setNewLedgerName] = useState('');

    const handleCreateLedger = async () => {
        if (!newLedgerName.trim()) return;
        await addLedger(newLedgerName, 'book', theme.primary);
        setNewLedgerName('');
        setIsAdding(false);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.content, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>My Books</Text>
                        <Pressable onPress={() => setIsAdding(!isAdding)}>
                            <Ionicons name={isAdding ? "close" : "add"} size={28} color={theme.primary} />
                        </Pressable>
                    </View>

                    {isAdding && (
                        <View style={styles.addSection}>
                            <TextInput
                                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                                placeholder="Book Name (e.g. Personal)"
                                placeholderTextColor={theme.icon}
                                value={newLedgerName}
                                onChangeText={setNewLedgerName}
                                autoFocus
                            />
                            <Pressable
                                style={[styles.createButton, { backgroundColor: theme.primary }]}
                                onPress={handleCreateLedger}
                            >
                                <Text style={styles.createButtonText}>Create Book</Text>
                            </Pressable>
                        </View>
                    )}

                    <FlatList
                        data={ledgers}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <Pressable
                                style={[
                                    styles.ledgerItem,
                                    { backgroundColor: theme.card },
                                    activeLedgerId === item.id && { borderColor: theme.primary, borderWidth: 2 }
                                ]}
                                onPress={() => {
                                    setActiveLedger(item.id);
                                    onClose();
                                }}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                                </View>
                                <Text style={[styles.ledgerName, { color: theme.text }]}>{item.name}</Text>
                                {activeLedgerId === item.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                                )}
                            </Pressable>
                        )}
                        contentContainerStyle={styles.list}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        height: '60%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    addSection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    createButton: {
        paddingHorizontal: 20,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        color: 'white',
        fontWeight: '700',
    },
    list: {
        gap: 12,
        paddingBottom: 20,
    },
    ledgerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    ledgerName: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
    },
});

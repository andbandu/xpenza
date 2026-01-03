import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type AuthMode = 'email' | 'phone' | 'social';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>('email');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Auth Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        // Note: Native Google Login requires more setup (expo-auth-session)
        // For now, alerting the user about setup.
        Alert.alert('Social Login', 'Google Login requires specific Firebase App IDs and configuration. Implementing web-based fallback...');
    };

    const handlePhoneAuth = () => {
        if (!isOtpSent) {
            // Flow to send OTP
            setIsOtpSent(true);
            Alert.alert('OTP Sent', 'Demo: OTP functionality requires Firebase Phone Auth configuration.');
        } else {
            // Flow to verify OTP
            router.replace('/(tabs)');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <LinearGradient
                            colors={[theme.primary, theme.primary + '80']}
                            style={styles.logoBadge}
                        >
                            <Ionicons name="wallet" size={40} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.title, { color: theme.text }]}>Xpenza</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>
                            Master your finances with style.
                        </Text>
                    </View>

                    <View style={styles.tabContainer}>
                        {(['email', 'phone', 'social'] as AuthMode[]).map((m) => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setMode(m)}
                                style={[
                                    styles.tab,
                                    mode === m && { borderBottomColor: theme.primary, borderBottomWidth: 3 }
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: mode === m ? theme.primary : theme.icon }
                                ]}>
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.formContainer}>
                        {mode === 'email' && (
                            <>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
                                    <Ionicons name="mail-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Email Address"
                                        placeholderTextColor={theme.icon + '80'}
                                        style={[styles.input, { color: theme.text }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>

                                <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor={theme.icon + '80'}
                                        style={[styles.input, { color: theme.text }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={() => setIsLogin(!isLogin)}
                                    style={styles.switchMode}
                                >
                                    <Text style={{ color: theme.icon }}>
                                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                                        <Text style={{ color: theme.primary, fontWeight: '600' }}>
                                            {isLogin ? "Sign Up" : "Login"}
                                        </Text>
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.mainButton, { backgroundColor: theme.primary }]}
                                    onPress={handleEmailAuth}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <ActivityIndicator color="#FFF" /> : (
                                        <Text style={styles.mainButtonText}>
                                            {isLogin ? "Log In" : "Sign Up"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        {mode === 'phone' && (
                            <>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
                                    <Ionicons name="phone-portrait-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Phone Number (+1...)"
                                        placeholderTextColor={theme.icon + '80'}
                                        style={[styles.input, { color: theme.text }]}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                {isOtpSent && (
                                    <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
                                        <Ionicons name="key-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="6-digit OTP"
                                            placeholderTextColor={theme.icon + '80'}
                                            style={[styles.input, { color: theme.text }]}
                                            value={otp}
                                            onChangeText={setOtp}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.mainButton, { backgroundColor: theme.primary }]}
                                    onPress={handlePhoneAuth}
                                >
                                    <Text style={styles.mainButtonText}>
                                        {isOtpSent ? "Verify OTP" : "Send OTP"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {mode === 'social' && (
                            <View style={styles.socialButtons}>
                                <TouchableOpacity
                                    style={[styles.socialButton, { backgroundColor: '#4285F4' }]}
                                    onPress={handleGoogleLogin}
                                >
                                    <Ionicons name="logo-google" size={24} color="#FFF" />
                                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                                </TouchableOpacity>

                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#000' }]}>
                                        <Ionicons name="logo-apple" size={24} color="#FFF" />
                                        <Text style={styles.socialButtonText}>Continue with Apple</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoBadge: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.7,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 32,
        justifyContent: 'center',
        gap: 16,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    formContainer: {
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 60,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    switchMode: {
        alignItems: 'center',
        marginTop: 8,
    },
    mainButton: {
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    mainButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    socialButtons: {
        gap: 16,
    },
    socialButton: {
        height: 60,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    socialButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

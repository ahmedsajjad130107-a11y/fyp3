import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Loader } from '../src/components/ui/Loader';

const GREEN = '#01411C';

const Login: React.FC = () => {
  const navigation = useNavigation();
  const { user, authLoading, authError, signIn } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setLocalError(e?.message || 'Unable to sign in. Please try again.');
    }
  };

  useEffect(() => {
    if (user) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  }, [user, navigation]);

  const displayError = localError || authError;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Green Hero ── */}
        <View style={styles.hero}>
          {/* Decorative circle */}
          <View style={styles.heroCircle} />

          {/* Back button */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.heroBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={styles.heroLogoWrapper}>
            <Image
              source={require('../assets/images/app logo.jpeg')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>SafarSmart</Text>
          <Text style={styles.heroSubtitle}>Plan smarter journeys tailored to you</Text>
        </View>

        {/* ── White Form Card ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue your journey</Text>

          <View style={styles.fieldGroup}>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              containerStyle={styles.input}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword((s) => !s)}
              containerStyle={styles.input}
            />
          </View>

          {displayError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {displayError}</Text>
            </View>
          )}

          <Button
            title={authLoading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            disabled={authLoading || !email || !password}
            loading={authLoading}
            size="lg"
            style={styles.signInBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Create an Account"
            variant="outline"
            size="lg"
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Signup');
            }}
          />
        </View>
      </ScrollView>

      {authLoading && <Loader overlay />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GREEN,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero
  hero: {
    backgroundColor: GREEN,
    paddingTop: 56,
    paddingBottom: 48,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBackBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroLogoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 50,
    height: 50,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },

  // Form card
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    minHeight: 480,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 28,
  },
  fieldGroup: {
    gap: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 0,
  },

  // Error
  errorBox: {
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },

  signInBtn: {
    marginTop: 20,
    marginBottom: 4,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

});

export default Login;

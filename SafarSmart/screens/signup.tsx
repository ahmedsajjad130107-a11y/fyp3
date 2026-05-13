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

const Signup: React.FC = () => {
  const navigation = useNavigation();
  const { user, authLoading, authError, signUp } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    setLocalError(null);
    if (!name.trim()) { setLocalError('Please enter your name.'); return; }
    if (!email.trim()) { setLocalError('Please enter your email.'); return; }
    if (!password) { setLocalError('Please enter a password.'); return; }
    if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e: any) {
      setLocalError(e?.message || 'Unable to create account. Please try again.');
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
          <Text style={styles.heroTitle}>Join SafarSmart</Text>
          <Text style={styles.heroSubtitle}>Create your account and start exploring</Text>
        </View>

        {/* ── White Form Card ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSubtitle}>Fill in your details to get started</Text>

          <View style={styles.fieldGroup}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon="person-outline"
              containerStyle={styles.input}
            />

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
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword((s) => !s)}
              containerStyle={styles.input}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              leftIcon="shield-checkmark-outline"
              rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowConfirmPassword((s) => !s)}
              containerStyle={styles.input}
            />
          </View>

          {displayError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {displayError}</Text>
            </View>
          )}

          <Button
            title={authLoading ? 'Creating account...' : 'Create Account'}
            onPress={handleSignup}
            disabled={authLoading || !name || !email || !password || !confirmPassword}
            loading={authLoading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Already have an account? Sign In"
            variant="outline"
            size="lg"
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Login');
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

  hero: {
    backgroundColor: GREEN,
    paddingTop: 56,
    paddingBottom: 44,
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
    fontSize: 30,
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

  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    minHeight: 600,
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

  submitBtn: {
    marginTop: 20,
    marginBottom: 4,
  },

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

export default Signup;

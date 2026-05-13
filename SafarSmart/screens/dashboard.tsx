import React from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { theme } from '../src/theme';
import FallingLeaves from '../src/components/FallingLeaves';

const GREEN = '#01411C';

const FEATURED_DESTINATIONS = [
  { city: 'Lahore', icon: '🕌', color: '#C2522A', sub: 'Cultural Capital' },
  { city: 'Islamabad', icon: '🏛️', color: '#1565C0', sub: 'Green City' },
  { city: 'Hunza', icon: '🏔️', color: '#01411C', sub: 'Mountain Paradise' },
  { city: 'Swat', icon: '🌿', color: '#2E7D32', sub: 'Switzerland of Pakistan' },
  { city: 'Karachi', icon: '🌊', color: '#00838F', sub: 'City of Lights' },
  { city: 'Murree', icon: '🌲', color: '#558B2F', sub: 'Hill Station' },
];

const ALL_TRAVEL_TIPS = [
  {
    icon: 'map-outline' as const,
    text: 'Plan routes and hotel bookings ahead during peak seasons'
  },
  {
    icon: 'battery-charging-outline' as const,
    text: 'Carry a power bank and offline maps for remote areas'
  },
  {
    icon: 'cloud-outline' as const,
    text: 'Weather in northern areas can change rapidly, pack accordingly'
  },
  {
    icon: 'cash-outline' as const,
    text: 'Keep some cash with you when traveling outside major cities'
  },
  {
    icon: 'car-outline' as const,
    text: 'Check road conditions before starting long journeys'
  },
  {
    icon: 'water-outline' as const,
    text: 'Stay hydrated during road trips and outdoor activities'
  },
  {
    icon: 'time-outline' as const,
    text: 'Start mountain travel early in the morning for safer driving'
  },
  {
    icon: 'shield-checkmark-outline' as const,
    text: 'Share your travel itinerary with family or friends'
  },
  {
    icon: 'sunny-outline' as const,
    text: 'Use sunscreen and sunglasses during daytime travel'
  },
  {
    icon: 'bed-outline' as const,
    text: 'Confirm hotel reservations before arriving at your destination'
  },
  {
    icon: 'wifi-outline' as const,
    text: 'Download maps and important documents for offline access'
  },
  {
    icon: 'restaurant-outline' as const,
    text: 'Try local food from clean and well-reviewed places'
  },
  {
    icon: 'medical-outline' as const,
    text: 'Carry basic medicines and a first aid kit while traveling'
  },
  {
    icon: 'bag-outline' as const,
    text: 'Pack light but keep essential travel items easily accessible'
  },
  {
    icon: 'moon-outline' as const,
    text: 'Avoid unfamiliar roads late at night in remote areas'
  },
];

const QUICK_TIPS = [...ALL_TRAVEL_TIPS]
  .sort(() => 0.5 - Math.random())
  .slice(0, 3);

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useApp();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Traveler';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleSignOut = async () => {
    try {
      await signOut();
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.fallingLeavesWrap}>
        <FallingLeaves />
      </View>
      <StatusBar style="light" />

      {/* ── Green Header ── */}
      <View style={styles.header}>
        {/* Top row */}
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <Image
              source={require('../assets/images/app logo.jpeg')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerBrand}>SafarSmart</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLabel}>{greeting},</Text>
          <Text style={styles.greetingName}>{displayName} 👋</Text>
          <Text style={styles.greetingSubtitle}>Where are you exploring today?</Text>
        </View>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPrimary]}
            activeOpacity={0.85}
            // @ts-ignore
            onPress={() => navigation.navigate('GenerateItinerary')}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="airplane-outline" size={28} color={GREEN} />
            </View>
            <Text style={styles.actionTitle}>Generate</Text>
            <Text style={styles.actionSubtitle}>Create a new trip plan</Text>
            <View style={styles.actionArrow}>
              <Ionicons name="chevron-forward" size={16} color={GREEN} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardSecondary]}
            activeOpacity={0.85}
            // @ts-ignore
            onPress={() => navigation.navigate('SavedItineraries')}
          >
            <View style={[styles.actionIconBg, styles.actionIconBgGold]}>
              <Ionicons name="bookmark-outline" size={26} color="#8B6914" />
            </View>
            <Text style={styles.actionTitle}>Saved Trips</Text>
            <Text style={styles.actionSubtitle}>View your itineraries</Text>
            <View style={styles.actionArrow}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Fare Calculator action */}
        <TouchableOpacity
          style={[styles.actionCardWide]}
          activeOpacity={0.85}
          // @ts-ignore
          onPress={() => navigation.navigate('FareCalculator')}
        >
          <View style={[styles.actionIconBg, { backgroundColor: '#D4AF3722', marginBottom: 0, marginRight: 14 }]}>
            <Ionicons name="car-outline" size={26} color="#8B6914" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Fare Calculator</Text>
            <Text style={styles.actionSubtitle}>Compare inDrive, bus, train and plane fares</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Feedback action */}
        <TouchableOpacity
          style={[styles.actionCardWide, { borderColor: GREEN + '33' }]}
          activeOpacity={0.85}
          // @ts-ignore
          onPress={() => navigation.navigate('Feedback')}
        >
          <View style={[styles.actionIconBg, { backgroundColor: GREEN + '15', marginBottom: 0, marginRight: 14 }]}>
            <Ionicons name="chatbox-ellipses-outline" size={26} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Give Feedback</Text>
            <Text style={styles.actionSubtitle}>Rate the app and share your thoughts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Featured Destinations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Destinations</Text>
          <Text style={styles.sectionNote}>Tap to plan a trip</Text>
        </View>
        <FlatList
          data={FEATURED_DESTINATIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.city}
          contentContainerStyle={styles.destinationsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.destCard}
              activeOpacity={0.8}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('GenerateItinerary', { prefillDestination: item.city });
              }}
            >
              <View style={[styles.destIconBg, { backgroundColor: item.color + '22' }]}>
                <Text style={styles.destEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.destCity}>{item.city}</Text>
              <Text style={styles.destSub}>{item.sub}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Travel Tips */}
        <Text style={styles.sectionTitle}>Travel Tips</Text>
        <View style={styles.tipsCard}>
          {QUICK_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, i < QUICK_TIPS.length - 1 && styles.tipBorder]}>
              <View style={styles.tipIconWrap}>
                <Ionicons name={tip.icon} size={18} color={GREEN} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🌍 About SafarSmart</Text>
          <Text style={styles.aboutText}>
            AI-powered travel planning for Pakistan. Discover hidden gems, plan optimal routes, and
            get budget-aware itineraries — all in seconds.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fallingLeavesWrap: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  root: {
    flex: 1,
    backgroundColor: GREEN,
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: {
    gap: 3,
  },
  greetingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
    position: 'relative',
  },
  actionCardPrimary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GREEN + '22',
  },
  actionCardSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actionCardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF3744',
    marginBottom: 4,
    ...theme.shadows.sm,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: GREEN + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIconBgGold: {
    backgroundColor: '#D4AF3722',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  actionArrow: {
    position: 'absolute',
    top: 16,
    right: 14,
  },

  // Featured Destinations
  destinationsList: {
    paddingRight: 8,
    gap: 12,
    marginBottom: 4,
  },
  destCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  destIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  destEmoji: {
    fontSize: 26,
  },
  destCity: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  destSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },

  // Tips
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    ...theme.shadows.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  tipBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: GREEN + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  // About
  aboutCard: {
    backgroundColor: GREEN,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
});

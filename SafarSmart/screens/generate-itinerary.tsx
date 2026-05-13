import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { saveTripItinerary } from '../src/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Loader } from '../src/components/ui/Loader';
import { Stepper } from '../src/components/ui/Stepper';
import { Select } from '../src/components/ui/Select';
import DatePicker from '../src/components/ui/DatePicker';
import { PAKISTANI_CITIES } from '../src/data/pakistaniCities';
import { BUS_CITIES, TRAIN_CITIES, isCityInList } from '../src/data/transportBookingCities';
import ScreenWrapper from '../src/components/ScreenWrapper';
import WeatherCard from '../src/components/WeatherCard';
import FloatingChatBot from '../src/components/FloatingChatBot';
import {
  getTripOptions,
  generateTripItinerary,
  TripRequest,
  HotelOption,
  TransportOption,
  TripOptionsResponse,
  TripItineraryResponse,
} from '../src/services/tripApi';
import { fetchReviewsForPlace, fetchEventsAndFestivals, filterEventsToUpcomingOnly, SerperReviewsResult, SerperSearchResult } from '../src/services/serperApi';
import FallingLeaves from '../src/components/FallingLeaves';
import ItineraryLoadingScreen from '../src/components/ItineraryLoadingScreen';
import { WebView } from 'react-native-webview';

const GREEN = '#01411C';
const GOLD = '#D4AF37';

const ACTIVITY_TYPES = [
  { key: 'nature', label: '🌿 Nature & Scenic', icon: 'leaf-outline' },
  { key: 'historical', label: '🏛️ Historical', icon: 'library-outline' },
  { key: 'adventure', label: '⛰️ Adventure', icon: 'trail-sign-outline' },
  { key: 'cultural', label: '🎭 Cultural', icon: 'color-palette-outline' },
  { key: 'religious', label: '🕌 Religious', icon: 'moon-outline' },
  { key: 'lakes', label: '💧 Lakes & Water', icon: 'water-outline' },
  { key: 'shopping', label: '🛍️ Shopping', icon: 'bag-outline' },
  { key: 'food', label: '🍽️ Food & Cuisine', icon: 'restaurant-outline' },
];

type Phase = 'form' | 'selecting' | 'itinerary';

const TRANSPORT_ICONS: Record<string, string> = {
  flight: '✈️',
  bus: '🚌',
  train: '🚂',
  car: '🚗',
};

const STAR_LABELS: Record<number, string> = {
  1: 'Budget', 2: 'Economy', 3: 'Standard', 4: 'Superior', 5: 'Luxury',
};

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
};

type DailyWeatherDay = {
  date: string;
  weather: string;
  minTemp: number | null;
  maxTemp: number | null;
  rainChance: number | null;
};

type PopupAction = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

const BUS_CITY_ALIAS_MAP: Record<string, string> = {
  ISLAMABAD: 'Islamabad ( Faizabad )',
  RAWALPINDI: 'Rawalpindi / Islamabad ( Pirwadhai )',
  SWAT: 'Swat (mingora)',
  MINGORA: 'Swat (mingora)',
  SHEIKHUPURA: 'Sheikhpura',
};

const CITY_THEME: Record<string, { bg: string; accent: string; emoji: string }> = {
  lahore: { bg: '#5C3B1E', accent: '#D4AF37', emoji: '🕌' },
  islamabad: { bg: '#1E4D7A', accent: '#7ED7FF', emoji: '🏛️' },
  karachi: { bg: '#0F4C5C', accent: '#7EE8FA', emoji: '🌊' },
  hunza: { bg: '#1D3B2A', accent: '#A6E36B', emoji: '🏔️' },
  swat: { bg: '#1F5E45', accent: '#8DE4AF', emoji: '🌿' },
  murree: { bg: '#345E2B', accent: '#BDE58A', emoji: '🌲' },
};

// ── Hotel selection card ──────────────────────────────────────────────────────
function HotelCard({ hotel, selected, onPress }: {
  hotel: HotelOption; selected: boolean; onPress: () => void;
}) {
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, hotel.star_rating)));
  return (
    <TouchableOpacity
      style={[hc.card, selected && hc.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={hc.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={hc.name} numberOfLines={2}>{hotel.name}</Text>
          <Text style={hc.stars}>{stars} <Text style={hc.tierLabel}>{STAR_LABELS[hotel.star_rating] || ''}</Text></Text>
          <Text style={hc.location}>📍 {hotel.location}</Text>
        </View>
        <View style={[hc.selectDot, selected && hc.selectDotActive]}>
          {selected && <View style={hc.selectDotInner} />}
        </View>
      </View>
      <View style={hc.priceRow}>
        <Text style={hc.priceNight}>PKR {hotel.price_per_night.toLocaleString()} <Text style={hc.perNight}>/night</Text></Text>
        <Text style={hc.priceTotal}>Total: PKR {hotel.total_price.toLocaleString()}</Text>
      </View>
      {hotel.amenities.length > 0 && (
        <View style={hc.amenitiesRow}>
          {hotel.amenities.slice(0, 4).map((a, i) => (
            <View key={i} style={hc.amenityChip}><Text style={hc.amenityText}>{a}</Text></View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
const hc = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: theme.colors.border, ...theme.shadows.sm },
  cardSelected: { borderColor: GREEN, backgroundColor: GREEN + '06' },
  topRow: { flexDirection: 'row', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4, flex: 1 },
  stars: { fontSize: 13, marginBottom: 2 },
  tierLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  location: { fontSize: 12, color: theme.colors.textSecondary },
  selectDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 2 },
  selectDotActive: { borderColor: GREEN },
  selectDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, marginBottom: 10 },
  priceNight: { fontSize: 16, fontWeight: '700', color: GREEN },
  perNight: { fontSize: 12, fontWeight: '400', color: theme.colors.textSecondary },
  priceTotal: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityChip: { backgroundColor: GREEN + '12', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  amenityText: { fontSize: 11, color: GREEN, fontWeight: '500' },
});

// ── Transport selection card ──────────────────────────────────────────────────
function TransportCard({ option, selected, onPress }: {
  option: TransportOption; selected: boolean; onPress: () => void;
}) {
  const icon = TRANSPORT_ICONS[option.type.toLowerCase()] || '🚐';
  return (
    <TouchableOpacity
      style={[tc.card, selected && tc.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={tc.row}>
        <Text style={tc.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={tc.provider}>{option.provider}</Text>
          <Text style={tc.type}>{option.type.charAt(0).toUpperCase() + option.type.slice(1)}</Text>
          <Text style={tc.duration}>⏱ {option.duration}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={tc.ppPrice}>PKR {option.price_per_person.toLocaleString()}</Text>
          <Text style={tc.ppLabel}>per person</Text>
          <Text style={tc.totalPrice}>Total: PKR {option.total_price.toLocaleString()}</Text>
        </View>
        <View style={[tc.selectDot, selected && tc.selectDotActive]}>
          {selected && <View style={tc.selectDotInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}




const tc = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: theme.colors.border, ...theme.shadows.sm },
  cardSelected: { borderColor: GREEN, backgroundColor: GREEN + '06' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28, width: 36, textAlign: 'center' },
  provider: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  type: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 2 },
  duration: { fontSize: 12, color: theme.colors.textSecondary },
  ppPrice: { fontSize: 15, fontWeight: '700', color: GREEN },
  ppLabel: { fontSize: 11, color: theme.colors.textSecondary },
  totalPrice: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 2 },
  selectDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  selectDotActive: { borderColor: GREEN },
  selectDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
});

// ── Cost summary card ─────────────────────────────────────────────────────────
function CostSummaryCard({ itinerary, numDays }: { itinerary: TripItineraryResponse; numDays: number }) {
  const cs = itinerary.cost_summary;
  return (
    <Card style={[styles.card, { borderWidth: 2, borderColor: GREEN }]}>
      <SectionTitle label="💰 Estimated Cost Summary" />

      <View style={csm.row}>
        <Text style={csm.label}>🏨 {cs.hotel_name}</Text>
      </View>
      <Text style={csm.sub}>
        PKR {cs.hotel_price_per_night.toLocaleString()}/night × {numDays} nights = <Text style={csm.amount}>PKR {cs.hotel_total.toLocaleString()}</Text>
      </Text>

      <View style={[csm.row, { marginTop: 12 }]}>
        <Text style={csm.label}>🚌 {cs.transport_name}</Text>
      </View>
      <Text style={csm.sub}>
        Total: <Text style={csm.amount}>PKR {cs.transport_total.toLocaleString()}</Text>
      </Text>

      <View style={csm.totalRow}>
        <Text style={csm.totalLabel}>TOTAL ESTIMATED COST</Text>
        <Text style={csm.totalValue}>PKR {cs.total_estimated_cost.toLocaleString()}</Text>
      </View>

      <View style={csm.disclaimer}>
        <Text style={csm.disclaimerIcon}>⚠️</Text>
        <Text style={csm.disclaimerText}>{cs.note}</Text>
      </View>
    </Card>
  );
}
const csm = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  sub: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4, lineHeight: 18 },
  amount: { fontWeight: '700', color: GREEN },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 2, borderTopColor: GREEN + '30' },
  totalLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: GREEN },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.warningLight, borderRadius: 10, padding: 12, marginTop: 14 },
  disclaimerIcon: { fontSize: 16, marginTop: 1 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#7C4700', lineHeight: 18, fontWeight: '500' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function GenerateItineraryScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // ── Phase ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');

  // ── Form state (Step 1) ───────────────────────────────────────────────
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [numDays, setNumDays] = useState(3);
  const [numTravelers, setNumTravelers] = useState(1);
  const [travelDate, setTravelDate] = useState<Date>(new Date());
  const [activityPreferences, setActivityPreferences] = useState<string[]>([]);

  useEffect(() => {
    const prefill = route?.params?.prefillDestination;
    if (prefill && typeof prefill === 'string') {
      setDestinationCity(prefill);
    }
  }, [route?.params?.prefillDestination]);

  const togglePreference = (key: string) => {
    setActivityPreferences((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ── Options state (Step 2) ────────────────────────────────────────────
  const [tripOptions, setTripOptions] = useState<TripOptionsResponse | null>(null);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
  const [selectedTransportIndex, setSelectedTransportIndex] = useState<number | null>(null);
  const [bookingFromCity, setBookingFromCity] = useState('');
  const [bookingToCity, setBookingToCity] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(false);

  // ── Itinerary state (Step 3) ──────────────────────────────────────────
  const [itinerary, setItinerary] = useState<TripItineraryResponse | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedTimelineDay, setExpandedTimelineDay] = useState<number | null>(null);
  const [eventsResult, setEventsResult] = useState<SerperSearchResult | null>(null);
  const [reviewsResult, setReviewsResult] = useState<SerperReviewsResult | null>(null);
  const [eventModalUrl, setEventModalUrl] = useState<string | null>(null);
  const [eventModalTitle, setEventModalTitle] = useState<string>('');
  const [reviewModalContent, setReviewModalContent] = useState<{ title?: string; snippet?: string; link?: string } | null>(null);

  // ── Save state ─────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dailyWeather, setDailyWeather] = useState<DailyWeatherDay[]>([]);
  const [weatherLocationLabel, setWeatherLocationLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupActions, setPopupActions] = useState<PopupAction[]>([]);

  const showPopup = (title: string, message: string, actions?: PopupAction[]) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupActions(
      actions && actions.length
        ? actions
        : [{ label: 'OK', variant: 'primary' }]
    );
    setPopupVisible(true);
  };

  const cityTheme = CITY_THEME[(destinationCity || '').trim().toLowerCase()] || {
    bg: '#123A2D',
    accent: '#D4AF37',
    emoji: '🧭',
  };

  // Fetch events (today/upcoming) and hotel reviews when itinerary is ready
  useEffect(() => {
    if (phase !== 'itinerary' || !itinerary || !destinationCity.trim()) return;
    const city = destinationCity.trim();
    const hotelName = itinerary.days?.[0]?.hotel?.trim() || '';
    setEventsResult(null);
    setReviewsResult(null);
    (async () => {
      try {
        const [events, reviews] = await Promise.all([
          fetchEventsAndFestivals(city),
          hotelName ? fetchReviewsForPlace(hotelName, city) : Promise.resolve({ reviews: [] as SerperReviewsResult['reviews'] }),
        ]);
        setEventsResult(events);
        setReviewsResult(reviews);
      } catch {
        setEventsResult({ organic: [] });
        setReviewsResult({ reviews: [] });
      }
    })();
  }, [phase, itinerary, destinationCity]);

  const formatDateForUrl = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTimelineDate = (date: Date, dayOffset: number): string => {
    const d = new Date(date);
    d.setDate(d.getDate() + dayOffset);
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${m}/${y}`;
  };

  const normalizeCityKey = (value: string): string =>
    value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const resolveClosestBusCity = useCallback((inputCity: string): string => {
    const trimmed = inputCity.trim();
    if (!trimmed) return BUS_CITIES[0];

    if (isCityInList(trimmed, BUS_CITIES)) return trimmed;

    const alias = BUS_CITY_ALIAS_MAP[trimmed.toUpperCase()];
    if (alias && isCityInList(alias, BUS_CITIES)) return alias;

    const normalizedInput = normalizeCityKey(trimmed);
    const startsWithMatch = BUS_CITIES.find(
      (city) => normalizeCityKey(city).startsWith(normalizedInput)
    );
    if (startsWithMatch) return startsWithMatch;

    const includesMatch = BUS_CITIES.find(
      (city) => normalizeCityKey(city).includes(normalizedInput) || normalizedInput.includes(normalizeCityKey(city))
    );
    if (includesMatch) return includesMatch;

    return BUS_CITIES[0];
  }, []);

  const busCities = BUS_CITIES;
  const busCityOptions = BUS_CITIES.map((city) => ({ label: city, value: city }));
  const trainCityOptions = TRAIN_CITIES.map((city) => ({ label: city, value: city }));

  const fetchDailyWeather = async (city: string, startDate: Date, days: number) => {
    const cleanCity = city.trim();
    if (!cleanCity) return;

    const safeDays = Math.max(1, Math.min(days, 14));
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + safeDays - 1);

    const startDateStr = formatDateForUrl(start);
    const endDateStr = formatDateForUrl(end);

    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`
    );
    const geoJson = await geo.json();
    const first = geoJson?.results?.[0];
    if (!first) {
      setDailyWeather([]);
      setWeatherLocationLabel(cleanCity);
      return;
    }

    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${startDateStr}&end_date=${endDateStr}`
    );
    const weatherJson = await weather.json();
    const daily = weatherJson?.daily;
    if (!daily?.time?.length) {
      setDailyWeather([]);
      setWeatherLocationLabel(first.name || cleanCity);
      return;
    }

    const rows: DailyWeatherDay[] = daily.time.map((date: string, i: number) => {
      const code = daily.weathercode?.[i];
      return {
        date,
        weather: WEATHER_CODE_LABELS[code] || 'Unknown',
        minTemp: typeof daily.temperature_2m_min?.[i] === 'number' ? daily.temperature_2m_min[i] : null,
        maxTemp: typeof daily.temperature_2m_max?.[i] === 'number' ? daily.temperature_2m_max[i] : null,
        rainChance:
          typeof daily.precipitation_probability_max?.[i] === 'number'
            ? daily.precipitation_probability_max[i]
            : null,
      };
    });

    setDailyWeather(rows);
    setWeatherLocationLabel(
      [first.name, first.country].filter(Boolean).join(', ') || cleanCity
    );
  };

  const getTransportRedirectUrl = (option: TransportOption): string => {
    const type = option.type.toLowerCase();
    const provider = option.provider.toLowerCase();
    const dateParam = formatDateForUrl(travelDate);
    const isBus = type.includes('bus');
    const fromRaw = bookingFromCity.trim() || originCity.trim() || 'Lahore';
    const toRaw = bookingToCity.trim() || destinationCity.trim() || 'Multan';
    const fromCity = isBus ? resolveClosestBusCity(fromRaw) : fromRaw;
    const toCity = isBus ? resolveClosestBusCity(toRaw) : toRaw;
    const from = encodeURIComponent(fromCity);
    const to = encodeURIComponent(toCity);

    if (type.includes('bus')) {
      return `https://bookkaru.com/bus/listing?from=${from}&to=${to}&date=${dateParam}`;
    }

    if (type.includes('train')) {
      return 'https://www.pakrailways.gov.pk/train';
    }

    if (type.includes('flight')) {
      return 'https://www.google.com/travel/flights';
    }

    if (type.includes('car') || type.includes('ride') || provider.includes('indrive')) {
      return 'https://indrive.com/';
    }

    // safe fallback (NOT inDrive)
    return 'https://www.google.com/travel';
  };

  const getSupportedCities = (option: TransportOption): string[] | null => {
    const type = option.type.toLowerCase();
    if (type.includes('bus')) return busCities;
    if (type.includes('train')) return TRAIN_CITIES;
    return null;
  };

  const handleOpenTransportWebsite = async (option: TransportOption) => {
    const supported = getSupportedCities(option);
    const isBus = option.type.toLowerCase().includes('bus');
    const selectedFrom = isBus
      ? resolveClosestBusCity(bookingFromCity.trim() || originCity.trim())
      : (bookingFromCity.trim() || originCity.trim());
    const selectedTo = isBus
      ? resolveClosestBusCity(bookingToCity.trim() || destinationCity.trim())
      : (bookingToCity.trim() || destinationCity.trim());

    if (supported) {
      if (!selectedFrom || !isCityInList(selectedFrom, supported)) {
        showPopup('Unsupported City', 'Please choose a supported departure city for this transport.');
        return;
      }
      if (!selectedTo || !isCityInList(selectedTo, supported)) {
        showPopup('Unsupported City', 'Please choose a supported destination city for this transport.');
        return;
      }
    }

    const url = getTransportRedirectUrl(option);
    await Linking.openURL(url);
  };

  const selectedTransportOption =
    tripOptions && selectedTransportIndex !== null
      ? tripOptions.transport_options[selectedTransportIndex]
      : null;

  useEffect(() => {
    if (!selectedTransportOption) return;
    const type = selectedTransportOption.type.toLowerCase();
    const supported = type.includes('bus')
      ? busCities
      : type.includes('train')
        ? TRAIN_CITIES
        : null;
    if (!supported) {
      setBookingFromCity(originCity.trim());
      setBookingToCity(destinationCity.trim());
      return;
    }

    const isBus = selectedTransportOption.type.toLowerCase().includes('bus');
    const nextFrom = isBus
      ? resolveClosestBusCity(originCity)
      : (isCityInList(originCity, supported) ? originCity.trim() : supported[0]);
    const nextTo = isBus
      ? resolveClosestBusCity(destinationCity)
      : (isCityInList(destinationCity, supported) ? destinationCity.trim() : supported[1] || supported[0]);
    setBookingFromCity(nextFrom);
    setBookingToCity(nextTo);
  }, [selectedTransportOption, originCity, destinationCity, busCities, resolveClosestBusCity]);

  const renderTransportBookingSection = () => {
    if (!selectedTransportOption) return null;

    const isBus = selectedTransportOption.type.toLowerCase().includes('bus');
    const isTrain = selectedTransportOption.type.toLowerCase().includes('train');

    return (
      <View style={styles.transportBookingSection}>
        {isBus ? (
          <>
            <Text style={styles.transportBookingTitle}>BookKaru Bus Cities</Text>
            <Select
              label="From (Bus)"
              value={bookingFromCity}
              options={busCityOptions}
              onValueChange={setBookingFromCity}
              placeholder="Select departure city"
              style={styles.inputSpacing}
            />
            <Select
              label="To (Bus)"
              value={bookingToCity}
              options={busCityOptions}
              onValueChange={setBookingToCity}
              placeholder="Select destination city"
            />
            <Text style={styles.transportBookingHint}>
              URL format: https://bookkaru.com/bus/listing?from=...&to=...&date=...
            </Text>
          </>
        ) : null}

        {isTrain ? (
          <>
            <Text style={styles.transportBookingTitle}>Pakistan Railways Train Cities</Text>
            <Select
              label="From (Train)"
              value={bookingFromCity}
              options={trainCityOptions}
              onValueChange={setBookingFromCity}
              placeholder="Select departure station"
              style={styles.inputSpacing}
            />
            <Select
              label="To (Train)"
              value={bookingToCity}
              options={trainCityOptions}
              onValueChange={setBookingToCity}
              placeholder="Select destination station"
            />
          </>
        ) : null}

        <TouchableOpacity
          style={styles.transportRedirectBtn}
          activeOpacity={0.8}
          onPress={() => handleOpenTransportWebsite(selectedTransportOption)}
        >
          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          <Text style={styles.transportRedirectBtnText}>Open Selected Transport Website</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getActivityMapUrl = (
    activity: string,
    index: number,
    locations?: { name: string; latitude: number; longitude: number; maps_url: string }[]
  ): string => {
    const normalizedActivity = activity.toLowerCase().trim();
    const byIndex = locations?.[index];
    const byName =
      locations?.find((loc) => normalizedActivity.includes(loc.name.toLowerCase()))
      || locations?.find((loc) => loc.name.toLowerCase().includes(normalizedActivity));
    const loc = byIndex || byName;

    if (loc?.maps_url) return loc.maps_url;
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    }
    if (loc?.name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.name}, Pakistan`)}`;
    }

    const extractPlaceQuery = (text: string): string => {
      const cleaned = text.replace(/\.\.\.+/g, ' ').replace(/\s+/g, ' ').trim();
      const byOf = cleaned.match(/\bof\s+([^,.;]+)/i);
      if (byOf?.[1]) return byOf[1].trim();
      const byAt = cleaned.match(/\bat\s+([^,.;]+)/i);
      if (byAt?.[1]) return byAt[1].trim();
      const byIn = cleaned.match(/\bin\s+([^,.;]+)/i);
      if (byIn?.[1]) return byIn[1].trim();
      const short = cleaned
        .replace(/^(relax|enjoy|explore|discover|visit|have|take|spend)\s+/i, '')
        .replace(/^(the|a|an)\s+/i, '')
        .trim();
      return short.split(/[,.]/)[0].trim();
    };

    const placeQuery = extractPlaceQuery(activity);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeQuery}, ${destinationCity}, Pakistan`)}`;
  };

  // ── Step 1 → Step 2: Fetch options ───────────────────────────────────
  const handleGetOptions = async () => {
    if (!originCity.trim()) {
      setError('Origin city is required');
      return;
    }

    if (!destinationCity.trim()) {
      setError('Destination city is required');
      return;
    }

    if (originCity.trim().toLowerCase() === destinationCity.trim().toLowerCase()) {
      setError('Origin and destination cities cannot be the same');
      return;
    }

    if (numDays < 1 || numDays > 30) {
      setError('Number of days must be 1–30');
      return;
    }

    setError(null);
    setOptionsLoading(true);
    try {
      const req: TripRequest = {
        origin: originCity.trim(),
        destination: destinationCity.trim(),
        num_days: numDays,
        num_travelers: numTravelers,
        activity_preferences: activityPreferences.length > 0 ? activityPreferences : undefined,
      };
      const options = await getTripOptions(req);
      setTripOptions(options);
      setSelectedHotelIndex(null);
      setSelectedTransportIndex(null);
      try {
        await fetchDailyWeather(destinationCity, travelDate, numDays);
      } catch {
        setDailyWeather([]);
        setWeatherLocationLabel(destinationCity.trim());
      }
      setPhase('selecting');
    } catch (err: any) {
      const msg = err.message || 'Could not fetch options. Check your connection.';
      setError(msg);
      showPopup('Error', msg);
    } finally {
      setOptionsLoading(false);
    }
  };

  // ── Step 2 → Step 3: Generate itinerary ──────────────────────────────
  const handleGenerateItinerary = async () => {
    if (selectedHotelIndex === null) { setError('Please select a hotel'); return; }
    if (selectedTransportIndex === null) { setError('Please select a transport option'); return; }
    if (!tripOptions) { setError('Missing options data. Please go back and try again.'); return; }
    setError(null);
    setItineraryLoading(true);
    try {
      const req = {
        trip_request: {
          origin: originCity.trim(),
          destination: destinationCity.trim(),
          num_days: numDays,
          num_travelers: numTravelers,
          activity_preferences: activityPreferences.length > 0 ? activityPreferences : undefined,
        },
        selected_hotel_index: selectedHotelIndex,
        selected_transport_index: selectedTransportIndex,
        hotel_options: tripOptions.hotel_options,
        transport_options: tripOptions.transport_options,
        activity_preferences: activityPreferences.length > 0 ? activityPreferences : undefined,
      };
      const result = await generateTripItinerary(req);
      setItinerary(result);
      const allExpanded: Record<number, boolean> = {};
      result.days.forEach((d) => { allExpanded[d.day_number] = true; });
      setExpandedDays(allExpanded);
      setPhase('itinerary');
      setSaved(false); // Reset save state for new itinerary
      showPopup(
        '🎉 Itinerary Ready!',
        `Your ${numDays}-day trip to ${destinationCity} is ready. Have a look at your generated itinerary and save it to My Trips!`,
      );
    } catch (err: any) {
      const msg = err.message || 'Failed to generate itinerary. Check your connection.';
      setError(msg);
      showPopup('Error', msg);
    } finally {
      setItineraryLoading(false);
    }
  };

  // ── Save itinerary ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!itinerary || saved) return;
    setSaving(true);
    try {
      await saveTripItinerary(
        {
          origin: originCity.trim(),
          destination: destinationCity.trim(),
          num_days: numDays,
          num_travelers: numTravelers,
          activity_preferences: activityPreferences.length > 0 ? activityPreferences : undefined,
        },
        itinerary
      );
      setSaved(true);
      showPopup(
        '✅ Trip Saved!',
        'Your itinerary has been saved. You can access it anytime from My Trips.',
        [
          { label: 'Stay Here', variant: 'secondary' },
          {
            label: 'View Saved Trips',
            variant: 'primary',
            onPress: () => (navigation as any).navigate('SavedItineraries'),
          },
        ]
      );
    } catch {
      showPopup('Error', 'Could not save the itinerary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper title="Plan Your Trip">
      <View style={styles.container}>
        <FallingLeaves />
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          key={phase}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            phase === 'itinerary' && styles.scrollContentItinerary,
            
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ════════════════════════════════════════════════
              PHASE 1 — Trip form
          ════════════════════════════════════════════════ */}
          {phase === 'form' && (
            <>
              <View style={styles.pageIntro}>
                <Text style={styles.pageTitle}>Plan Your Trip</Text>
                <Text style={styles.pageSubtitle}>
                  Enter your details — we&apos;ll show you hotel & transport options to choose from
                </Text>
              </View>

              {/* Origin & Destination */}
              <Card style={styles.card}>
                <SectionTitle label="🗺️ Where Are You Going?" />
                <Select
                  label="Origin City *"
                  value={originCity}
                  options={PAKISTANI_CITIES}
                  onValueChange={setOriginCity}
                  placeholder="Select your departure city"
                  style={styles.inputSpacing}
                  searchable
                  sortAlphabetically
                />
                <Select
                  label="Destination City *"
                  value={destinationCity}
                  options={PAKISTANI_CITIES}
                  onValueChange={setDestinationCity}
                  placeholder="Select your destination city"
                  searchable
                  sortAlphabetically
                />
              </Card>
        

              {/* Days & Travelers */}
              <Card style={styles.card}>
                <SectionTitle label="📅 Trip Details" />
                <Stepper label="Number of Days *" value={numDays} onValueChange={setNumDays} min={1} max={30} style={styles.inputSpacing} />
                <Stepper label="Number of Travelers" value={numTravelers} onValueChange={setNumTravelers} min={1} max={20} />
                <DatePicker
                  label="Travel Start Date *"
                  value={travelDate}
                  onValueChange={setTravelDate}
                  style={styles.inputSpacing}
                />
              </Card>

              {/* Activity Preferences */}
              <Card style={styles.card}>
                <SectionTitle label="🎯 Activity Preferences" />
                <Text style={styles.prefsSubtitle}>Choose the types of activities you enjoy (optional)</Text>
                <View style={styles.chipGrid}>
                  {ACTIVITY_TYPES.map((type) => {
                    const active = activityPreferences.includes(type.key);
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => togglePreference(type.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>

              {error && <ErrorBanner message={error} />}

              <Button
                title={optionsLoading ? 'Fetching options…' : 'Get Hotel & Transport Options →'}
                onPress={handleGetOptions}
                disabled={optionsLoading || !originCity.trim() || !destinationCity.trim()}
                loading={optionsLoading}
                size="lg"
                style={styles.generateButton}
              />
            </>
          )}

          {/* ════════════════════════════════════════════════
              PHASE 2 — Select hotel + transport
          ════════════════════════════════════════════════ */}
          {phase === 'selecting' && tripOptions && (
            <>
              <PhaseHeader
                phase={2}
                title="Choose Your Stay & Travel"
                subtitle={`${originCity} → ${destinationCity} · ${numDays} day${numDays !== 1 ? 's' : ''} · ${numTravelers} traveller${numTravelers !== 1 ? 's' : ''} · ${tripOptions.distance_km.toFixed(0)} km`}
                onBack={() => { setPhase('form'); setError(null); }}
              />

              <Card style={styles.card}>
                <SectionTitle label="🏨  Select a Hotel" />
                {tripOptions.hotel_options.map((hotel, i) => (
                  <HotelCard
                    key={i}
                    hotel={hotel}
                    selected={selectedHotelIndex === i}
                    onPress={() => setSelectedHotelIndex(i)}
                  />
                ))}
              </Card>

              <Card style={styles.card}>
                <SectionTitle label="🚌  Select Transport" />
                {tripOptions.transport_options.map((opt, i) => (
                  <TransportCard
                    key={i}
                    option={opt}
                    selected={selectedTransportIndex === i}
                    onPress={() => setSelectedTransportIndex(i)}
                  />
                ))}
                {selectedTransportIndex !== null ? renderTransportBookingSection() : null}
              </Card>

              <Card style={styles.card}>
                <SectionTitle label="🌤️ Daily Weather Forecast" />
                <Text style={styles.weatherSubtitle}>
                  {weatherLocationLabel ? `Forecast for ${weatherLocationLabel}` : 'Forecast'}
                </Text>
                {dailyWeather.length === 0 ? (
                  <Text style={styles.weatherEmptyText}>
                    Weather data is not available right now for the selected destination/date.
                  </Text>
                ) : (
                  dailyWeather.map((day, idx) => (
                    <View key={`${day.date}-${idx}`} style={styles.weatherRow}>
                      <Text style={styles.weatherDate}>{day.date}</Text>
                      <View style={styles.weatherMiddle}>
                        <Text style={styles.weatherCondition}>{day.weather}</Text>
                        <Text style={styles.weatherTemp}>
                          {day.minTemp ?? '-'}° / {day.maxTemp ?? '-'}°
                        </Text>
                      </View>
                      <Text style={styles.weatherRain}>
                        {day.rainChance ?? '-'}%
                      </Text>
                    </View>
                  ))
                )}
              </Card>

              {error && <ErrorBanner message={error} />}

              <Button
                title={itineraryLoading ? 'Generating your itinerary…' : 'Generate Itinerary →'}
                onPress={handleGenerateItinerary}
                disabled={itineraryLoading || selectedHotelIndex === null || selectedTransportIndex === null}
                loading={itineraryLoading}
                size="lg"
                style={styles.generateButton}
              />
            </>
          )}

          {/* ════════════════════════════════════════════════
              PHASE 3 — Cost summary + Itinerary
          ════════════════════════════════════════════════ */}
          {phase === 'itinerary' && itinerary && (
            <>
              {/* Hero: full-bleed image + "Trip to" + destination, back button (no top gap) */}
              <View style={[styles.heroWrapper, styles.heroWrapperNoGap]}>
                {itinerary.days[itinerary.days.length - 1]?.image_url ? (
                  <Image
                    source={{ uri: itinerary.days[itinerary.days.length - 1].image_url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.heroImagePlaceholder,
                      { backgroundColor: cityTheme.bg },
                    ]}
                  />
                )}

                <View style={styles.heroOverlay} />

                <TouchableOpacity
                  style={styles.heroBackBtn}
                  onPress={() => {
                    setPhase('selecting');
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={22} color="#333" />
                </TouchableOpacity>

                <View style={styles.heroTitleBlock}>
                  <Text style={styles.heroTripTo}>Trip to</Text>
                  <Text style={styles.heroDestination}>
                    {destinationCity || 'Your Destination'}
                  </Text>
                </View>
              </View>


              {/* Day-by-day plan */}
              {itinerary.days.map((day) => {
                const isExpanded = expandedDays[day.day_number] ?? true;
                return (
                  <Card key={day.day_number} style={styles.card}>
                    <TouchableOpacity
                      style={styles.dayHeaderRow}
                      activeOpacity={0.8}
                      onPress={() =>
                        setExpandedDays((prev) => ({ ...prev, [day.day_number]: !isExpanded }))
                      }
                    >
                      <Text style={styles.dayTitle}>{day.title}</Text>
                      <View style={styles.dayHeaderMeta}>
                        <Text style={styles.dayActivityCount}>{day.activities.length} stops</Text>
                        <Ionicons
                        
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>
                    {isExpanded ? (
                      <>
                        {day.image_url ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => Linking.openURL(day.image_url!)}
                          >
                            <Image
                              source={{ uri: day.image_url }}
                              style={styles.dayImage}
                              resizeMode="cover"
                            />
                            <Text style={styles.tapHint}>Tap image to view full size</Text>
                          </TouchableOpacity>
                        ) : null}
                        <Text style={styles.dayHotel}>🏨 Staying at: {day.hotel}</Text>
                        {day.activities.map((act, i) => {
                          const mapsUrl = getActivityMapUrl(act, i, day.activity_locations);
                          return (
                            <View key={i} style={styles.activityRow}>
                              <Text style={styles.activityBullet}>•</Text>
                              <Text style={[styles.activityText, { flex: 1 }]}>{act}</Text>
                              <TouchableOpacity
                                style={styles.mapBtn}
                                onPress={() => Linking.openURL(mapsUrl)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="location" size={16} color={GREEN} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </>
                    ) : (
                      <Text style={styles.dayCollapsedText}>Tap to expand day details.</Text>
                    )}
                  </Card>
                );
              })}

              <CostSummaryCard itinerary={itinerary} numDays={numDays} />
              {itinerary.weather_considerations ? (
                <WeatherCard weatherText={itinerary.weather_considerations} />
              ) : null}

              <Card style={styles.card}>
                <SectionTitle label="🌤️ Live weather forecast for the destination based on current data availability." />

                {dailyWeather.length === 0 ? (
                  <Text style={styles.weatherEmptyText}>
                    Weather data is not available right now for the selected destination/date.
                  </Text>
                ) : (
                  dailyWeather.map((day, idx) => (
                    <View key={`${day.date}-${idx}`} style={styles.weatherRow}>
                      <Text style={styles.weatherDate}>{day.date}</Text>
                      <View style={styles.weatherMiddle}>
                        <Text style={styles.weatherCondition}>{day.weather}</Text>
                        <Text style={styles.weatherTemp}>
                          {day.minTemp ?? '-'}° / {day.maxTemp ?? '-'}°
                        </Text>
                      </View>
                      <Text style={styles.weatherRain}>
                        {day.rainChance ?? '-'}%
                      </Text>
                    </View>
                  ))
                )}
              </Card>


              {/* Festivals & events — today/upcoming only; tap to open full post in modal */}
              <Card style={styles.card}>
                <SectionTitle label="🎉 Festivals & events (today & upcoming)" />
                {eventsResult === null ? (
                  <Text style={styles.emptyStateText}>Loading events…</Text>
                ) : (() => {
                  const upcoming = filterEventsToUpcomingOnly(eventsResult.organic ?? []);
                  return upcoming.length === 0 ? (
                    <Text style={styles.emptyStateText}>No upcoming festivals or events found for this destination.</Text>
                  ) : (
                    upcoming.slice(0, 8).map((item, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.eventRow, i === 0 && styles.eventRowFirst]}
                        onPress={() => {
                          if (item.link) {
                            setEventModalTitle(item.title);
                            setEventModalUrl(item.link);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.eventSnippet} numberOfLines={2}>{item.snippet}</Text>
                        <Text style={styles.eventReadMore}>Tap to read full post →</Text>
                      </TouchableOpacity>
                    ))
                  );
                })()}
              </Card>

              {/* Hotel reviews — tap to read full review (like festivals) */}
              <Card style={styles.card}>
                <SectionTitle label="⭐ Hotel reviews" />
                {reviewsResult === null ? (
                  <Text style={styles.emptyStateText}>Loading reviews…</Text>
                ) : (reviewsResult.reviews?.length ?? 0) === 0 ? (
                  <Text style={styles.emptyStateText}>No reviews found for your selected hotel. You can search online for more tips.</Text>
                ) : (
                  (reviewsResult.reviews ?? []).slice(0, 5).map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.reviewRow, i === 0 && styles.reviewRowFirst]}
                      onPress={() => setReviewModalContent({ title: r.title, snippet: r.snippet, link: r.link })}
                      activeOpacity={0.7}
                    >
                      {r.title ? <Text style={styles.reviewTitle} numberOfLines={1}>{r.title}</Text> : null}
                      <Text style={styles.reviewSnippet} numberOfLines={3}>{r.snippet}</Text>
                      <Text style={styles.reviewReadMore}>Tap to read full review →</Text>
                    </TouchableOpacity>
                  ))
                )}
              </Card>



              <View style={{ height: 90 }} />
            </>
          )}

          <View style={styles.footer} />
        </ScrollView>

        {/* ── Sticky Save Bar — only visible in Phase 3 ── */}
        {phase === 'itinerary' && itinerary && (
          <View style={styles.stickyBar}>
            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnSaved]}
              onPress={handleSave}
              disabled={saving || saved}
              activeOpacity={0.8}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'bookmark-outline'}
                size={22}
                color="#FFFFFF"
              />
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving…' : saved ? 'Saved to My Trips ✓' : 'Save This Itinerary'}
              </Text>
            </TouchableOpacity>
            {saved && (
              <TouchableOpacity
                style={styles.viewSavedLink}
                onPress={() => (navigation as any).navigate('SavedItineraries')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewSavedLinkText}>View My Saved Trips →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Modal
          visible={popupVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPopupVisible(false)}
        >
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>{popupTitle}</Text>
              <Text style={styles.popupMessage}>{popupMessage}</Text>

              <View style={styles.popupActionsRow}>
                {popupActions.map((action, idx) => {
                  const isPrimary = (action.variant || 'primary') === 'primary';
                  return (
                    <TouchableOpacity
                      key={`${action.label}-${idx}`}
                      style={[styles.popupBtn, isPrimary ? styles.popupBtnPrimary : styles.popupBtnSecondary]}
                      onPress={() => {
                        setPopupVisible(false);
                        action.onPress?.();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.popupBtnText, isPrimary ? styles.popupBtnTextPrimary : styles.popupBtnTextSecondary]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Full post modal — event/festival link in WebView */}
        <Modal
          visible={!!eventModalUrl}
          animationType="slide"
          onRequestClose={() => { setEventModalUrl(null); setEventModalTitle(''); }}
        >
          <View style={styles.eventModalRoot}>
            <View style={styles.eventModalHeader}>
              <Text style={styles.eventModalTitle} numberOfLines={1}>{eventModalTitle}</Text>
              <TouchableOpacity
                style={styles.eventModalClose}
                onPress={() => { setEventModalUrl(null); setEventModalTitle(''); }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {eventModalUrl ? (
              <WebView
                source={{ uri: eventModalUrl }}
                style={styles.eventModalWebView}
                startInLoadingState
                scalesPageToFit
              />
            ) : null}
          </View>
        </Modal>

        {/* Full review modal — WebView if link, else full snippet */}
        <Modal
          visible={!!reviewModalContent}
          animationType="slide"
          onRequestClose={() => setReviewModalContent(null)}
        >
          <View style={styles.eventModalRoot}>
            <View style={styles.eventModalHeader}>
              <Text style={styles.eventModalTitle} numberOfLines={1}>
                {reviewModalContent?.title || 'Hotel review'}
              </Text>
              <TouchableOpacity
                style={styles.eventModalClose}
                onPress={() => setReviewModalContent(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {reviewModalContent?.link ? (
              <WebView
                source={{ uri: reviewModalContent.link }}
                style={styles.eventModalWebView}
                startInLoadingState
                scalesPageToFit
              />
            ) : (
              <ScrollView
                style={styles.reviewModalScroll}
                contentContainerStyle={styles.reviewModalContent}
                showsVerticalScrollIndicator={true}
              >
                {reviewModalContent?.title ? (
                  <Text style={styles.reviewModalFullTitle}>{reviewModalContent.title}</Text>
                ) : null}
                <Text style={styles.reviewModalFullSnippet}>
                  {reviewModalContent?.snippet || 'No review text available.'}
                </Text>
              </ScrollView>
            )}
          </View>
        </Modal>

        {optionsLoading && <Loader overlay />}
        {itineraryLoading && (
          <ItineraryLoadingScreen visible={true} destination={destinationCity || 'your destination'} />
        )}
        </KeyboardAvoidingView>
      </View>

      {/* Floating ChatBot — visible only in Phase 3 with itinerary context */}
      {phase === 'itinerary' && itinerary && (
        <FloatingChatBot
          fabBottomOffset={phase === 'itinerary' ? 120 : 20}
          rawContext={{
            destination: destinationCity,
            origin: originCity,
            num_days: numDays,
            num_travelers: numTravelers,
            cost_summary: itinerary.cost_summary,
            days: itinerary.days.map((d) => ({
              day: d.day_number,
              title: d.title,
              activities: d.activities,
              hotel: d.hotel,
            })),
            weather_considerations: itinerary.weather_considerations,
          }}
        />
      )}
    </ScreenWrapper>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────
function SectionTitle({ label }: { label: string }) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={styles.cardTitleAccent} />
      <Text style={styles.cardTitle}>{label}</Text>
    </View>
  );
}

function PhaseHeader({ phase, title, subtitle, onBack }: {
  phase: number; title: string; subtitle: string; onBack: () => void;
}) {
  return (
    <View style={ph.wrapper}>
      <TouchableOpacity onPress={onBack} style={ph.backBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={18} color={GREEN} />
        <Text style={ph.backText}>Back</Text>
      </TouchableOpacity>
      <View style={ph.badge}><Text style={ph.badgeText}>Step {phase} of 3</Text></View>
      <Text style={ph.title}>{title}</Text>
      <Text style={ph.subtitle}>{subtitle}</Text>
    </View>
  );
}
const ph = StyleSheet.create({
  wrapper: { marginBottom: 20, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 14, color: GREEN, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', backgroundColor: GREEN + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: GREEN },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.card, styles.errorCard]}>
      <Text style={styles.errorText}>⚠️  {message}</Text>
    </View>
  );
}

// ── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12, paddingBottom: 40 },
  scrollContentItinerary: { paddingTop: 0, paddingBottom: 40 },

  pageIntro: { marginBottom: 20, marginTop: 4 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },

  card: {
    padding: 20, marginBottom: 16, borderRadius: 16, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cardTitleAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: GREEN },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },

  inputSpacing: { marginBottom: 16 },

  heroWrapper: {
    marginHorizontal: -16,
    marginTop: 0,
    marginBottom: 0,
    height: 200,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  } as any,
  heroWrapperNoGap: { marginTop: -2 } as any,
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' } as any,
  heroImagePlaceholder: { ...StyleSheet.absoluteFillObject } as any,
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  } as any,
  heroBackBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  } as any,
  heroTitleBlock: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  } as any,
  heroTripTo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  } as any,
  heroDestination: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  } as any,
  tripDetailsCard: {
    marginTop: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    marginBottom: 20,
  } as any,
  tripDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  } as any,
  tripDetailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  } as any,
  tripDetailsDuration: {},
  tripDetailsDurationText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  } as any,
  timeline: {},
  timelineRowWrap: {
    marginBottom: 20,
  } as any,
  timelineRow: {
    flexDirection: 'row',
  } as any,
  timelineLeft: {
    width: 56,
    alignItems: 'center',
  } as any,
  timelineDate: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  } as any,
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E0',
  } as any,
  timelineDotActive: {
    backgroundColor: GREEN,
  } as any,
  timelineLine: {
    position: 'absolute',
    top: 22,
    left: 27,
    width: 2,
    bottom: -20,
    backgroundColor: '#E2E8F0',
  } as any,
  timelineRight: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  } as any,
  timelineThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
  } as any,
  timelineThumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  timelineThumbEmoji: { fontSize: 28 } as any,
  timelineBody: { flex: 1, justifyContent: 'center' } as any,
  timelinePlaceName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  } as any,
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  } as any,
  timelineLocation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  } as any,
  timelineDistance: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
  } as any,
  timelineExpandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  } as any,
  timelineExpandHintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  } as any,
  timelineDayPlan: {
    marginTop: 12,
    marginLeft: 56,
    paddingTop: 12,
    paddingLeft: 12,
    paddingBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  } as any,
  timelineDayPlanHotel: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
    marginBottom: 10,
  } as any,
  timelineDayPlanActivity: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  } as any,
  timelineDayPlanBullet: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '700',
  } as any,
  timelineDayPlanText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  } as any,
  timelineMapBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN + '15',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  emptyStateText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  } as any,
  eventRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  } as any,
  eventRowFirst: { borderTopWidth: 0 } as any,
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  } as any,
  eventSnippet: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  } as any,
  eventReadMore: {
    fontSize: 11,
    color: GREEN,
    fontWeight: '600',
    marginTop: 6,
  } as any,
  eventModalRoot: { flex: 1, backgroundColor: '#FFF' } as any,
  eventModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FFF',
  } as any,
  eventModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginRight: 12,
  } as any,
  eventModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  eventModalWebView: { flex: 1 } as any,
  reviewRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  } as any,
  reviewRowFirst: { borderTopWidth: 0 } as any,
  reviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  } as any,
  reviewSnippet: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  } as any,
  reviewReadMore: {
    fontSize: 11,
    color: GREEN,
    fontWeight: '600',
    marginTop: 6,
  } as any,
  reviewModalScroll: { flex: 1 } as any,
  reviewModalContent: {
    padding: 20,
    paddingBottom: 40,
  } as any,
  reviewModalFullTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  } as any,
  reviewModalFullSnippet: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  } as any,
  reviewModalOpenLink: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  } as any,
  reviewModalOpenLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN,
  } as any,

  dynamicHero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  } as any,
  dynamicHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  } as any,
  dynamicHeroEmoji: {
    fontSize: 26,
  } as any,
  dynamicHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  } as any,
  dynamicHeroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as any,
  dynamicChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  } as any,
  dynamicChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2B2100',
  } as any,

  transportBookingSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  } as any,
  transportBookingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  } as any,
  transportBookingHint: {
    marginTop: 8,
    fontSize: 11,
    color: theme.colors.textSecondary,
  } as any,

  transportRedirectBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as any,
  transportRedirectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  } as any,

  weatherSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  } as any,
  weatherEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  } as any,
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  } as any,
  weatherDate: {
    width: 96,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  } as any,
  weatherMiddle: {
    flex: 1,
    paddingHorizontal: 8,
  } as any,
  weatherCondition: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  } as any,
  weatherTemp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  } as any,
  weatherRain: {
    width: 56,
    textAlign: 'right',
    fontSize: 12,
    color: GREEN,
    fontWeight: '700',
  } as any,

  // Day plan
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  } as any,
  dayHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  dayActivityCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  } as any,
  dayCollapsedText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  } as any,
  dayTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  dayImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 4 } as any,
  tapHint: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 10 } as any,
  dayHotel: { fontSize: 12, color: GREEN, fontWeight: '600', marginBottom: 12 },
  activityRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  activityBullet: { fontSize: 14, color: GREEN, fontWeight: '700', marginTop: 1 },
  activityText: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, lineHeight: 20 },

  // Map button
  mapBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  } as any,

  // Activity preference chips
  prefsSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 17 } as any,
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as any,
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  } as any,
  chipActive: {
    backgroundColor: GREEN + '15',
    borderColor: GREEN,
  } as any,
  chipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' } as any,
  chipTextActive: { color: GREEN, fontWeight: '600' } as any,

  errorCard: { backgroundColor: theme.colors.errorLight, borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 14, lineHeight: 20 },
  generateButton: { marginTop: 4, marginBottom: 8, borderRadius: 14 },

  // Sticky save bar
  stickyBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 } as any),
  } as any,

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 } as any),
  } as any,
  saveBtnSaved: {
    backgroundColor: GREEN,
  } as any,
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  } as any,

  // Post-save link
  viewSavedLink: {
    alignItems: 'center',
    marginTop: 8,
  } as any,
  viewSavedLinkText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '600',
  } as any,

  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  } as any,
  popupCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as any,
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  } as any,
  popupMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  } as any,
  popupActionsRow: {
    flexDirection: 'row',
    gap: 10,
  } as any,
  popupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  } as any,
  popupBtnPrimary: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  } as any,
  popupBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.border,
  } as any,
  popupBtnText: {
    fontSize: 14,
    fontWeight: '700',
  } as any,
  popupBtnTextPrimary: {
    color: '#FFFFFF',
  } as any,
  popupBtnTextSecondary: {
    color: theme.colors.textPrimary,
  } as any,

  footer: { height: 16 },
});

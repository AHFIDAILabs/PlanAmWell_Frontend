import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Location from "expo-location";
import { AppStackParamList } from "../../types/App";
import { IClinic } from "../../types/backendType";
import { fetchNearbyClinics, fetchClinicsByCity } from "../../services/Clinic";
import BottomBar from "../../components/common/BottomBar";

type Nav = StackNavigationProp<AppStackParamList>;

// ─── Constants ────────────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [
  { label: "2 km", value: 2_000 },
  { label: "5 km", value: 5_000 },
  { label: "10 km", value: 10_000 },
  { label: "20 km", value: 20_000 },
];

const TYPE_FILTERS = [
  { label: "All Types", value: "" },
  { label: "Hospital", value: "hospital" },
  { label: "Clinic", value: "clinic" },
  { label: "Private", value: "private" },
  { label: "Public", value: "public" },
  { label: "NGO", value: "NGO" },
];

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan",
  "Benin City", "Enugu", "Kaduna", "Owerri", "Calabar",
  "Uyo", "Warri", "Jos", "Maiduguri", "Onitsha", "Aba",
  "Abeokuta", "Akure", "Ilorin", "Sokoto",
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  public:  { bg: "#DBEAFE", text: "#1D4ED8" },
  private: { bg: "#F3E8FF", text: "#7C3AED" },
  NGO:     { bg: "#D1FAE5", text: "#065F46" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function typeColor(type?: string) {
  return type && TYPE_COLORS[type]
    ? TYPE_COLORS[type]
    : { bg: "#F3F4F6", text: "#6B7280" };
}

function clinicLabel(amenity?: string): string {
  const map: Record<string, string> = {
    hospital: "Hospital",
    clinic: "Clinic",
    doctors: "Doctor's Office",
    health_post: "Health Post",
    healthcare_centre: "Health Centre",
    maternity: "Maternity",
  };
  return amenity ? (map[amenity] ?? "Clinic") : "Clinic";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FindAClinicScreen() {
  const navigation = useNavigation<Nav>();

  // Location
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "pending">("pending");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Data
  const [clinics, setClinics] = useState<IClinic[]>([]);
  const [filtered, setFiltered] = useState<IClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search mode
  const [mode, setMode] = useState<"gps" | "city">("gps");
  const [cityInput, setCityInput] = useState("");
  const [filterText, setFilterText] = useState("");
  const [activeType, setActiveType] = useState("");
  const [radius, setRadius] = useState(5_000);

  const cityTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Location permission ────────────────────────────────────────────

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationPermission("denied");
        setMode("city");
        setLoading(false);
        return;
      }
      setLocationPermission("granted");
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserCoords(coords);
      setMode("gps");
      await loadNearby(coords, radius);
    } catch {
      setError("Could not get your location. Try searching by city instead.");
      setLocationPermission("denied");
      setMode("city");
      setLoading(false);
    }
  }, [radius]);

  useEffect(() => {
    requestLocation();
  }, []);

  // ── Data loading ───────────────────────────────────────────────────

  const loadNearby = async (
    coords: { lat: number; lng: number },
    r: number
  ) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNearbyClinics(coords.lat, coords.lng, r);
      const sorted = [...data].sort((a, b) => {
        const da = a.coordinates
          ? haversineKm(coords.lat, coords.lng, a.coordinates.latitude, a.coordinates.longitude)
          : 999;
        const db = b.coordinates
          ? haversineKm(coords.lat, coords.lng, b.coordinates.latitude, b.coordinates.longitude)
          : 999;
        return da - db;
      });
      setClinics(sorted);
    } catch {
      setError("Failed to load clinics. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadByCity = async (city: string) => {
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    setClinics([]);
    try {
      const data = await fetchClinicsByCity(city.trim());
      setClinics(data);
      if (data.length === 0) setError(`No clinics found in "${city}". Try a different city.`);
    } catch {
      setError("Search failed. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Filter clinics client-side ─────────────────────────────────────

  useEffect(() => {
    let result = clinics;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.specialties?.some((s) => s.toLowerCase().includes(q)) ||
          c.city?.toLowerCase().includes(q)
      );
    }
    if (activeType) {
      result = result.filter(
        (c) =>
          c.type === activeType ||
          c.amenity === activeType
      );
    }
    setFiltered(result);
  }, [clinics, filterText, activeType]);

  // ── Handlers ──────────────────────────────────────────────────────

  const onRadiusChange = async (r: number) => {
    setRadius(r);
    if (mode === "gps" && userCoords) {
      await loadNearby(userCoords, r);
    }
  };

  const onCityInputChange = (text: string) => {
    setCityInput(text);
    if (cityTimeout.current) clearTimeout(cityTimeout.current);
    if (text.trim().length >= 3) {
      cityTimeout.current = setTimeout(() => loadByCity(text), 700);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (mode === "gps" && userCoords) {
      loadNearby(userCoords, radius);
    } else if (cityInput.trim()) {
      loadByCity(cityInput);
    } else {
      setRefreshing(false);
    }
  };

  const callClinic = (phone: string) => Linking.openURL(`tel:${phone}`);

  // ── Render ────────────────────────────────────────────────────────

  const renderClinic = ({ item }: { item: IClinic }) => {
    const tc = typeColor(item.type);
    const dist =
      userCoords && item.coordinates
        ? haversineKm(
            userCoords.lat, userCoords.lng,
            item.coordinates.latitude, item.coordinates.longitude
          )
        : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ClinicDetailScreen", { clinic: item })}
      >
        {/* Left: icon block */}
        <View style={styles.cardIconBlock}>
          <Ionicons
            name={item.amenity === "hospital" ? "medkit" : "medical"}
            size={26}
            color="#D81E5B"
          />
          {item.emergency && (
            <View style={styles.emergencyDot}>
              <Text style={styles.emergencyDotText}>24h</Text>
            </View>
          )}
        </View>

        {/* Right: details */}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.clinicName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.type && (
              <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                <Text style={[styles.typeText, { color: tc.text }]}>
                  {item.type === "NGO" ? "NGO" : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.amenityRow}>
            <Ionicons name="business-outline" size={12} color="#9CA3AF" />
            <Text style={styles.amenityText}>{clinicLabel(item.amenity)}</Text>
            {dist !== null && (
              <>
                <View style={styles.dot} />
                <Ionicons name="navigate-outline" size={12} color="#9CA3AF" />
                <Text style={styles.distanceText}>{formatDistance(dist)}</Text>
              </>
            )}
          </View>

          {(item.address || item.city) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#9CA3AF" />
              <Text style={styles.locationText} numberOfLines={1}>
                {[item.address, item.city, item.state].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {item.specialties && item.specialties.length > 0 && (
            <View style={styles.tagsRow}>
              {item.specialties.slice(0, 2).map((s, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))}
              {item.specialties.length > 2 && (
                <Text style={styles.moreText}>+{item.specialties.length - 2}</Text>
              )}
            </View>
          )}

          {item.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => callClinic(item.phone!)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="call" size={12} color="#D81E5B" />
              <Text style={styles.callBtnText}>{item.phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={56} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>
          {error || "No clinics found"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {mode === "gps"
            ? "Try expanding the search radius or switch to city search."
            : "Check the city name and try again."}
        </Text>
        {mode === "gps" && radius < 20_000 && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => onRadiusChange(20_000)}
          >
            <Text style={styles.expandBtnText}>Search within 20 km</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={["#D81E5B", "#FF4D80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Find a Clinic</Text>
          <Text style={styles.headerSub}>
            {locationPermission === "granted" && mode === "gps"
              ? "Real hospitals near you · OpenStreetMap"
              : "Search by city · OpenStreetMap"}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "gps" && styles.modeBtnActive]}
          onPress={() => {
            setMode("gps");
            if (userCoords) loadNearby(userCoords, radius);
            else requestLocation();
          }}
        >
          <Ionicons
            name="navigate"
            size={14}
            color={mode === "gps" ? "#fff" : "#D81E5B"}
          />
          <Text style={[styles.modeBtnText, mode === "gps" && styles.modeBtnTextActive]}>
            Near Me
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mode === "city" && styles.modeBtnActive]}
          onPress={() => setMode("city")}
        >
          <Ionicons
            name="search"
            size={14}
            color={mode === "city" ? "#fff" : "#D81E5B"}
          />
          <Text style={[styles.modeBtnText, mode === "city" && styles.modeBtnTextActive]}>
            By City
          </Text>
        </TouchableOpacity>
      </View>

      {/* GPS radius selector */}
      {mode === "gps" && locationPermission === "granted" && (
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, radius === r.value && styles.chipActive]}
                onPress={() => onRadiusChange(r.value)}
              >
                <Text style={[styles.chipText, radius === r.value && styles.chipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* City search input */}
      {mode === "city" && (
        <View style={styles.citySearchContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.cityInput}
            placeholder="Enter a city, e.g. Lagos, Abuja, Kano..."
            placeholderTextColor="#9CA3AF"
            value={cityInput}
            onChangeText={onCityInputChange}
            returnKeyType="search"
            onSubmitEditing={() => loadByCity(cityInput)}
            autoFocus
          />
          {cityInput.length > 0 && (
            <TouchableOpacity onPress={() => { setCityInput(""); setClinics([]); setError(""); }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* City quick picks */}
      {mode === "city" && !cityInput && (
        <View style={styles.quickCitiesSection}>
          <Text style={styles.quickCitiesLabel}>Popular cities</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {NIGERIAN_CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.cityChip}
                onPress={() => { setCityInput(city); loadByCity(city); }}
              >
                <Text style={styles.cityChipText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Client-side filter + type chips (shown when results exist) */}
      {clinics.length > 0 && (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="filter-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by name or specialty..."
              placeholderTextColor="#9CA3AF"
              value={filterText}
              onChangeText={setFilterText}
            />
            {filterText.length > 0 && (
              <TouchableOpacity onPress={() => setFilterText("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            >
              {TYPE_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.chip, activeType === f.value && styles.chipActive]}
                  onPress={() => setActiveType(f.value)}
                >
                  <Text style={[styles.chipText, activeType === f.value && styles.chipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* Results count */}
      {!loading && filtered.length > 0 && (
        <Text style={styles.resultCount}>
          {filtered.length} clinic{filtered.length !== 1 ? "s" : ""} found
          {mode === "gps" && ` within ${RADIUS_OPTIONS.find((r) => r.value === radius)?.label}`}
        </Text>
      )}

      {/* Main list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D81E5B" />
          <Text style={styles.loadingTitle}>
            {mode === "gps" ? "Finding nearby clinics..." : `Searching in ${cityInput}...`}
          </Text>
          <Text style={styles.loadingSub}>Fetching real data from OpenStreetMap</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderClinic}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D81E5B" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Location denied banner */}
      {locationPermission === "denied" && mode === "gps" && (
        <View style={styles.permissionBanner}>
          <Ionicons name="location-outline" size={16} color="#92400E" />
          <Text style={styles.permissionText}>
            Location access denied. Switch to city search or{" "}
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.permissionLink}>open settings</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomBar activeRoute="FindAClinicScreen" cartItemCount={0} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  modeRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D81E5B",
  },
  modeBtnActive: { backgroundColor: "#D81E5B" },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: "#D81E5B" },
  modeBtnTextActive: { color: "#fff" },

  citySearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  cityInput: { flex: 1, fontSize: 14, color: "#111827" },

  quickCitiesSection: { paddingHorizontal: 16, marginTop: 14 },
  quickCitiesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cityChipText: { fontSize: 13, color: "#374151", fontWeight: "500" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#111827" },

  filterRow: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#D81E5B", borderColor: "#D81E5B" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#fff" },

  resultCount: {
    fontSize: 12,
    color: "#9CA3AF",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },
  cardIconBlock: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF1F5",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  emergencyDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  emergencyDotText: { fontSize: 7, color: "#fff", fontWeight: "800" },

  cardBody: { flex: 1, gap: 4 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  clinicName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  typeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  amenityText: { fontSize: 11, color: "#9CA3AF" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" },
  distanceText: { fontSize: 11, color: "#D81E5B", fontWeight: "600" },

  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, color: "#6B7280", flex: 1 },

  tagsRow: { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 2 },
  tag: {
    backgroundColor: "#FFF1F5",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: "#D81E5B", fontWeight: "600" },
  moreText: { fontSize: 10, color: "#9CA3AF", alignSelf: "center" },

  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  callBtnText: { fontSize: 12, color: "#D81E5B", fontWeight: "600" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingBottom: 80,
  },
  loadingTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  loadingSub: { fontSize: 12, color: "#9CA3AF" },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  expandBtn: {
    marginTop: 8,
    backgroundColor: "#D81E5B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  expandBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  permissionBanner: {
    position: "absolute",
    bottom: 70,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  permissionText: { fontSize: 12, color: "#92400E", flex: 1, flexWrap: "wrap" },
  permissionLink: { fontSize: 12, color: "#D81E5B", fontWeight: "700" },
});

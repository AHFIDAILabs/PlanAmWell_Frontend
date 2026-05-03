import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";
import { IClinic } from "../../types/backendType";

type RouteType = RouteProp<AppStackParamList, "ClinicDetailScreen">;
type Nav = StackNavigationProp<AppStackParamList>;

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  public:  { bg: "#DBEAFE", text: "#1D4ED8" },
  private: { bg: "#F3E8FF", text: "#7C3AED" },
  NGO:     { bg: "#D1FAE5", text: "#065F46" },
};

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

export default function ClinicDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const clinic = route.params.clinic;

  const callClinic = () => {
    if (clinic.phone) Linking.openURL(`tel:${clinic.phone}`);
  };

  const emailClinic = () => {
    if (clinic.email) Linking.openURL(`mailto:${clinic.email}`);
  };

  const openWebsite = () => {
    if (!clinic.website) return;
    const url = clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`;
    Linking.openURL(url);
  };

  const openDirections = () => {
    const { coordinates, address, city, state } = clinic;

    let url: string;
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      url = Platform.OS === "ios"
        ? `maps://?q=${encodeURIComponent(clinic.name)}&ll=${latitude},${longitude}`
        : `geo:${latitude},${longitude}?q=${encodeURIComponent(clinic.name)}`;
    } else {
      const query = encodeURIComponent([address, city, state].filter(Boolean).join(", "));
      url = Platform.OS === "ios"
        ? `maps://?q=${query}`
        : `geo:0,0?q=${query}`;
    }
    Linking.openURL(url);
  };

  const openInMaps = () => {
    if (!clinic.coordinates) return;
    const { latitude, longitude } = clinic.coordinates;
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
    );
  };

  const shareClinic = async () => {
    await Share.share({
      title: clinic.name,
      message: [
        clinic.name,
        clinicLabel(clinic.amenity),
        [clinic.address, clinic.city, clinic.state].filter(Boolean).join(", "),
        clinic.phone ?? "",
      ].filter(Boolean).join("\n"),
    });
  };

  const tc = clinic.type ? TYPE_COLORS[clinic.type] : null;
  const fullAddress = [clinic.address, clinic.lga, clinic.city, clinic.state]
    .filter(Boolean)
    .join(", ");
  const hasContact = clinic.phone || clinic.email || clinic.website;
  const hasCoordinates = !!clinic.coordinates;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Floating header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.floatingBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={shareClinic}>
          <Ionicons name="share-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero gradient banner (no image for OSM data) */}
        <LinearGradient
          colors={["#D81E5B", "#FF4D80"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconCircle}>
            <Ionicons
              name={clinic.amenity === "hospital" ? "medkit" : "medical"}
              size={40}
              color="#D81E5B"
            />
          </View>

          {tc && (
            <View style={[styles.heroBadge, { backgroundColor: tc.bg }]}>
              <Text style={[styles.heroBadgeText, { color: tc.text }]}>
                {clinic.type === "NGO" ? "NGO" : clinic.type!.charAt(0).toUpperCase() + clinic.type!.slice(1)}
              </Text>
            </View>
          )}

          {clinic.emergency && (
            <View style={styles.emergencyBadge}>
              <Ionicons name="flash" size={10} color="#fff" />
              <Text style={styles.emergencyText}>24h Emergency</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {/* Name + amenity type */}
          <Text style={styles.clinicName}>{clinic.name}</Text>
          <Text style={styles.clinicType}>{clinicLabel(clinic.amenity)}</Text>

          {/* Source badge */}
          {clinic.source === "openstreetmap" && (
            <View style={styles.sourceBadge}>
              <Ionicons name="globe-outline" size={11} color="#059669" />
              <Text style={styles.sourceText}>Live data from OpenStreetMap</Text>
            </View>
          )}

          {/* Quick action buttons */}
          <View style={styles.quickActions}>
            {clinic.phone && (
              <ActionButton
                icon="call"
                label="Call"
                color="#D81E5B"
                bg="#FFF1F5"
                onPress={callClinic}
              />
            )}
            {clinic.email && (
              <ActionButton
                icon="mail"
                label="Email"
                color="#2563EB"
                bg="#EFF6FF"
                onPress={emailClinic}
              />
            )}
            {(fullAddress || hasCoordinates) && (
              <ActionButton
                icon="navigate"
                label="Directions"
                color="#059669"
                bg="#ECFDF5"
                onPress={openDirections}
              />
            )}
            {hasCoordinates && (
              <ActionButton
                icon="map"
                label="Map"
                color="#7C3AED"
                bg="#F5F3FF"
                onPress={openInMaps}
              />
            )}
            {clinic.website && (
              <ActionButton
                icon="globe-outline"
                label="Website"
                color="#D97706"
                bg="#FFFBEB"
                onPress={openWebsite}
              />
            )}
          </View>

          {/* Address */}
          {fullAddress && (
            <InfoCard icon="location" iconColor="#D81E5B" title="Address">
              <Text style={styles.infoText}>{fullAddress}</Text>
              <TouchableOpacity onPress={openDirections} style={styles.linkRow}>
                <Text style={styles.linkText}>Get directions</Text>
                <Ionicons name="chevron-forward" size={13} color="#D81E5B" />
              </TouchableOpacity>
              {hasCoordinates && (
                <TouchableOpacity onPress={openInMaps} style={[styles.linkRow, { marginTop: 4 }]}>
                  <Text style={styles.linkText}>View on OpenStreetMap</Text>
                  <Ionicons name="chevron-forward" size={13} color="#D81E5B" />
                </TouchableOpacity>
              )}
            </InfoCard>
          )}

          {/* Contact */}
          {hasContact && (
            <InfoCard icon="call" iconColor="#2563EB" title="Contact">
              {clinic.phone && (
                <TouchableOpacity style={styles.contactRow} onPress={callClinic}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.contactText}>{clinic.phone}</Text>
                </TouchableOpacity>
              )}
              {clinic.email && (
                <TouchableOpacity style={styles.contactRow} onPress={emailClinic}>
                  <Ionicons name="mail-outline" size={16} color="#6B7280" />
                  <Text style={styles.contactText}>{clinic.email}</Text>
                </TouchableOpacity>
              )}
              {clinic.website && (
                <TouchableOpacity style={styles.contactRow} onPress={openWebsite}>
                  <Ionicons name="globe-outline" size={16} color="#6B7280" />
                  <Text style={[styles.contactText, { color: "#2563EB" }]} numberOfLines={1}>
                    {clinic.website}
                  </Text>
                </TouchableOpacity>
              )}
            </InfoCard>
          )}

          {/* Opening hours */}
          {clinic.openingHours && (
            <InfoCard icon="time" iconColor="#059669" title="Opening Hours">
              <View style={styles.contactRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.infoText}>{clinic.openingHours}</Text>
              </View>
            </InfoCard>
          )}

          {/* Specialties */}
          {clinic.specialties && clinic.specialties.length > 0 && (
            <InfoCard icon="ribbon" iconColor="#7C3AED" title="Specialties">
              <View style={styles.pillWrap}>
                {clinic.specialties.map((s, i) => (
                  <View key={i} style={[styles.pill, { backgroundColor: "#F5F3FF" }]}>
                    <Text style={[styles.pillText, { color: "#7C3AED" }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          )}

          {/* Services */}
          {clinic.services && clinic.services.length > 0 && (
            <InfoCard icon="medkit" iconColor="#D81E5B" title="Services">
              <View style={styles.pillWrap}>
                {clinic.services.map((s, i) => (
                  <View key={i} style={[styles.pill, { backgroundColor: "#FFF1F5" }]}>
                    <Text style={[styles.pillText, { color: "#D81E5B" }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          )}

          {/* Coordinates (for completeness) */}
          {clinic.coordinates && (
            <InfoCard icon="locate" iconColor="#6B7280" title="Coordinates">
              <Text style={[styles.infoText, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }]}>
                {clinic.coordinates.latitude.toFixed(5)}, {clinic.coordinates.longitude.toFixed(5)}
              </Text>
            </InfoCard>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {clinic.phone && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity style={styles.callCta} onPress={callClinic}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.callCtaText}>Call Clinic</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionButton({
  icon, label, color, bg, onPress,
}: {
  icon: string; label: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoCard({
  icon, iconColor, title, children,
}: {
  icon: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={[styles.infoIconCircle, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon as any} size={15} color={iconColor} />
        </View>
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      <View style={styles.infoCardBody}>{children}</View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },

  floatingHeader: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  heroBanner: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  heroBadge: {
    position: "absolute",
    bottom: 14,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emergencyBadge: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  emergencyText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  content: { padding: 16, backgroundColor: "#F7F7F7" },

  clinicName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 28,
    marginBottom: 4,
  },
  clinicType: { fontSize: 14, color: "#6B7280", marginBottom: 10 },

  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  sourceText: { fontSize: 11, color: "#059669", fontWeight: "600" },

  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  actionBtn: { alignItems: "center", gap: 5, minWidth: 56 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { fontSize: 11, color: "#374151", fontWeight: "600" },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCardTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  infoCardBody: { padding: 16, gap: 10 },

  infoText: { fontSize: 14, color: "#374151", lineHeight: 20 },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  linkText: { fontSize: 13, color: "#D81E5B", fontWeight: "600", marginRight: 2 },

  contactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactText: { fontSize: 14, color: "#374151", flex: 1 },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: "600" },

  stickyFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  callCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#D81E5B",
    borderRadius: 14,
    paddingVertical: 15,
  },
  callCtaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

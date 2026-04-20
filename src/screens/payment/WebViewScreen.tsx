// WebViewScreen.tsx
import React, { useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { StackScreenProps } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";
import { Ionicons } from "@expo/vector-icons";

type Props = StackScreenProps<AppStackParamList, "WebViewScreen">;

export default function WebViewScreen({ route, navigation }: Props) {
  const { url, orderId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const goToStatus = () => {
    if (orderId) {
      navigation.replace("OrderDetailsScreen", { orderId });
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url: currentUrl } = navState;
    if (currentUrl && currentUrl.includes("planamwell://order-complete")) {
      const orderId = currentUrl.split("orderId=")[1];
      navigation.replace("OrderDetailsScreen", { orderId });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ───────── Header ───────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToStatus} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ───────── Error State ───────── */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Something went wrong loading the payment page.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkStatusBtn} onPress={goToStatus}>
            <Text style={styles.checkStatusText}>Check Payment Status</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ───────── Loading Overlay ───────── */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#D81E5B" />
              <Text style={styles.loadingText}>Loading payment...</Text>
            </View>
          )}

          {/* ───────── WebView ───────── */}
          <WebView
            source={{ uri: url }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            onNavigationStateChange={handleNavigationStateChange}
            style={{ flex: 1 }}
          />

          {/* ✅ Persistent CTA */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.checkStatusBtn} onPress={goToStatus}>
              <Text style={styles.checkStatusText}>Check Payment Status</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: { padding: 5 },
  title: { fontSize: 18, fontWeight: "600" },
  loadingOverlay: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { marginTop: 10, color: "#D81E5B", fontSize: 14 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  checkStatusBtn: {
    backgroundColor: "#D81E5B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  checkStatusText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#555",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
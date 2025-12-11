// components/VideoCallModal.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "../../hooks/useVideoCall";

const { height } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  onJoin: (tokenData: any) => void;
}

export default function VideoCallModal({
  visible,
  onClose,
  appointmentId,
  onJoin,
}: Props) {
  const { loading, getVideoToken } = useVideoCall();
  const [error, setError] = useState<string | null>(null);

  const handleStartCall = async () => {
    if (loading) return; // Prevent double-click

    setError(null);

    try {
      const data = await getVideoToken(appointmentId);
      onJoin(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to get video token");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Start Video Call</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            You’re about to join a secure video session with this patient.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={18} color="red" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Start Call Button */}
          <TouchableOpacity
            style={[styles.startButton, loading && { opacity: 0.7 }]}
            onPress={handleStartCall}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="videocam" size={20} color="#fff" />
                <Text style={styles.startText}>Join Call</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  container: {
    height: height * 0.75,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtext: {
    fontSize: 15,
    color: "#666",
    marginBottom: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdecea",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    flex: 1,
  },
  startButton: {
    backgroundColor: "#673AB7",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  startText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    color: "#444",
  },
});

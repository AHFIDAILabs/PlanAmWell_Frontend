import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { StackScreenProps } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";
import { Ionicons } from "@expo/vector-icons";

type Props = StackScreenProps<AppStackParamList, "WebViewScreen">;

export default function WebViewScreen({ route, navigation }: Props) {
    const { url } = route.params;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            
            {/* 🔥 Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.title}>Secure Payment</Text>
                <View style={{ width: 30 }} /> 
            </View>

            {/* ❗ If WebView fails */}
            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Something went wrong loading the payment page.</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setError(false);
                            setLoading(true);
                        }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* 💡 Branded loading overlay */}
                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#D81E5B" />
                            <Text style={styles.loadingText}>Loading payment...</Text>
                        </View>
                    )}

                    {/* 🌐 The WebView itself */}
                    <WebView
                        source={{ uri: url }}
                        onLoadEnd={() => setLoading(false)}
                        onError={() => {
                            setLoading(false);
                            setError(true);
                        }}
                        style={{ flex: 1 }}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        height: 55,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
    },
    loadingOverlay: {
        position: "absolute",
        top: "45%",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        color: "#D81E5B",
        fontSize: 14,
    },
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
        backgroundColor: "#D81E5B",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

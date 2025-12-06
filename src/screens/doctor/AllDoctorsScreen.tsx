import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDoctors } from "../../hooks/useDoctor";
import BottomBar from "../../components/common/BottomBar";

export default function AllDoctorsScreen({ navigation }: any) {
    const { doctors, loading, error } = useDoctors();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return doctors;

        const s = search.toLowerCase();
        return doctors.filter((doc) =>
            `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(s) ||
            doc.specialization.toLowerCase().includes(s)
        );
    }, [search, doctors]);

    const renderDoctorCard = ({ item }: any) => {
        const imageUri =
            typeof item.profileImage === "string"
                ? item.profileImage
                : item.doctorImage?.imageUrl;

        const avatarSource = imageUri
            ? { uri: imageUri }
            : { uri: "https://placehold.co/150x150?text=No+Image" };

        return (
            <TouchableOpacity
                style={styles.doctorCard}
                onPress={() =>
                    navigation.navigate("DoctorScreen", {
                        doctor: item,
                    })
                }
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <Image source={avatarSource} style={styles.doctorImage} />
                    <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName} numberOfLines={1}>
                            Dr. {item.firstName} {item.lastName}
                        </Text>
                        <Text style={styles.specialty} numberOfLines={1}>
                            {item.specialization}
                        </Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color="#FFA500" />
                            <Text style={styles.ratingText}>
                                {item.ratings?.toFixed(1) || "N/A"}
                            </Text>
                            <Text style={styles.reviewCount}>
                                ({item.reviewCount || 0} reviews)
                            </Text>
                        </View>
                        <Text style={styles.availability}>
                            Next available: {item.nextAvailable || "Mon, Oct 25, 9:00 AM"}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.screen}>
            <LinearGradient
                colors={["#E8F4FD", "#ffffff"]}
                style={styles.headerBg}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Find a Doctor</Text>
                    <TouchableOpacity style={styles.filterButton}>
                        <Ionicons name="options-outline" size={24} color="#D81E5B" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>
                    Search doctors, specialties, and more
                </Text>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search doctors or specialties..."
                        placeholderTextColor="#999"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <View style={styles.contentContainer}>
                {loading && (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#D81E5B" />
                    </View>
                )}

                {!loading && (
                    <FlatList
                        data={filtered}
                        contentContainerStyle={styles.list}
                        keyExtractor={(item) => item._id}
                        renderItem={renderDoctorCard}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={64} color="#ccc" />
                                <Text style={styles.noResultsText}>
                                    No doctors match your search
                                </Text>
                                <Text style={styles.noResultsSubtext}>
                                    Try adjusting your search criteria
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>

            <BottomBar activeRoute="AllDoctorScreen" cartItemCount={0} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fff",
    },
    headerBg: {
        position: "absolute",
        top: 0,
        width: "100%",
        height: 280,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: "Inter_700Bold",
        color: "#1A1A1A",
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        fontFamily: "Inter_400Regular",
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: "Inter_400Regular",
        color: "#1A1A1A",
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 100,
    },
    doctorCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    cardContent: {
        flexDirection: "row",
        marginBottom: 12,
    },
    doctorImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
    },
    doctorInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    doctorName: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    specialty: {
        fontSize: 13,
        fontFamily: "Inter_400Regular",
        color: "#666",
        marginBottom: 6,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 13,
        fontFamily: "Inter_600SemiBold",
        color: "#1A1A1A",
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: "#999",
        marginLeft: 4,
    },
    availability: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: "#666",
    },
    bookButton: {
        backgroundColor: "#D81E5B",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    bookButtonText: {
        fontSize: 14,
        fontFamily: "Inter_600SemiBold",
        color: "#fff",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 60,
    },
    noResultsText: {
        fontSize: 18,
        fontFamily: "Inter_600SemiBold",
        color: "#666",
        marginTop: 16,
        textAlign: "center",
    },
    noResultsSubtext: {
        fontSize: 14,
        fontFamily: "Inter_400Regular",
        color: "#999",
        marginTop: 8,
        textAlign: "center",
    },
});
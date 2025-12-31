import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePartners } from "../../hooks/usePartners";
import PartnerDetailScreen from "./PartnerDetailScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabsScreen } from "react-native-screens";
import BottomBar from "../../components/common/BottomBar";

const { width } = Dimensions.get("window");
const CARD_HEIGHT = 100;

export default function AllActivePartnerScreen() {
  const { partners, loading, error, fetchActivePartners } = usePartners();
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchActivePartners();
  }, []);

  const openModal = (partner: any) => {
    setSelectedPartner(partner);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedPartner(null);
    setModalVisible(false);
  };

  const openLink = (url: string) => {
    if (url.startsWith("http")) Linking.openURL(url);
    else Linking.openURL(`https://${url}`);
  };

  const getSocialIcon = (url: string) => {
    if (url.includes("twitter.com")) return "logo-twitter";
    if (url.includes("instagram.com")) return "logo-instagram";
    if (url.includes("linkedin.com")) return "logo-linkedin";
    if (url.includes("facebook.com")) return "logo-facebook";
    return "link-outline";
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      {item.partnerImage?.imageUrl ? (
        <Image source={{ uri: item.partnerImage.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.profession}>{item.profession}</Text>
        <View style={styles.socialContainer}>
          {item.socialLinks?.map((link: string, idx: number) => (
            <TouchableOpacity key={idx} onPress={() => openLink(link)}>
              <Ionicons name={getSocialIcon(link) as any} size={20} color="#4CAF50" style={{ marginRight: 8 }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />;

  if (error)
    return <Text style={styles.error}>{error}</Text>;

  if (!partners.length)
    return <Text style={styles.noData}>No active partners found.</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={styles.container}>
      <FlatList
        data={partners}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />

      {/* Partner Detail Modal */}
      <PartnerDetailScreen visible={modalVisible} partner={selectedPartner} onClose={closeModal} />
    </View>
    <BottomBar activeRoute={"AllActivePartnerScreen"} cartItemCount={0} />    
    
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 12,
    height: CARD_HEIGHT,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  image: { width: 70, height: 70, borderRadius: 35, marginRight: 12 },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#B0BEC5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  placeholderText: { color: "#FFF", fontWeight: "bold", fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  profession: { fontSize: 14, color: "#666", marginTop: 2 },
  socialContainer: { flexDirection: "row", marginTop: 4 },
  error: { color: "red", textAlign: "center", marginTop: 20 },
  noData: { textAlign: "center", marginTop: 20, color: "#888" },
});

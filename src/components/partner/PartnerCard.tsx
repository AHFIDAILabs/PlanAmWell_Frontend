import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePartners } from "../../hooks/usePartners";
import PartnerDetailScreen from "../../screens/partner/PartnerDetailScreen";
import { RADIUS, SHADOW } from "../../theme/layout";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;

export default function PartnerCard() {
  const { partners, loading, error, fetchActivePartners } = usePartners();
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchActivePartners();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (!partners.length) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % partners.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 3000); // scroll every 3s

    return () => clearInterval(interval);
  }, [currentIndex, partners]);

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
      {item.partnerImage?.url ? (
        <Image source={{ uri: item.partnerImage.url }} style={styles.image} />
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
              <Ionicons 
                name={getSocialIcon(link) as any} 
                size={20} 
                color="#4CAF50" 
                style={{ marginRight: 8 }} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={partners}
        keyExtractor={item => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16} // card width + margin
        decelerationRate="fast"
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 4 }}
      />

      {/* Partner Detail Modal */}
      <PartnerDetailScreen 
        visible={modalVisible} 
        partner={selectedPartner} 
        onClose={closeModal} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: RADIUS.sm,
    padding: 12,
    marginRight: 16,
    ...SHADOW.low,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
  },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#B0BEC5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#FFECEF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  placeholderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 28,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  profession: { fontSize: 14, color: "#666", marginTop: 2 },
  socialContainer: { flexDirection: "row", marginTop: 4 },
  error: { color: "red", textAlign: "center", marginTop: 20 },
});

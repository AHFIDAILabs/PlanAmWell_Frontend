import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Modal, 
  TouchableOpacity, 
  Linking, 
  ScrollView 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Partner } from "../../services/partner";

interface PartnerDetailScreenProps {
  visible: boolean;
  partner: Partner | null;
  onClose: () => void;
}

export default function PartnerDetailScreen({ visible, partner, onClose }: PartnerDetailScreenProps) {
  if (!partner) return null;

  const openLink = (url?: string) => {
  if (!url) return; // Guard undefined
  if (url.startsWith("http")) Linking.openURL(url);
  else Linking.openURL(`https://${url}`);
};

const openEmail = (email?: string) => {
  if (!email) return;
  Linking.openURL(`mailto:${email}`);
};

const openPhone = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
};


  return (
    <Modal animationType="slide" visible={visible} transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>

            {partner.partnerImage?.imageCldId ? (
              <Image source={{ uri: partner.partnerImage.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {partner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.name}>{partner.name}</Text>
            <Text style={styles.profession}>{partner.profession}</Text>
            <Text style={styles.address}>{partner.businessAddress}</Text>

            {partner.description ? (
              <Text style={styles.description}>{partner.description}</Text>
            ) : null}

           {partner.email && (
  <TouchableOpacity style={styles.infoRow} onPress={() => openEmail(partner.email)}>
    <Ionicons name="mail-outline" size={20} color="#4CAF50" />
    <Text style={styles.infoText}>{partner.email}</Text>
  </TouchableOpacity>
)}

{partner.phone && (
  <TouchableOpacity style={styles.infoRow} onPress={() => openPhone(partner.phone)}>
    <Ionicons name="call-outline" size={20} color="#4CAF50" />
    <Text style={styles.infoText}>{partner.phone}</Text>
  </TouchableOpacity>
)}

{partner.website && (
  <TouchableOpacity style={styles.infoRow} onPress={() => openLink(partner.website)}>
    <Ionicons name="link-outline" size={20} color="#4CAF50" />
    <Text style={styles.infoText}>{partner.website}</Text>
  </TouchableOpacity>
)}

{partner.socialLinks?.length > 0 && (
  <View style={styles.socialContainer}>
    {partner.socialLinks.map((link, index) => (
      <TouchableOpacity key={index} onPress={() => openLink(link)}>
        <Ionicons name="logo-twitter" size={28} color="#1DA1F2" style={{ marginRight: 12 }} />
      </TouchableOpacity>
    ))}
  </View>
)}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "90%",
  },
  scrollContent: {
    alignItems: "center",
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#B0BEC5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 36,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  profession: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  address: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginTop: 12,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    color: "#4CAF50",
    textDecorationLine: "underline",
  },
  socialContainer: {
    flexDirection: "row",
    marginTop: 16,
  },
});

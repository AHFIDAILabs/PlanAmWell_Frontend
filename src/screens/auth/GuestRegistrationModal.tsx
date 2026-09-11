import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (details: { name: string; email: string; phone: string; password: string }) => void;
}

export default function GuestRegistrationModal({ visible, onClose, onSubmit }: Props) {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = () => {
    if (!name || !phone || !email || !password) {
      return Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'All fields are required',
      });
    }
    if (!agreedToTerms) {
      return Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please agree to the Terms of Service and Privacy Policy',
      });
    }
    onSubmit({ name, email, phone, password });
    onClose();
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Complete Your Details</Text>
          <TextInput placeholder="Name" style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setAgreedToTerms(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Feather name="check" size={13} color="#fff" />}
            </View>
            <Text style={styles.consentTxt}>
              I agree to the{' '}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('TermsOfServiceScreen')}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicyScreen')}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Continue to Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  scroll: { flex: 1, width: "100%" },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  container: { backgroundColor: "#FFF", padding: 20, borderRadius: 12, width: "90%" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: { borderWidth: 1, borderColor: "#CCC", borderRadius: 8, padding: 10, marginBottom: 10 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: "#ccc",
    alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#D81E5B", borderColor: "#D81E5B" },
  consentTxt: { flex: 1, fontSize: 13, color: "#666", lineHeight: 19 },
  consentLink: { color: "#2196F3", fontWeight: "600" },
  button: { backgroundColor: "#D81E5B", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  buttonText: { color: "#FFF", fontWeight: "bold" },
  cancelText: { textAlign: "center", color: "#999" },
});

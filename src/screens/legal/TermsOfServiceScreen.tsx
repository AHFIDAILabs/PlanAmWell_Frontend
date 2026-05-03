import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";

const LAST_UPDATED = "January 1, 2025";
const CONTACT_EMAIL = "legal@planamwell.com";
const APP_NAME = "PlanAmWell";
const COMPANY_NAME = "PlanAmWell Ltd.";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
};

const P = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return <Text style={[styles.para, { color: colors.textMuted }]}>{children}</Text>;
};

const Bullet = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
      <Text style={[styles.bulletText, { color: colors.textMuted }]}>{children}</Text>
    </View>
  );
};

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border ?? "#E5E7EB" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          Last updated: {LAST_UPDATED}
        </Text>

        <P>
          Please read these Terms of Service carefully before using {APP_NAME}. By accessing or
          using our platform, you agree to be bound by these terms. If you do not agree, please
          do not use {APP_NAME}.
        </P>

        <Section title="1. Acceptance of Terms">
          <P>
            By creating an account or using {APP_NAME} in any way, you confirm that you are at
            least 18 years of age and have the legal capacity to enter into this agreement with
            {" "}{COMPANY_NAME}.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            {APP_NAME} is a digital health platform that connects users with licensed healthcare
            professionals for remote consultations. We also provide access to health advocacy
            content and an integrated health supplement marketplace.
          </P>
          <P>
            {APP_NAME} is NOT an emergency medical service. In case of a medical emergency,
            please call your local emergency services immediately.
          </P>
        </Section>

        <Section title="3. Medical Disclaimer">
          <P>
            Consultations on {APP_NAME} are for informational and general healthcare advisory
            purposes only. They do not constitute a doctor-patient relationship in the traditional
            sense and are not a substitute for in-person medical care. Always seek in-person
            medical attention for serious or life-threatening conditions.
          </P>
          <P>
            {COMPANY_NAME} is not liable for any medical decisions made based on advice received
            through the platform.
          </P>
        </Section>

        <Section title="4. User Responsibilities">
          <P>As a user of {APP_NAME}, you agree to:</P>
          <Bullet>Provide accurate and complete registration information</Bullet>
          <Bullet>Maintain the confidentiality of your account credentials</Bullet>
          <Bullet>Use the platform only for lawful purposes</Bullet>
          <Bullet>Not impersonate any person or entity</Bullet>
          <Bullet>Not submit false, misleading, or fraudulent health information</Bullet>
          <Bullet>Treat healthcare professionals and other users with respect</Bullet>
          <Bullet>Not attempt to reverse-engineer, hack, or misuse the platform</Bullet>
        </Section>

        <Section title="5. Doctor Verification">
          <P>
            All doctors on {APP_NAME} undergo a verification process that includes review of
            medical licence credentials. However, {COMPANY_NAME} does not guarantee the accuracy
            of a doctor's credentials beyond the information submitted during registration.
            Users should exercise their own judgement when engaging with any healthcare
            professional.
          </P>
        </Section>

        <Section title="6. Appointments and Consultations">
          <P>
            Booking an appointment is subject to doctor availability. Cancellations should be
            made at least 2 hours before a scheduled consultation. Repeated no-shows may result
            in account restrictions.
          </P>
        </Section>

        <Section title="7. Payments and Refunds">
          <P>
            Consultation fees are displayed before booking and charged at the time of payment.
            Refunds may be issued at {COMPANY_NAME}'s sole discretion in cases of technical
            failure or where a consultation did not take place due to a doctor's failure to
            attend.
          </P>
          <P>
            Supplement purchases are processed by our partner pharmacy. Returns and refunds for
            supplements are subject to the partner's refund policy.
          </P>
        </Section>

        <Section title="8. Intellectual Property">
          <P>
            All content on {APP_NAME}, including text, graphics, logos, and software, is the
            property of {COMPANY_NAME} or its content suppliers and is protected by applicable
            intellectual property laws.
          </P>
        </Section>

        <Section title="9. Privacy">
          <P>
            Your use of {APP_NAME} is also governed by our Privacy Policy, which is incorporated
            into these Terms by reference. Please review our Privacy Policy to understand our
            data practices.
          </P>
        </Section>

        <Section title="10. Termination">
          <P>
            We reserve the right to suspend or terminate your account at any time for violation
            of these Terms or for any other reason at our sole discretion. You may also delete
            your account at any time via Settings → Privacy Settings → Delete My Account.
          </P>
        </Section>

        <Section title="11. Limitation of Liability">
          <P>
            To the fullest extent permitted by law, {COMPANY_NAME} shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from your
            use of {APP_NAME}.
          </P>
        </Section>

        <Section title="12. Changes to Terms">
          <P>
            We may update these Terms of Service at any time. We will notify you of material
            changes via the app or email. Continued use of {APP_NAME} after changes constitutes
            acceptance of the updated Terms.
          </P>
        </Section>

        <Section title="13. Governing Law">
          <P>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes
            arising from these Terms shall be subject to the exclusive jurisdiction of Nigerian
            courts.
          </P>
        </Section>

        <Section title="14. Contact">
          <P>For legal enquiries, please contact us at:</P>
          <P>{"\n"}{CONTACT_EMAIL}</P>
          <P>{COMPANY_NAME}</P>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  lastUpdated: { fontSize: 12, marginBottom: 16, fontStyle: "italic" },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  para: { fontSize: 14, lineHeight: 22, marginBottom: 6 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6, paddingLeft: 4 },
  bullet: { fontSize: 16, lineHeight: 22, width: 14 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22 },
});

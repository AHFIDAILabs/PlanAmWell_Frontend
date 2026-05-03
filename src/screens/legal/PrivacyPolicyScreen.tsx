import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";

const LAST_UPDATED = "January 1, 2025";
const CONTACT_EMAIL = "privacy@planamwell.com";
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

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border ?? "#E5E7EB" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          Last updated: {LAST_UPDATED}
        </Text>

        <P>
          {COMPANY_NAME} ("we", "us", or "our") is committed to protecting your privacy. This
          Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you use the {APP_NAME} mobile application.
        </P>

        <Section title="1. Information We Collect">
          <P>We collect information that you provide directly to us, including:</P>
          <Bullet>Account registration details (name, email address, password)</Bullet>
          <Bullet>Profile information (profile photo, date of birth, gender)</Bullet>
          <Bullet>Medical and health information you voluntarily share with doctors</Bullet>
          <Bullet>Payment and order information for supplement purchases</Bullet>
          <Bullet>Communications with healthcare professionals on our platform</Bullet>
          <Bullet>Device information (push notification tokens, device type, OS version)</Bullet>
          <Bullet>Location data (city, state, LGA for delivery purposes — only when provided)</Bullet>
        </Section>

        <Section title="2. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <Bullet>Provide, operate, and maintain the {APP_NAME} platform</Bullet>
          <Bullet>Connect you with qualified healthcare professionals</Bullet>
          <Bullet>Process supplement orders and arrange delivery</Bullet>
          <Bullet>Send appointment confirmations, reminders, and health notifications</Bullet>
          <Bullet>Improve user experience and platform features</Bullet>
          <Bullet>Comply with legal obligations and enforce our Terms of Service</Bullet>
          <Bullet>Respond to your comments, questions, and requests</Bullet>
        </Section>

        <Section title="3. Medical Information">
          <P>
            Any health or medical information you share with doctors on {APP_NAME} is treated with
            the highest level of confidentiality. Consultation records are accessible only to you
            and your treating doctor. We do not sell, rent, or share medical information with
            third parties except as required by law.
          </P>
        </Section>

        <Section title="4. Information Sharing">
          <P>We do not sell your personal information. We may share your data with:</P>
          <Bullet>
            Healthcare providers you choose to consult with on our platform
          </Bullet>
          <Bullet>
            Delivery partners (name, address, phone number) solely to fulfill orders
          </Bullet>
          <Bullet>
            Service providers that help us operate our platform (cloud hosting, analytics)
            under strict confidentiality agreements
          </Bullet>
          <Bullet>
            Law enforcement or regulatory authorities when required by applicable law
          </Bullet>
        </Section>

        <Section title="5. Data Security">
          <P>
            We implement industry-standard security measures to protect your personal information,
            including encryption of data in transit (TLS/HTTPS), secure password hashing, and
            access controls. However, no method of transmission over the internet is 100% secure.
          </P>
        </Section>

        <Section title="6. Your Rights">
          <P>You have the right to:</P>
          <Bullet>Access the personal information we hold about you</Bullet>
          <Bullet>Request correction of inaccurate or incomplete data</Bullet>
          <Bullet>
            Request deletion of your account and personal data (available in
            Settings → Privacy Settings → Delete My Account)
          </Bullet>
          <Bullet>Withdraw consent for non-essential data processing at any time</Bullet>
          <Bullet>Receive a copy of your personal data in a portable format</Bullet>
        </Section>

        <Section title="7. Cookies and Tracking">
          <P>
            {APP_NAME} is a mobile application and does not use browser cookies. We may use
            analytics tools to understand how users interact with the app. These tools collect
            anonymised usage data to help us improve the platform.
          </P>
        </Section>

        <Section title="8. Children's Privacy">
          <P>
            {APP_NAME} is not directed to individuals under the age of 18. We do not knowingly
            collect personal information from children. If you believe we have inadvertently
            collected such information, please contact us immediately.
          </P>
        </Section>

        <Section title="9. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes via the app or email. Your continued use of {APP_NAME} after
            changes constitutes your acceptance of the updated policy.
          </P>
        </Section>

        <Section title="10. Contact Us">
          <P>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            please contact our privacy team at:
          </P>
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

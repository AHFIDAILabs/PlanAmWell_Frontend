import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: 'user-check' as const,
    color: '#D81E5B',
    bg: '#FFF0F6',
    title: 'Verified Doctors',
    desc: 'Connect with licensed Sexual & Reproductive Health specialists who are vetted by the Medical & Dental Council of Nigeria.',
  },
  {
    icon: 'lock' as const,
    color: '#166534',
    bg: '#F0FDF4',
    title: 'Complete Privacy',
    desc: 'All consultations and conversations are end-to-end encrypted. Your health history is yours alone — never sold or shared.',
  },
  {
    icon: 'message-circle' as const,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    title: 'Ask AmWell AI',
    desc: 'Our AI health assistant gives instant, evidence-based answers to sensitive SRH questions in a safe, judgement-free space.',
  },
  {
    icon: 'box' as const,
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Trusted Products',
    desc: 'A curated shop of contraceptives, supplements and SRH essentials — sourced from certified manufacturers and delivered discreetly.',
  },
];

const STATS = [
  { value: '5,000+', label: 'Users Served' },
  { value: '50+', label: 'Verified Doctors' },
  { value: '4.8★', label: 'App Rating' },
  { value: '100%', label: 'Confidential' },
];

const TEAM_VALUES = [
  { icon: 'heart' as const, text: 'We believe sexual health is a human right, not a privilege.' },
  { icon: 'shield' as const, text: 'We hold every piece of your data with the utmost respect and security.' },
  { icon: 'users' as const, text: 'We champion an inclusive, non-judgmental approach to reproductive health.' },
  { icon: 'trending-up' as const, text: 'We continuously improve through evidence-based research and user feedback.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const navigation = useNavigation();

  const handleEmail = () => Linking.openURL('mailto:support@planamwell.com');
  const handleWebsite = () => Linking.openURL('https://planamwell.com');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About PlanAmWell</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoInitials}>PAW</Text>
          </View>
          <Text style={styles.heroTagline}>Your Health. Your Terms.</Text>
          <Text style={styles.heroSub}>
            PlanAmWell is Nigeria's trusted Sexual & Reproductive Health (SRH) platform —
            combining expert medical care, AI-powered guidance and discreet product delivery in one place.
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <View style={styles.missionCard}>
            <Feather name="target" size={24} color="#D81E5B" style={{ marginBottom: 12 }} />
            <Text style={styles.missionText}>
              To make quality Sexual & Reproductive Health care accessible, affordable and completely
              private for every Nigerian — regardless of location, gender or background.
            </Text>
          </View>
        </View>

        {/* What we offer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Offer</Text>
          {PILLARS.map((p) => (
            <View key={p.title} style={styles.pillarRow}>
              <View style={[styles.pillarIcon, { backgroundColor: p.bg }]}>
                <Feather name={p.icon} size={20} color={p.color} />
              </View>
              <View style={styles.pillarContent}>
                <Text style={styles.pillarTitle}>{p.title}</Text>
                <Text style={styles.pillarDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Our Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          {TEAM_VALUES.map((v, i) => (
            <View key={i} style={styles.valueRow}>
              <View style={styles.valueDot}>
                <Feather name={v.icon} size={14} color="#D81E5B" />
              </View>
              <Text style={styles.valueText}>{v.text}</Text>
            </View>
          ))}
        </View>

        {/* Privacy commitment */}
        <View style={[styles.section, styles.privacyCard]}>
          <View style={styles.privacyHeader}>
            <Feather name="shield" size={20} color="#166534" />
            <Text style={styles.privacyTitle}>Your Privacy Guarantee</Text>
          </View>
          <Text style={styles.privacyText}>
            We never sell, share or monetise your personal health data. All data is encrypted
            in transit and at rest. You can request a full export or permanent deletion of your
            account at any time from Settings → Privacy &amp; Security.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.75}>
            <View style={styles.contactIcon}>
              <Feather name="mail" size={18} color="#D81E5B" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@planamwell.com</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#CCC" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactRow} onPress={handleWebsite} activeOpacity={0.75}>
            <View style={styles.contactIcon}>
              <Feather name="globe" size={18} color="#D81E5B" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Website</Text>
              <Text style={styles.contactValue}>planamwell.com</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#CCC" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>PlanAmWell · Version 1.0.0</Text>
        <Text style={styles.copyrightText}>© 2025 PlanAmWell. All rights reserved.</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  scroll: { paddingHorizontal: 16 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D81E5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D81E5B',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoInitials: { color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  heroTagline: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  heroSub: { fontSize: 15, color: '#555', lineHeight: 23, textAlign: 'center', paddingHorizontal: 8 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#D81E5B' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 3, textAlign: 'center', fontWeight: '500' },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },

  // Mission
  missionCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  missionText: { fontSize: 15, color: '#444', lineHeight: 24, textAlign: 'center' },

  // Pillars
  pillarRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  pillarContent: { flex: 1 },
  pillarTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  pillarDesc: { fontSize: 13, color: '#666', lineHeight: 19 },

  // Values
  valueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  valueDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFF0F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  valueText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 21, paddingTop: 4 },

  // Privacy
  privacyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  privacyTitle: { fontSize: 15, fontWeight: '700', color: '#166534' },
  privacyText: { fontSize: 13, color: '#374151', lineHeight: 21 },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF0F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  // Footer
  versionText: { textAlign: 'center', fontSize: 13, color: '#AAA', marginBottom: 4 },
  copyrightText: { textAlign: 'center', fontSize: 12, color: '#CCC' },
});

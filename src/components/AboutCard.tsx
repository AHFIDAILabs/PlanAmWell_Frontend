import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function AboutCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Health. Your Terms</Text>
      <Text style={styles.desc}>
        Learn more about our mission and how we support your wellbeing with trusted medical insights and tools.
      </Text>
      <TouchableOpacity>
        <Text style={styles.link}>Learn More →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFECEF', padding: 20, borderRadius: 16 },
  title: { fontFamily: 'Inter_700Bold', color: '#D81E5B', fontSize: 17, marginBottom: 8 },
  desc: { color: '#444', lineHeight: 22, marginBottom: 16 },
  link: { color: '#D81E5B', fontFamily: 'Inter_600SemiBold' },
});
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../types/App';

type Nav = StackNavigationProp<AppStackParamList>;

export default function AboutCard() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.card}>
      <View style={styles.iconRow}>
        <View style={styles.iconCircle}>
          <Feather name="heart" size={18} color="#D81E5B" />
        </View>
      </View>
      <Text style={styles.title}>Your Health. Your Terms.</Text>
      <Text style={styles.desc}>
        PlanAmWell connects you with verified SRH specialists, AI-powered health guidance,
        and discreet product delivery — all in one trusted platform.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('AboutScreen')}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Learn More</Text>
        <Feather name="arrow-right" size={15} color="#D81E5B" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8FA',
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDDDE8',
    shadowColor: '#D81E5B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconRow: { marginBottom: 12 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF0F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#D81E5B',
    fontSize: 17,
    marginBottom: 8,
  },
  desc: {
    color: '#555',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDDDE8',
  },
  btnText: {
    color: '#D81E5B',
    fontWeight: '700',
    fontSize: 14,
  },
});

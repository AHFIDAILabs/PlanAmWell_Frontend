import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface DoctorViewSwitcherProps {
  currentView: 'dashboard' | 'home';
  onSwitchView: (view: 'dashboard' | 'home') => void;
}

export default function DoctorViewSwitcher({ 
  currentView, 
  onSwitchView 
}: DoctorViewSwitcherProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[
          styles.switchButton,
          currentView === 'dashboard' && { backgroundColor: colors.primary }
        ]}
        onPress={() => onSwitchView('dashboard')}
      >
        <Ionicons
          name="business"
          size={18}
          color={currentView === 'dashboard' ? '#fff' : colors.text}
        />
        <Text
          style={[
            styles.switchText,
            { color: currentView === 'dashboard' ? '#fff' : colors.text }
          ]}
        >
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.switchButton,
          currentView === 'home' && { backgroundColor: colors.primary }
        ]}
        onPress={() => onSwitchView('home')}
      >
        <Ionicons
          name="home"
          size={18}
          color={currentView === 'home' ? '#fff' : colors.text}
        />
        <Text
          style={[
            styles.switchText,
            { color: currentView === 'home' ? '#fff' : colors.text }
          ]}
        >
          Explore
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  switchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
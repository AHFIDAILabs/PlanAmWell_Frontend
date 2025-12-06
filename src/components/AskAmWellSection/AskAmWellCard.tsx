import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons'; 

import { NavigationContainer, CompositeNavigationProp,useNavigation } from "@react-navigation/native";
import  { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/Auth";
import { AppStackParamList } from "../../types/App";

type AppStackNavigationProp = CompositeNavigationProp<NativeStackNavigationProp<AppStackParamList, 'AmWellChatModal'>,
 NativeStackNavigationProp<AuthStackParamList>    
>;

export default function AskAmWellCard() {
  const navigation = useNavigation<AppStackNavigationProp>();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Your Health.
        Your Questions.
        {'\n'}Answered.
      </Text>
      
      <Text style={styles.subtitle}>
        PLAN AM WELL is your trusted, confidential guide to sexual and reproductive health in Nigeria. No judgment, just facts.
      </Text>
      
      {/* Wrapper for the two main actions, centralized */}
      <View style={styles.actionsWrapper}>
        
        {/* 1. Ask AmWell Button (Now contains the icon and circle) */}
        {/* 💡 Note: The wrapper div is now the TouchableOpacity's parent to help position the absolute element */}
        <View style={styles.actionItem}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("AmWellChatModal") } >
            <Text style={styles.buttonText}>Ask AmWell</Text>
            
            {/* 💡 Mic Icon with Circle, positioned absolutely inside the button */}
            <View style={styles.micCircleInsideButton}>
              <Feather name="mic" size={18} color="#D81E5B" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. Find A Clinic Button (Two-Tone Style) */}
        <TouchableOpacity style={styles.findClinicButton}>
          <Text style={styles.findClinicText}>Find A Clinic</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#FFE5EB', 
    padding: 25, 
    borderRadius: 16, 
    marginBottom: 20, 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#D81E5B', 
    marginBottom: 8,
    lineHeight: 25,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#444', 
    lineHeight: 20,
    marginBottom: 30, 
  },
  
  actionsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    width: '100%',
  },
  
  actionItem: {
    width: '50%', 
    // This is important: The parent of an absolute element must have position: 'relative' (which is default) 
    // or position: 'absolute' if the absolute element needs to respect it. 
    // TouchableOpacity is the parent, and we will style it below.
  },
  
  // 1. Ask AmWell Now Button (Modified for absolute positioning)
  button: { 
    backgroundColor: '#D81E5B', 
    paddingVertical: 12, 
    borderRadius: 30, 
  padding: 7,
    
    // Enable positioning context for the mic circle
    position: 'relative', 
    
    flexDirection: 'row',
    alignItems: 'center',
   
    zIndex: 1, 
  },
  buttonText: { 
    color: '#FFF', 
    fontWeight: '600', 
    fontSize: 15,
  },
  
  // 💡 Mic Icon with Circle (The desired element)
  micCircleInsideButton: { 
    position: 'absolute', 
    right: 5, // Positioned close to the right edge of the button
    width: 36, // Slightly smaller than the previous 40px for a better fit
    height: 36, 
    backgroundColor: '#FFF', // White background
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    // Retaining the shadow/border effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    zIndex: 2, // Ensure it's rendered on top
  },
  
  // 2. Find A Clinic Button Container (Pink background)
  findClinicButton: {
    backgroundColor: '#D81E5B', 
    paddingVertical: 0, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '45%', 
  },
  
  // Text inside the Find A Clinic button (White background trick)
  findClinicText: { 
    color: '#D81E5B', 
    fontWeight: '600', 
    backgroundColor: '#FFF', 
    borderRadius: 0, 
    paddingHorizontal: 10, 
    paddingVertical: 10, 
  },
});
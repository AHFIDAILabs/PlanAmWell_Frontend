import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/App';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const TEAL = '#00897B';
const TEAL_LIGHT = '#F0FAF9';
const TEAL_DARK = '#00695C';

type Nav = NativeStackNavigationProp<AppStackParamList, 'SymptomCheckerScreen'>;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Recommendation {
  specialist: string;
  urgency: 'emergency' | 'urgent' | 'soon' | 'routine';
  summary: string;
}

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  emergency: { label: 'Emergency', color: '#FFF', bg: '#D32F2F' },
  urgent:    { label: 'Urgent',    color: '#FFF', bg: '#F57C00' },
  soon:      { label: 'See Soon',  color: '#FFF', bg: '#1976D2' },
  routine:   { label: 'Routine',   color: '#FFF', bg: '#388E3C' },
};

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content: "Hello! I'm your AmWell Symptom Checker. I'll ask you a few questions to help understand what you might be experiencing and guide you to the right care.\n\nWhat symptoms are you experiencing today?",
};

export default function SymptomCheckerScreen() {
  const navigation = useNavigation<Nav>();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || loading || recommendation) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    try {
      const response = await axios.post(`${SERVER_URL}/api/v1/chatbot/symptom-check`, {
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      });

      if (response.data.success) {
        const { content, recommendation: rec } = response.data.data;
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content,
        };
        setMessages(prev => [...prev, botMsg]);
        if (rec) setRecommendation(rec);
        scrollToBottom();
      }
    } catch (err) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your internet and try again.",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputText, loading, messages, recommendation, scrollToBottom]);

  const handleReset = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setRecommendation(null);
    setInputText('');
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Feather name="activity" size={14} color={TEAL} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }, []);

  const urgencyConfig = recommendation ? URGENCY_CONFIG[recommendation.urgency] ?? URGENCY_CONFIG.routine : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Symptom Checker</Text>
          <Text style={styles.headerSub}>Powered by AmWell AI</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
        />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.typingRow}>
            <View style={styles.avatar}>
              <Feather name="activity" size={14} color={TEAL} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={TEAL} />
            </View>
          </View>
        )}

        {/* Recommendation card */}
        {recommendation && urgencyConfig && (
          <View style={styles.recCard}>
            <View style={styles.recHeader}>
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyConfig.bg }]}>
                <Text style={[styles.urgencyText, { color: urgencyConfig.color }]}>
                  {urgencyConfig.label}
                </Text>
              </View>
              <Text style={styles.recSpecialist}>{recommendation.specialist}</Text>
            </View>
            <Text style={styles.recSummary}>{recommendation.summary}</Text>
            <View style={styles.recActions}>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => navigation.navigate('AllDoctorScreen')}
              >
                <Feather name="calendar" size={15} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookBtnText}>Book Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newCheckBtn} onPress={handleReset}>
                <Text style={styles.newCheckText}>Start New Check</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input area */}
        {!recommendation && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Describe your symptoms..."
              placeholderTextColor="#9E9E9E"
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
            >
              <Feather name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Feather name="info" size={11} color="#888" />
        <Text style={styles.disclaimerText}> Not a substitute for professional medical advice.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TEAL_DARK },
  flex: { flex: 1, backgroundColor: TEAL_LIGHT },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },

  listContent: { padding: 12, paddingBottom: 6 },

  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: TEAL,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#FFF' },
  bubbleTextBot: { color: '#212121' },

  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  typingBubble: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 1,
  },

  recCard: {
    margin: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  urgencyBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10 },
  urgencyText: { fontSize: 12, fontWeight: '700' },
  recSpecialist: { fontSize: 15, fontWeight: '700', color: '#212121', flex: 1 },
  recSummary: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 14 },
  recActions: { flexDirection: 'row', gap: 10 },
  bookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: 24,
    paddingVertical: 10,
  },
  bookBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  newCheckBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  newCheckText: { color: TEAL, fontWeight: '600', fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#212121',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#B2DFDB' },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 6,
  },
  disclaimerText: { fontSize: 11, color: '#888' },
});

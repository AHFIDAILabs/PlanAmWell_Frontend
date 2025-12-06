import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import {
  User,
  Shield,
  Crown,
  Moon,
  Globe,
  Bell,
  BookOpen,
  HelpCircle,
  Phone,
  FileText,
  LogOut,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/home/header';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/App';
import { useTheme } from '../../context/ThemeContext';

const SettingsScreen: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [reminders, setReminders] = useState(true);
  const [education, setEducation] = useState(true);

  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();

  const getImageUri = (): string => {
    const placeholder = 'https://via.placeholder.com/150';

    if (!user?.userImage) return placeholder;

    if (typeof user.userImage === 'string') {
      return user.userImage || placeholder;
    }

    if (typeof user.userImage === 'object') {
      const img = user.userImage as any;

      const imageUrl =
        img.imageUrl || img.url || img.secure_url || null;

      return imageUrl || placeholder;
    }

    return placeholder;
  };

  const imageUri = getImageUri();

  const themeStyles = {
    background: darkMode ? '#000' : '#F7F7F7',
    card: darkMode ? '#111' : '#FFF',
    text: darkMode ? '#EEE' : '#111',
    subText: darkMode ? '#AAA' : '#777',
    divider: darkMode ? '#333' : '#EEE',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeStyles.background }}>
      <Header title="Settings" subtitle="Manage your account" showNotification={false} />

      <ScrollView
        style={[styles.container, { backgroundColor: themeStyles.background }]}
      >

        {/* ACCOUNT CARD */}
        <View style={[styles.card, { backgroundColor: themeStyles.card }]}>
          <View style={styles.profileRow}>
            <Image source={{ uri: imageUri }} style={styles.avatar} />

            <View>
              <Text style={[styles.profileName, { color: themeStyles.text }]}>
                {user?.name}
              </Text>
              <Text style={[styles.profileEmail, { color: themeStyles.subText }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: themeStyles.divider }]}
          />

          <MenuItem
            icon={<User size={20} color={themeStyles.text} />}
            title="Profile Information"
            textColor={themeStyles.text}
            onPress={() => navigation.navigate('ProfileScreen')}
          />

          <MenuItem
            icon={<Shield size={20} color={themeStyles.text} />}
            title="Security"
            textColor={themeStyles.text}
          />

          <MenuItem
            icon={<Crown size={20} color="#D81E5B" />}
            title="Upgrade Plan"
            textColor="#D81E5B"
            isHighlighted
          />
        </View>

        {/* APP PREFERENCES */}
        <View style={[styles.card, { backgroundColor: themeStyles.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
            App Preferences
          </Text>

          <ToggleItem
            icon={<Moon size={20} color={themeStyles.text} />}
            title="Dark Mode"
            textColor={themeStyles.text}
            value={darkMode}
            onToggle={toggleDarkMode}
          />

          <MenuItem
            icon={<Globe size={20} color={themeStyles.text} />}
            title="Language"
            rightText="English"
            textColor={themeStyles.text}
          />
        </View>

        {/* NOTIFICATIONS */}
        <View style={[styles.card, { backgroundColor: themeStyles.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
            Notifications
          </Text>

          <ToggleItem
            icon={<Bell size={20} color={themeStyles.text} />}
            title="Reminders"
            textColor={themeStyles.text}
            value={reminders}
            onToggle={setReminders}
          />

          <ToggleItem
            icon={<BookOpen size={20} color={themeStyles.text} />}
            title="Educational Content"
            textColor={themeStyles.text}
            value={education}
            onToggle={setEducation}
          />
        </View>

        {/* SUPPORT & LEGAL */}
        <View style={[styles.card, { backgroundColor: themeStyles.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
            Support & Legal
          </Text>

          <MenuItem
            icon={<HelpCircle size={20} color={themeStyles.text} />}
            title="Help Center"
            textColor={themeStyles.text}
          />

          <MenuItem
            icon={<Phone size={20} color={themeStyles.text} />}
            title="Contact Us"
            textColor={themeStyles.text}
          />

          <MenuItem
            icon={<FileText size={20} color={themeStyles.text} />}
            title="Privacy Policy"
            textColor={themeStyles.text}
          />
        </View>

        {/* VERSION */}
        <View style={[styles.card, { backgroundColor: themeStyles.card }]}>
          <MenuItem
            title="App Version"
            rightText="1.0.0"
            textColor={themeStyles.text}
          />
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton}>
          <LogOut size={18} color="#D81E5B" />
          <Text style={[styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------------- COMPONENTS ---------------- */

interface MenuItemProps {
  icon?: React.ReactNode;
  title: string;
  rightText?: string;
  textColor?: string;
  isHighlighted?: boolean;
  onPress?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  rightText,
  textColor = '#333',
  isHighlighted,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.menuRow, isHighlighted && styles.highlightedMenuRow]}
    onPress={onPress}
  >
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.menuText, { color: textColor }]}>
        {title}
      </Text>
    </View>

    {rightText && (
      <Text style={[styles.rightText, { color: textColor }]}>
        {rightText}
      </Text>
    )}
  </TouchableOpacity>
);

interface ToggleItemProps {
  icon?: React.ReactNode;
  title: string;
  value: boolean;
  textColor?: string;
  onToggle: (v: boolean) => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({
  icon,
  title,
  value,
  textColor = '#333',
  onToggle,
}) => (
  <View style={styles.menuRow}>
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.menuText, { color: textColor }]}>{title}</Text>
    </View>

    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#777', true: '#D81E5B' }}
      thumbColor="#FFF"
    />
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDD',
    marginRight: 12,
  },

  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },

  profileEmail: {
    fontSize: 13,
  },

  divider: {
    height: 1,
    marginVertical: 14,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },

  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    width: 26,
    alignItems: 'center',
    marginRight: 10,
  },

  menuText: {
    fontSize: 15,
  },

  highlightedMenuRow: {
    backgroundColor: '#FFF1F5',
    borderRadius: 12,
    paddingHorizontal: 10,
  },

  rightText: {
    fontSize: 14,
  },

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
  },

  logoutText: {
    marginLeft: 6,
    color: '#D81E5B',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;

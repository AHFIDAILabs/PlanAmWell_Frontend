import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

const LOW_DATA_KEY = "low_data_mode";

interface IThemeColors {
    background: string;
    text: string;
    textMuted: string;
    primary: string;
    secondary: string;
    card: string;
    border: string;
    like: string;
    error: string;
    success: string;
    warning: string;
    info: string;
}

const LightThemeColors: IThemeColors = {
    background: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#666666',
    primary: '#D81E5B',
    secondary: '#9C27B0',
    card: '#F9F9F9',
    border: '#E0E0E0',
    like: '#FF6347',
    error: '#D32F2F',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
};

const DarkThemeColors: IThemeColors = {
    background: '#121212',
    text: '#FFFFFF',
    textMuted: '#B0B0B0',
    primary: '#ff8fb3',
    secondary: '#D7A7E8',
    card: '#1E1E1E',
    border: '#333333',
    like: '#FFB6C1',
    error: '#EF9A9A',
    success: '#A5D6A7',
    warning: '#FFCC80',
    info: '#90CAF9',
};

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  colors: IThemeColors;
  lowDataMode: boolean;
  toggleLowDataMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(LOW_DATA_KEY).then(v => {
      if (v === "1") setLowDataMode(true);
    });
  }, []);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const toggleLowDataMode = () => {
    setLowDataMode(prev => {
      const next = !prev;
      SecureStore.setItemAsync(LOW_DATA_KEY, next ? "1" : "0");
      return next;
    });
  };

  const currentColors = darkMode ? DarkThemeColors : LightThemeColors;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, colors: currentColors, lowDataMode, toggleLowDataMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
};

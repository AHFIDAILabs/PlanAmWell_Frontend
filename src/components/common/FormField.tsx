import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RFValue } from 'react-native-responsive-fontsize';

interface FormFieldProps extends TextInputProps {
  icon?: React.ComponentProps<typeof Feather>['name'];
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

// Generalizes the ad hoc icon+TextInput boxes previously hand-rolled
// separately in LoginScreen and RegisterScreen, adding an `error` prop that
// neither had a slot for — used to surface inline Zod validation messages.
export function FormField({ icon, error, containerStyle, rightElement, style, ...textInputProps }: FormFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputBox, !!error && styles.inputBoxError, containerStyle]}>
        {icon && <Feather name={icon} size={RFValue(20)} style={styles.icon} />}
        <TextInput style={[styles.input, style]} placeholderTextColor="#999" {...textInputProps} />
        {rightElement}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: RFValue(14) },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: RFValue(8),
    paddingHorizontal: RFValue(12),
    paddingVertical: RFValue(10),
  },
  inputBoxError: { borderColor: '#D32F2F' },
  input: { flex: 1, fontSize: RFValue(15), color: '#111', marginLeft: RFValue(8), paddingVertical: 0 },
  icon: { color: '#999' },
  errorText: { fontSize: RFValue(12), color: '#D32F2F', marginTop: RFValue(4), marginLeft: RFValue(4) },
});

// ../styles/AuthStyles.ts

import { StyleSheet } from 'react-native';

const PRIMARY_COLOR = '#D81E5B';
const SECONDARY_COLOR = '#444';

export const AuthStyles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
    },
    container: {
        backgroundColor: '#FFF',
        marginHorizontal: 25,
        padding: 25,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoText: {
        fontSize: 22,
        fontWeight: '900',
        color: PRIMARY_COLOR,
    },
    welcomeText: {
        fontSize: 16,
        color: SECONDARY_COLOR,
        textAlign: 'center',
        marginTop: 5,
    },
    // Role Switch
    roleSwitchContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        marginBottom: 20,
        padding: 3,
    },
    roleSwitchButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    roleSwitchActive: {
        backgroundColor: PRIMARY_COLOR,
        shadowColor: PRIMARY_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    roleSwitchText: {
        fontSize: 14,
        fontWeight: '600',
        color: SECONDARY_COLOR,
    },
    roleSwitchTextActive: {
        color: '#FFF',
    },
    // Inputs
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        marginBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: '#FAFAFA',
    },
    icon: {
        marginRight: 10,
        color: '#A0A0A0',
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: SECONDARY_COLOR,
    },
    // Button
    button: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    // Divider
    divider: {
        marginVertical: 20,
        textAlign: 'center',
        color: '#B0B0B0',
        fontSize: 14,
    },
    // Social Buttons
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
    },
    socialButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
    },
    // Footer
    footerText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#666',
    },
    footerLink: {
        color: PRIMARY_COLOR,
        fontWeight: 'bold',
    },

    wrap:{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        padding: 0,
        margin: 0
    },
    secondaryButton:{
        color: PRIMARY_COLOR,
        
    }
});
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../hooks/useAuth'; 
import AuthStack from './AuthStack'; 
import HomeScreen from '../screens/home/HomeScreen'; 
import AmWellChatModal from '../screens/home/AmWellChatModal'; 
import ProductsScreen from '../screens/product/ProductScreen'; 
import ProfileScreen from '../screens/profile/ProfileScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen'; 
import PaymentMethodScreen from '../screens/payment/PaymentMethodScreen';
import Productlist from '../screens/product/ProductList';
import WebViewScreen from '../screens/payment/WebViewScreen';

import { AppStackParamList } from '../types/App'; 

const RootStack = createStackNavigator<AppStackParamList>();


const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D81E5B" />
        <Text style={styles.loadingText}>Initializing Session...</Text>
    </View>
);

export default function AppNavigator () {
    const { loading, isAuthenticated } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            
            {isAuthenticated ? (
          
                <>
                    <RootStack.Screen name="HomeScreen" component={HomeScreen} />
                    <RootStack.Screen name='ProfileScreen' component={ProfileScreen} />
                    <RootStack.Screen name="WebViewScreen" component={WebViewScreen} />

                    </>
            ) : (
                <RootStack.Screen name="AuthStack" component={AuthStack} />
            )}

            <RootStack.Screen name="ProductsScreen" component={ProductsScreen} /> 
            <RootStack.Screen name="CheckoutScreen" component={CheckoutScreen} /> 
            <RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} />
            <RootStack.Screen name="ProductList" component={Productlist} /> 

            
            <RootStack.Screen 
                name="AmWellChatModal" 
                component={AmWellChatModal} 
                options={{ presentation: 'modal' }}
            />

        </RootStack.Navigator>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#D81E5B',
    }
});
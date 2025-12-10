import React, { useEffect, useState } from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getProductsByCategory} from '../../services/product';
import { cartService } from '../../services/cart';
import Toast from 'react-native-toast-message';
import { AppStackParamList } from '../../types/App';
import { IProduct, ICartItem } from '../../types/backendType';


type Props = StackScreenProps<AppStackParamList, 'ProductList'>;

export default function ProductList({ route, navigation }: Props) {
    const { category, fromChat } = route.params;
    const [products, setProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);   

  useEffect(() => {
    const fetchProducts = async () => {
        try {
            const data = await getProductsByCategory(category);
            console.log("Fetched products:", data);
            setProducts(Array.isArray(data) ? data : data.products || []);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            Toast.show({ type: 'error', text1: 'Failed to load products' });
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
}, [category]);


    const handleAddToCart = async (product: IProduct) => {
        if (!product._id) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Product ID is missing' });
            return;
        }
        try {
            // Explicitly map product fields to ICartItem to avoid type mismatch
            const cartItem: ICartItem = {
                drugId: product._id,
                quantity: 1,
                price: product.price,
                drugName: product.name,
                imageUrl: product.imageUrl
            };
            await cartService.addToCart([], "guest-session-id", [cartItem] as any);
            Toast.show({ type: 'success', text1: `${product.name} added to cart!` });
            navigation.navigate('CartModal');
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed to add to cart', text2: err.message });
        }
    };

    const renderItem = ({ item }: { item: IProduct }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>₦{item.price}</Text>
            <TouchableOpacity onPress={() => handleAddToCart(item)} style={styles.button}>
                <Text style={styles.buttonText}>Add to Cart</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 50 }} />;

    return (
        <FlatList
            data={products}
            keyExtractor={item => item._id || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 10 }}
        />
    );
}

const styles = StyleSheet.create({
    card: { padding: 15, borderRadius: 10, marginBottom: 10, backgroundColor: '#FFF', elevation: 2 },
    name: { fontWeight: 'bold', fontSize: 16 },
    price: { marginVertical: 5, color: '#1A1A1A' },
    button: { backgroundColor: '#D81E5B', padding: 10, borderRadius: 5, alignItems: 'center' },
    buttonText: { color: '#FFF', fontWeight: 'bold' },
});

import React, { useEffect, useState, useContext } from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getProductsByCategory } from '../../services/product';
import { CartContext } from '../../context/CartContext';
import Toast from 'react-native-toast-message';
import { AppStackParamList } from '../../types/App';
import { IProduct } from '../../types/backendType';

type Props = StackScreenProps<AppStackParamList, 'ProductList'>;

export default function ProductList({ route, navigation }: Props) {
    const { category } = route.params;
    const { addProduct } = useContext(CartContext);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await getProductsByCategory(category);
                setProducts(Array.isArray(data) ? data : (data as any).products || []);
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
        if (addingId) return; // prevent double-tap
        setAddingId(product._id ?? null);
        try {
            await addProduct(product);
            Toast.show({ type: 'success', text1: 'Added to Cart', text2: `${product.name} added!` });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed to add to cart', text2: err.message });
        } finally {
            setAddingId(null);
        }
    };

    const renderItem = ({ item }: { item: IProduct }) => {
        const isAdding = addingId === item._id;
        return (
            <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₦{item.price?.toLocaleString()}</Text>
                <TouchableOpacity
                    onPress={() => handleAddToCart(item)}
                    style={[styles.button, isAdding && styles.buttonDisabled]}
                    disabled={isAdding}
                    activeOpacity={0.8}
                >
                    {isAdding
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={styles.buttonText}>Add to Cart</Text>
                    }
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) return <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 50 }} />;

    if (products.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No products found in this category.</Text>
            </View>
        );
    }

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
    card:           { padding: 15, borderRadius: 10, marginBottom: 10, backgroundColor: '#FFF', elevation: 2 },
    name:           { fontWeight: 'bold', fontSize: 16, color: '#1A1A1A', marginBottom: 4 },
    price:          { marginVertical: 6, color: '#D81E5B', fontWeight: '600', fontSize: 15 },
    button:         { backgroundColor: '#D81E5B', padding: 12, borderRadius: 8, alignItems: 'center', minHeight: 44 },
    buttonDisabled: { backgroundColor: '#F0A0B8' },
    buttonText:     { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
    empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText:      { color: '#666', fontSize: 15 },
});

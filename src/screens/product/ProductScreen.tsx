import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useProducts } from '../../hooks/productAuth';
import { useCategories } from '../../hooks/category';
import { useCart } from '../../hooks/useCart';

import ProductCard from '../../components/product/ProductCard';
import ProductModal from '../../components/product/ProductModal';
import CartModal from '../../components/product/cartModal';
import BottomBar from '../../components/common/BottomBar';
import { IProduct, ICategory } from '../../types/backendType';
import Toast from 'react-native-toast-message';

// ---------------- CATEGORY CHIPS ----------------
const CategoryChips = ({
  categories,
  selected,
  onSelect,
}: {
  categories: ICategory[];
  selected: string;
  onSelect: (slug: string) => void;
}) => (
  <View style={localStyles.categoryContainer}>
    <FlatList
      data={categories}
      horizontal
      keyExtractor={(item) => item.slug}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => {
        const active = selected === item.slug;
        return (
          <TouchableOpacity
            onPress={() => onSelect(item.slug)}
            style={[localStyles.chip, active ? localStyles.chipActive : localStyles.chipInactive]}
          >
            <Text style={[localStyles.chipText, active ? localStyles.chipTextActive : localStyles.chipTextInactive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  </View>
);

export default function ProductsScreen() {
  const { cart, addProduct, refreshCart } = useCart();
  const { products, loading, error, refresh, loadMore } = useProducts();
  const { categories, loading: categoriesLoading, error: categoryError } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);

  // ---------------- HANDLERS ----------------
  const handleAddToCart = async (product: IProduct) => {
    try {
      await addProduct(product);
      // await refreshCart();
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${product.name} has been added to your cart!`,
      });
    } catch (err) {
      console.error('Failed to add product:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not add product to cart.',
      });
    }
  };

  const handleViewDetail = (product: IProduct) => {
    setSelectedProduct(product);
    setProductModalVisible(true);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setProductModalVisible(false);
  };

  const openCartModal = () => setCartModalVisible(true);
  const closeCartModal = () => setCartModalVisible(false);

  // ---------------- FILTERING ----------------
  const filteredProducts = useMemo(() => {
    let list = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.manufacturerName?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryName?.toLowerCase().includes(selectedCategory));
    }

    return list;
  }, [products, searchQuery, selectedCategory]);

  const isLoading = loading && filteredProducts.length === 0;

  // ---------------- LIST HEADER ----------------
  const renderHeader = () => (
    <View>
      <View style={localStyles.searchContainer}>
        <Feather name="search" size={20} color="#A0A0A0" />
        <TextInput
          style={localStyles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {categoriesLoading ? (
        <ActivityIndicator color="#D81E5B" style={{ marginVertical: 10 }} />
      ) : categoryError ? (
        <Text style={styles.errorText}>Could not load categories</Text>
      ) : (
        <CategoryChips categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Feather name="arrow-left" size={24} color="#111" onPress={() => {}} />
        <Text style={styles.headerTitle}>All Products</Text>

        <TouchableOpacity onPress={openCartModal} style={{ position: 'relative' }}>
          <Feather name="shopping-cart" size={24} color="#111" />
          {cart?.items && cart?.items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>Could not load products</Text>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => item._id ?? index.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard
                product={item}
                onPress={() => handleViewDetail(item)}
                onAddToCart={() => handleAddToCart(item)}
              />
            </View>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} colors={['#D81E5B']} />}
          ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No matching products found.</Text> : null}
        />
      )}

      <CartModal visible={cartModalVisible} onClose={closeCartModal} />

      <ProductModal
        visible={productModalVisible}
        product={selectedProduct}
        onClose={closeProductModal}
        onAddToCart={handleAddToCart}
      />

      <BottomBar activeRoute="ProductsScreen" cartItemCount={cart?.items?.length ?? 0} />
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const localStyles = StyleSheet.create({
  searchContainer: {
    backgroundColor: '#F3F3F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    margin: 10,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 10,
    fontSize: 16,
    color: '#111',
  },
  categoryContainer: {
    marginTop: 10,
    paddingLeft: 10,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: '#D81E5B',
  },
  chipInactive: {
    backgroundColor: '#F0F0F0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
  },
  chipTextInactive: {
    color: '#666',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 90,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 15,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
  errorText: {
    marginTop: 50,
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#D81E5B',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

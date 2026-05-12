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
import { useNavigation } from '@react-navigation/native';

import { useProducts } from '../../hooks/productAuth';
import { useCategories } from '../../hooks/category';
import { useCart } from '../../hooks/useCart';

import ProductCard from '../../components/product/ProductCard';
import ProductModal from '../../components/product/ProductModal';
import CartModal from '../../components/product/cartModal';
import BottomBar from '../../components/common/BottomBar';
import { IProduct, ICategory } from '../../types/backendType';
import Toast from 'react-native-toast-message';

// Card sizing is owned by ProductCard itself; screen only controls spacing.

// ─── Category chips ───────────────────────────────────────────────────────────
const CategoryChips = ({
  categories,
  selected,
  onSelect,
}: {
  categories: ICategory[];
  selected: string;
  onSelect: (slug: string) => void;
}) => (
  <FlatList
    data={categories}
    horizontal
    keyExtractor={(item) => item.slug}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipsRow}
    renderItem={({ item }) => {
      const active = selected === item.slug;
      return (
        <TouchableOpacity
          onPress={() => onSelect(item.slug)}
          style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    }}
  />
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const navigation = useNavigation();
  const { cart, addProduct } = useCart();
  const { products, loading, error, refresh, loadMore } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);

  const handleAddToCart = async (product: IProduct) => {
    try {
      await addProduct(product);
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${product.name} added!`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not add product to cart.' });
    }
  };

  const handleViewDetail = (product: IProduct) => {
    setSelectedProduct(product);
    setProductModalVisible(true);
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.manufacturerName?.toLowerCase().includes(q),
      );
    }
    if (selectedCategory !== 'all') {
      list = list.filter((p) =>
        p.categoryName?.toLowerCase().includes(selectedCategory),
      );
    }
    return list;
  }, [products, searchQuery, selectedCategory]);

  const cartCount = cart?.items?.length ?? 0;
  const isRefreshing = loading && filteredProducts.length === 0;

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Search */}
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#A0A0A0" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          placeholderTextColor="#AAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={17} color="#BBB" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      {categoriesLoading ? (
        <ActivityIndicator color="#D81E5B" style={{ marginVertical: 10 }} />
      ) : (
        <CategoryChips
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* Result count */}
      {!loading && (
        <Text style={styles.resultCount}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Shop</Text>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => setCartModalVisible(true)}
        >
          <Feather name="shopping-cart" size={22} color="#111" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Feather name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Could not load products.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, idx) => item._id ?? idx.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => handleViewDetail(item)}
              onAddToCart={() => handleAddToCart(item)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={['#D81E5B']} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Feather name="package" size={52} color="#DDD" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search or category filter.</Text>
              </View>
            ) : null
          }
        />
      )}

      <CartModal visible={cartModalVisible} onClose={() => setCartModalVisible(false)} />

      <ProductModal
        visible={productModalVisible}
        product={selectedProduct}
        onClose={() => { setSelectedProduct(null); setProductModalVisible(false); }}
        onAddToCart={handleAddToCart}
      />

      <BottomBar activeRoute="ProductsScreen" cartItemCount={cartCount} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D81E5B',
    borderRadius: 8,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  listHeader: { paddingTop: 14, paddingBottom: 6 },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', paddingVertical: 0 },

  // Chips
  chipsRow: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: '#D81E5B', borderColor: '#D81E5B' },
  chipInactive: { backgroundColor: '#FFF', borderColor: '#E5E5E5' },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  chipTextInactive: { color: '#555' },

  // Result count
  resultCount: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    fontWeight: '500',
  },

  // Grid — space-between fills the row; ProductCard owns its own width
  row: { justifyContent: 'space-between', marginBottom: 14 },

  // Empty / Error
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#444', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 15, color: '#555', marginTop: 12, marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#D81E5B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

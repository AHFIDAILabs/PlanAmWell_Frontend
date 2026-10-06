import React from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import HomeGreeting from '../../components/home/HomeGreeting';
import QuickActionsRow from '../../components/home/QuickActionsRow';
import AskAmWellCard from '../../components/AskAmWellSection/AskAmWellCard';
import SectionHeader from '../../components/common/SectionHeader';
import ProductCard from '../../components/product/ProductCard';
import DoctorCard from '../../components/doctor/DoctorCard';
import PartnerCard from '../../components/partner/PartnerCard';
import BottomBar from '../../components/common/BottomBar';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/productAuth';
import { useDoctors } from '../../hooks/useDoctor';
import { useTheme } from '../../context/ThemeContext';
import { IProduct } from '../../types/backendType';
import { AppStackParamList } from '../../types/App';
import Toast from 'react-native-toast-message';
import AdvocacyCarousel from '../../components/advocacy/AdvocacyCarousel';
import DoctorViewSwitcher from '../../components/doctor/DoctorViewSwitcher';
import { IDoctor } from '../../types/backendType';
import { RADIUS, SHADOW, SPACING } from '../../theme/layout';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_MARGIN = 10;
const DOCTOR_CARD_WIDTH = SCREEN_WIDTH * 0.45;
// Same width as the doctor card, so both carousels on this screen read as
// one consistent size instead of the product card dwarfing everything else.
const CAROUSEL_CARD_WIDTH = DOCTOR_CARD_WIDTH;

type HomeScreenNavigation = NavigationProp<AppStackParamList>;

interface ProductSectionProps {
    navigation: HomeScreenNavigation;
}

const ProductSection = ({ navigation }: ProductSectionProps) => {
    const { products, loading, error } = useProducts();
    const { addProduct, refreshCart } = useCart();
    const { darkMode } = useTheme();

    const handleSeeAll = () => {
        navigation.navigate('ProductsScreen' as any);
    };

    const handleAddToCart = async (product: IProduct) => {
        try {
            await addProduct(product);
            await refreshCart();
            Toast.show({
                type: 'success',
                text1: 'Added to Cart',
                text2: `${product.name} has been added to your cart!`,
            });
        } catch (err) {
            console.error("Failed to add product:", err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not add product to cart.',
            });
        }
    };
    
    if (loading) {
        return <ActivityIndicator size="large" color="#D81E5B" style={{ marginVertical: 30 }} />;
    }

    if (error) {
        return (
            <Text style={[styles.errorText, darkMode && styles.errorTextDark]}>
                Error loading products: {error}
            </Text>
        );
    }
    
    return (
        <View style={styles.productSection}>
            <SectionHeader title="Shop Pharmacy" onLinkPress={handleSeeAll} />
            {products.length > 0 ? (
                <FlatList
                    data={products} 
                    keyExtractor={item => item._id || item.sku || Math.random().toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN * 2}
                    decelerationRate="fast"
                    renderItem={({ item }) => (
                        <View style={styles.productCardWrapper}>
                            <ProductCard
                                product={item}
                                cardWidth={CAROUSEL_CARD_WIDTH}
                                onPress={() => navigation.navigate('ProductsScreen' as any, { productId: item._id })}
                                onAddToCart={handleAddToCart}
                            />
                        </View>
                    )}
                    contentContainerStyle={styles.productListContainer}
                />
            ) : (
                <Text style={[styles.noDataText, darkMode && styles.noDataTextDark]}>
                    No products currently available.
                </Text>
            )}
        </View>
    );
};

const DoctorSection = () => {
    const { doctors, loading, error } = useDoctors();
    const navigation = useNavigation<HomeScreenNavigation>();
    const { darkMode } = useTheme(); 
    

    const handleSeeAll = () => {
        navigation.navigate('AllDoctorScreen' as any); 
    };

    if (loading) {
        return <ActivityIndicator size="small" color="#D81E5B" style={{ marginVertical: 10 }} />;
    }
    
    return (
        <View style={styles.doctorSectionWrapper}>
            <SectionHeader title="Consult a Doctor" onLinkPress={handleSeeAll} />
            
            <FlatList
                data={doctors} 
                keyExtractor={item => item._id || Math.random().toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                renderItem={({ item }) => {
                    const imageUri = 
                        (typeof item.profileImage === 'string' ? item.profileImage : null) || 
                        item.doctorImage?.imageUrl || 
                        'https://placehold.co/150x150?text=No+Image';

                    return (
                        <View style={styles.doctorCardWrapper}>
                            <DoctorCard
                                key={item._id}
                                name={`Dr. ${item.firstName} ${item.lastName}`}
                                specialty={item.specialization}
                                avatar={{ uri: imageUri }}
                                rating={item.ratings}
                                reviewCount={item.reviewCount}
                                onPress={() => navigation.navigate('DoctorScreen' as any, { doctor: item })}
                            />
                        </View>
                    );
                }}
                contentContainerStyle={styles.doctorListContainer}
            />
            {error && (
                <Text style={[styles.errorText, darkMode && styles.errorTextDark]}>
                    {error}
                </Text>
            )}
            {doctors.length === 0 && !loading && !error && (
                <Text style={[styles.noDataText, darkMode && styles.noDataTextDark]}>
                    No doctors currently available.
                </Text>
            )}
        </View>
    );
};

export default function HomeScreen() {
    const { isAnonymous, user } = useAuth();
    const { cart } = useCart();
    const route = useRoute();
    const navigation = useNavigation<HomeScreenNavigation>();
    const { darkMode } = useTheme();

     // Check if user is a doctor
    const isDoctor = user && 'status' in user && (user as IDoctor).status === 'approved';

    let greetingName = "Guest"; 
    if (user && 'name' in user && user.name) { 
        greetingName = user.name.split(' ')[0]; 
    } else if (user && 'firstName' in user && user.firstName) { 
        greetingName = user.firstName;
    }

    const BOTTOM_BAR_TOTAL_HEIGHT = 90;


    const handleViewSwitch = (view: 'dashboard' | 'home') => {
        if (view === 'dashboard' && isDoctor) {
            navigation.navigate('DoctorDashScreen' as never);
        }
    };
    
    return (
        <View style={[styles.fullContainer, darkMode && styles.fullContainerDark]}>
            <ScrollView
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ 
                    paddingBottom: BOTTOM_BAR_TOTAL_HEIGHT, 
                    paddingHorizontal: 20,
                }}
            >
                <HomeGreeting name={greetingName} highlight={!isAnonymous} />

        {/* View Switcher - Only show for doctors */}
                {isDoctor && (
                    <DoctorViewSwitcher
                        currentView="home"
                        onSwitchView={handleViewSwitch}
                    />
                )}
                <AskAmWellCard />

                <QuickActionsRow />

                <TouchableOpacity
                    style={styles.communityPromo}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('CommunityHubScreen' as never)}
                >
                    <LinearGradient
                        colors={['#D81E5B', '#0058A4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.communityPromoGradient}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.communityPromoTitle}>Community Hub</Text>
                            <Text style={styles.communityPromoSubtitle}>
                                Support groups, workshops, and question and answer sessions. Join with a chosen name.
                            </Text>
                        </View>
                        <Feather name="users" size={32} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                </TouchableOpacity>

                <ProductSection navigation={navigation} />

                <DoctorSection />

                <AdvocacyCarousel />

                <View style={styles.partnersSection}>
                    <SectionHeader
                        title="Our Partners"
                        onLinkPress={() => navigation.navigate("AllActivePartnerScreen" as any)}
                    />
                    <PartnerCard />
                </View>
            </ScrollView>
            
            <View style={styles.bottomBarWrapper}>
                <BottomBar
                    activeRoute={route.name}
                    cartItemCount={cart?.totalItems ?? 0}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullContainer: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        paddingTop: 60,
    },
    fullContainerDark: {
        backgroundColor: '#0A0A0A',
    },
    communityPromo: {
        marginBottom: SPACING.md,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOW.medium,
    },
    communityPromoGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 14,
    },
    communityPromoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    communityPromoSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        lineHeight: 17,
    },

    doctorSectionWrapper: {
        marginBottom: SPACING.md,
    },
    doctorListContainer: {
        paddingVertical: 5,
    },
    doctorCardWrapper: {
        width: DOCTOR_CARD_WIDTH + CAROUSEL_CARD_MARGIN,
        marginRight: CAROUSEL_CARD_MARGIN,
        alignItems: 'center',
        paddingVertical: 5,
    },

    productSection: {
        marginBottom: SPACING.md,
    },
    productListContainer: {
        paddingVertical: 5,
    },
    productCardWrapper: {
        width: CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN,
        marginRight: CAROUSEL_CARD_MARGIN,
        alignItems: 'center',
    },

    partnersSection: {
        marginBottom: SPACING.md,
    },

    noDataText: {
        textAlign: 'center',
        color: '#888', 
        marginTop: 20,
    },
    noDataTextDark: {
        color: '#B0B0B0', 
    },
    errorText: {
        textAlign: 'center',
        color: '#FF0000', 
        marginTop: 20,
    },
    errorTextDark: {
        color: '#FF7070',
    },
    
    bottomBarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    }
});
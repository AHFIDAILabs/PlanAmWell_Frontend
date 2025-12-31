import React from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text, FlatList, Dimensions } from 'react-native';
import { useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import Header from '../../components/home/header';
import AskAmWellCard from '../../components/AskAmWellSection/AskAmWellCard';
import SectionHeader from '../../components/common/SectionHeader';
import ProductCard from '../../components/product/ProductCard';
import DoctorCard from '../../components/doctor/DoctorCard';
import PartnerCard from '../../components/partner/PartnerCard';
import AboutCard from '../../components/AboutCard';
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
import SocialSticky  from '../../components/socials/socialMedia';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CAROUSEL_CARD_MARGIN = 10;
const DOCTOR_CARD_WIDTH = SCREEN_WIDTH * 0.45; 

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
            <SectionHeader title="Our Products" onLinkPress={handleSeeAll} />
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
            <SectionHeader title="Our Doctors" onLinkPress={handleSeeAll} />
            
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
                                onPress={() => navigation.navigate('DoctorScreen' as any, { doctor: item })}
                            />
                        </View>
                    );
                }}
                contentContainerStyle={styles.doctorListContainer}
            />
            {error && (
                <Text style={[
                    error.includes('mock profiles') ? styles.infoText : styles.errorText,
                    darkMode && (error.includes('mock profiles') ? styles.infoTextDark : styles.errorTextDark)
                ]}>
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
    const route = useRoute();
    const navigation = useNavigation<HomeScreenNavigation>();
    const { darkMode } = useTheme();

    let greetingName = "Guest"; 
    if (user && 'name' in user && user.name) { 
        greetingName = user.name.split(' ')[0]; 
    } else if (user && 'firstName' in user && user.firstName) { 
        greetingName = user.firstName;
    }

    const titleText = `Welcome, ${greetingName}!`;
    const BOTTOM_BAR_TOTAL_HEIGHT = 90; 
    
    return (
        <View style={[styles.fullContainer, darkMode && styles.fullContainerDark]}> 
        <SocialSticky />
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ 
                    paddingBottom: BOTTOM_BAR_TOTAL_HEIGHT, 
                    paddingHorizontal: 20,
                }}
            >
                <Header 
                    title={titleText} 
                    subtitle="PlanAmWell" 
                    subtitleColor={!isAnonymous ? '#D81E5B' : '#1A1A1A'}
                />

                <AskAmWellCard />

                <ProductSection navigation={navigation} /> 

                <DoctorSection /> 

                <AdvocacyCarousel />

<SectionHeader 
  title="Our Partners" 
  onLinkPress={() => navigation.navigate("AllActivePartnerScreen" as any)} 
/>
                
                    <PartnerCard />
                   
               

                <AboutCard />
            </ScrollView>
            
            <View style={styles.bottomBarWrapper}>
                <BottomBar 
                    activeRoute={route.name} 
                    cartItemCount={0}
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
    
    doctorSectionWrapper: {
        marginBottom: 32,
        paddingHorizontal: 0,
    },
    doctorListContainer: {
        paddingHorizontal: 20,
        paddingBottom: 5,
    },
    doctorCardWrapper: {
        width: DOCTOR_CARD_WIDTH + CAROUSEL_CARD_MARGIN, 
        marginRight: CAROUSEL_CARD_MARGIN, 
        alignItems: 'center',
        paddingVertical: 5,
    },
    
    productSection: { 
        marginBottom: 30,
        paddingHorizontal: 0,
    },
    productListContainer: {
        paddingHorizontal: 20,
        paddingBottom: 5,
    },
    productCardWrapper: {
        width: CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN, 
        marginRight: CAROUSEL_CARD_MARGIN,
        alignItems: 'center',
    },
    
    partnerRow: { 
        flexDirection: 'row', 
        gap: 16, 
        marginBottom: 40 
    },
    
    noDataText: {
        textAlign: 'center',
        color: '#888', 
        marginTop: 20,
    },
    noDataTextDark: {
        color: '#B0B0B0', 
    },
    infoText: {
        textAlign: 'center',
        color: '#ffc107', 
        marginTop: 10,
        fontSize: 12,
    },
    infoTextDark: {
        color: '#FFE082', 
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
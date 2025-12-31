import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated, Linking, Dimensions, PanResponder } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const EDGE_PADDING = 10;

const SocialSticky = () => {
const pan = useRef(new Animated.ValueXY({ x: width - 60, y: height * 0.3 })).current;

const latestPos = useRef({ x: width - 60, y: height * 0.3 });

useEffect(() => {
  const id = pan.addListener((v) => {
    latestPos.current = v; // Always keep the latest x/y
  });
  return () => {
    pan.removeListener(id);
  };
}, [pan]);


const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset(latestPos.current); // Use the tracked value
    },
    onPanResponderMove: (e, gesture) => {
  pan.setValue({
    x: latestPos.current.x + gesture.dx,
    y: latestPos.current.y + gesture.dy,
  });
},

    onPanResponderRelease: () => {
      pan.flattenOffset();

      // Snap to right edge
      Animated.spring(pan.x, {
        toValue: width - 60 - EDGE_PADDING,
        useNativeDriver: false,
        bounciness: 8,
      }).start();

      // Clamp Y
      const clampedY = Math.min(Math.max(latestPos.current.y, EDGE_PADDING), height - 200);
      Animated.spring(pan.y, {
        toValue: clampedY,
        useNativeDriver: false,
        bounciness: 8,
      }).start();
    },
  })
).current;

  const openLink = (url: string) => {
    if (!url.startsWith("http")) url = `https://${url}`;
    Linking.openURL(url);
  };

  const socialButtons = [
    { name: "facebook", icon: <FontAwesome name="facebook" size={28} color="#4267B2" />, url: "facebook.com/yourpage" },
    { name: "instagram", icon: <FontAwesome name="instagram" size={28} color="#C13584" />, url: "instagram.com/yourpage" },
    { name: "twitter", icon: <FontAwesome name="twitter" size={28} color="#1DA1F2" />, url: "twitter.com/yourpage" },
    { name: "linkedin", icon: <FontAwesome name="linkedin" size={28} color="#0077B5" />, url: "linkedin.com/yourpage" },
  ];

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
      {...panResponder.panHandlers}
    >
      {socialButtons.map((btn) => (
        <TouchableOpacity key={btn.name} style={styles.iconWrapper} onPress={() => openLink(btn.url)}>
          {btn.icon}
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

export default SocialSticky;

const styles = StyleSheet.create({
container: {
  position: "absolute",
  zIndex: 999,
},

  iconWrapper: {
    marginVertical: 8,
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 50,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

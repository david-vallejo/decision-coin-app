import React from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

/**
 * Coin Component
 * Displays the coin with flip animation and gesture handling
 * Fast, longer animation (3+ seconds) with multiple rotations
 * Prevents overlapping animations with internal state guards
 */
const Coin = ({ side, isFlipping, onFlipStart, customSideA, customSideB }) => {
  const flipAnimation = React.useRef(new Animated.Value(0)).current;

  // Guard: Ensure side is valid, default to 'Heads'
  const displaySide = side || 'Heads';
  
  // Determine which label to show (custom or default)
  const getSideLabel = (sideValue) => {
    if (sideValue === 'A') {
      return customSideA && customSideA.trim() ? customSideA.trim() : 'A';
    }
    if (sideValue === 'B') {
      return customSideB && customSideB.trim() ? customSideB.trim() : 'B';
    }
    return sideValue; // 'Heads' or 'Tails'
  };

  // Pan gesture for flicking the coin upward
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      // Only trigger flip if flicking upward (negative velocityY) and not already flipping
      if (event.velocityY < -500 && !isFlipping && onFlipStart) {
        onFlipStart();
      }
    });

  // Animate coin flip with fast, longer animation (3+ seconds)
  React.useEffect(() => {
    if (isFlipping) {
      // Reset animation value
      flipAnimation.setValue(0);

      // Create fast, longer flip animation with multiple rotations
      // Using easeOut for natural deceleration
      Animated.timing(flipAnimation, {
        toValue: 1,
        duration: 3200, // 3.2 seconds total
        easing: Easing.out(Easing.cubic), // Fast start, slow end
        useNativeDriver: true,
      }).start();
    }
  }, [isFlipping, side]);

  // Interpolate rotation - multiple full rotations for dramatic effect
  // Fast at the beginning, slower at the end
  const rotateY = flipAnimation.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: ['0deg', '1080deg', '2160deg', '3240deg'], // 9 full rotations (fast spinning)
  });

  // Interpolate scale for dynamic effect - slight bounce
  const scale = flipAnimation.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [1, 1.15, 1.2, 1.05, 1], // Slight growth then return
  });

  // Add slight vertical movement for more realistic flip
  const translateY = flipAnimation.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, -30, -20, 0], // Up then down
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.coin,
            {
              transform: [
                { rotateY },
                { scale },
                { translateY },
              ],
            },
          ]}
        >
          <View style={styles.coinFace}>
            <Text style={styles.coinText}>{getSideLabel(displaySide)}</Text>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  coin: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E5E5E5',
    borderWidth: 4,
    borderColor: '#B0B0B0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coinFace: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  coinText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
});

export default Coin;

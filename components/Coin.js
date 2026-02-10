import React, { useRef, useEffect } from 'react';
import { View, Text, Image, Animated, StyleSheet, Easing } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const COIN_SIZE = 200;
const FLIP_DURATION = 3200;
const TOTAL_ROTATIONS = 9;
const TOTAL_DEGREES = TOTAL_ROTATIONS * 360;

const headsImage = require('../assets/quarter_heads.png');
const tailsImage = require('../assets/quarter_tails.png');

/**
 * 3D Quarter Coin Component
 * Uses real US quarter images with perspective-based 3D flip animation.
 * Each side gets its own rotation so backfaceVisibility works correctly.
 */
const Coin = ({ side, isFlipping, onFlipStart, customSideA, customSideB }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;

  const displaySide = side || 'Heads';

  const getSideLabel = (sideValue) => {
    if (sideValue === 'A') {
      return customSideA && customSideA.trim() ? customSideA.trim() : 'A';
    }
    if (sideValue === 'B') {
      return customSideB && customSideB.trim() ? customSideB.trim() : 'B';
    }
    return sideValue;
  };

  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.velocityY < -500 && !isFlipping && onFlipStart) {
        onFlipStart();
      }
    });

  // Idle gentle wobble
  useEffect(() => {
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idleAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    wobble.start();
    return () => wobble.stop();
  }, []);

  // Flip animation
  useEffect(() => {
    if (isFlipping) {
      flipAnim.setValue(0);
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: FLIP_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isFlipping, side]);

  // Add 180deg when result is tails so the flip lands on the tails image
  const isResultTails = displaySide === 'Tails' || displaySide === 'B';
  const extraHalf = isResultTails ? 180 : 0;

  // Front side (heads): rotateX for forward coin-toss flip
  const frontRotateX = isFlipping
    ? flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${TOTAL_DEGREES + extraHalf}deg`],
      })
    : idleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isResultTails ? '172deg' : '-5deg', isResultTails ? '188deg' : '5deg'],
      });

  // Back side (tails): offset 180deg from front on X axis
  const backRotateX = isFlipping
    ? flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', `${180 + TOTAL_DEGREES + extraHalf}deg`],
      })
    : idleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isResultTails ? '-5deg' : '172deg', isResultTails ? '5deg' : '188deg'],
      });

  // Arc trajectory during flip
  const translateY = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.8, 1],
    outputRange: [0, -120, -80, -15, 0],
  });

  // Scale pulse during flip
  const scale = isFlipping
    ? flipAnim.interpolate({
        inputRange: [0, 0.2, 0.5, 0.8, 1],
        outputRange: [1, 1.15, 1.2, 1.05, 1],
      })
    : 1;

  // Shadow effects
  const shadowOpacity = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.8, 1],
    outputRange: [0.4, 0.1, 0.15, 0.3, 0.4],
  });

  const shadowScale = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.8, 1],
    outputRange: [1, 0.6, 0.7, 0.9, 1],
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* Ground shadow */}
        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: isFlipping ? shadowOpacity : 0.35,
              transform: [
                { scaleX: isFlipping ? shadowScale : 1 },
                { scaleY: 0.15 },
              ],
            },
          ]}
        />

        {/* Position wrapper for translateY + scale during flip */}
        <Animated.View
          style={[
            styles.coinPositioner,
            {
              transform: [
                { scale },
                ...(isFlipping ? [{ translateY }] : []),
              ],
            },
          ]}
        >
          {/* Heads side - own rotation + backfaceVisibility */}
          <Animated.View
            style={[
              styles.coinSide,
              {
                transform: [
                  { perspective: 800 },
                  { rotateX: frontRotateX },
                ],
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <Image source={headsImage} style={styles.coinImage} />
          </Animated.View>

          {/* Tails side - offset 180deg rotation + backfaceVisibility */}
          <Animated.View
            style={[
              styles.coinSide,
              {
                transform: [
                  { perspective: 800 },
                  { rotateX: backRotateX },
                ],
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <Image source={tailsImage} style={styles.coinImage} />
          </Animated.View>
        </Animated.View>

        {/* Result label */}
        {!isFlipping && side && (
          <Text style={styles.resultLabel}>{getSideLabel(displaySide)}</Text>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    height: COIN_SIZE + 80,
  },
  shadow: {
    position: 'absolute',
    bottom: 15,
    width: COIN_SIZE * 0.8,
    height: COIN_SIZE * 0.8,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#000',
  },
  coinPositioner: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinSide: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  coinImage: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
  },
  resultLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default Coin;

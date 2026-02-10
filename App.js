import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Keyboard,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import Coin from './components/Coin';
import HistoryPanel from './components/HistoryPanel';
import { saveFlipToHistory } from './utils/storage';

/**
 * Decision Coin App - Main Component
 * 
 * Features:
 * - Flip coin via button or gesture
 * - Reset via shake or button
 * - Custom coin sides (A/B or default Heads/Tails)
 * - History tracking (last 10 flips)
 * - Haptic feedback
 * - Crash-proof error handling
 * 
 * Safety Guards:
 * - Prevents overlapping flips
 * - Sanitizes user input
 * - Handles AsyncStorage errors gracefully
 * - Guards against null/undefined state
 */

const App = () => {
  // Coin state
  const [side, setSide] = useState(null); // null = no result yet, 'Heads'/'Tails'/'A'/'B' = result
  const [isFlipping, setIsFlipping] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSideA, setCustomSideA] = useState('');
  const [customSideB, setCustomSideB] = useState('');
  
  // UI state
  const [historyVisible, setHistoryVisible] = useState(false);
  
  // Refs for shake detection and flick detection
  const shakeTimeoutRef = useRef(null);
  const lastShakeTimeRef = useRef(0);
  const lastFlickTimeRef = useRef(0);
  const prevYRef = useRef(0);
  const subscriptionRef = useRef(null);

  // Guard: Prevent overlapping flips
  const flipInProgressRef = useRef(false);

  // Animation duration constant (matches Coin component)
  const FLIP_ANIMATION_DURATION = 3200; // 3.2 seconds

  /**
   * Flip the coin
   * Returns random result (Heads/Tails or A/B based on mode)
   * Guards against overlapping flips
   */
  const flipCoin = async () => {
    // Guard: Prevent overlapping flips
    if (flipInProgressRef.current || isFlipping) {
      return;
    }

    try {
      flipInProgressRef.current = true;
      setIsFlipping(true);

      // Haptic feedback
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Ignore haptic errors - not critical
        console.warn('Haptic feedback error:', error);
      }

      // Wait for animation to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Determine result
      let result;
      if (isCustomMode) {
        // Guard: Ensure custom sides are valid, default to 'A' or 'B'
        const sideA = customSideA && customSideA.trim() ? 'A' : 'A';
        const sideB = customSideB && customSideB.trim() ? 'B' : 'B';
        result = Math.random() < 0.5 ? sideA : sideB;
      } else {
        result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      }

      // Wait for animation to complete (match the 3.2 second animation duration)
      await new Promise((resolve) => setTimeout(resolve, FLIP_ANIMATION_DURATION - 100));

      setSide(result);
      setIsFlipping(false);
      flipInProgressRef.current = false;

      // Save to history
      try {
        // Get display label for history
        let historyLabel = result;
        if (result === 'A' && customSideA && customSideA.trim()) {
          historyLabel = customSideA.trim();
        } else if (result === 'B' && customSideB && customSideB.trim()) {
          historyLabel = customSideB.trim();
        }
        await saveFlipToHistory(historyLabel);
      } catch (error) {
        // History save failure is non-critical - log but don't crash
        console.error('Failed to save flip to history:', error);
      }

      // Haptic feedback for result
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // Ignore haptic errors
      }
    } catch (error) {
      // Guard: Always reset state on error
      console.error('flipCoin error:', error);
      setIsFlipping(false);
      flipInProgressRef.current = false;
    }
  };

  /**
   * Reset the current result
   * Only clears the display, not history
   */
  const resetResult = () => {
    // Guard: Don't reset during flip
    if (isFlipping || flipInProgressRef.current) {
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setSide(null);
    } catch (error) {
      console.error('resetResult error:', error);
    }
  };

  /**
   * Setup shake detection using Accelerometer
   * Guards against memory leaks with proper cleanup
   */
  useEffect(() => {
    let isMounted = true;

    const setupShakeDetection = async () => {
      try {
        // Check if accelerometer is available
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable || !isMounted) {
          return;
        }

        // Set update interval
        Accelerometer.setUpdateInterval(100);

        // Subscribe to accelerometer updates
        subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
          // Guard: Ensure values are valid numbers
          if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            typeof z !== 'number'
          ) {
            return;
          }

          const now = Date.now();

          // Detect upward flick: sudden spike in Y acceleration
          // When phone is held upright, flicking up causes y to spike positive
          const yDelta = y - prevYRef.current;
          prevYRef.current = y;

          if (yDelta > 0.8 && now - lastFlickTimeRef.current > 4000 && !flipInProgressRef.current) {
            lastFlickTimeRef.current = now;
            if (isMounted) {
              flipCoin();
            }
            return;
          }

          // Calculate acceleration magnitude for shake detection
          const acceleration = Math.sqrt(x * x + y * y + z * z);
          const threshold = 1.5;

          // Guard: Prevent rapid shake triggers (debounce)
          if (acceleration > threshold && now - lastShakeTimeRef.current > 1000) {
            lastShakeTimeRef.current = now;

            // Clear existing timeout
            if (shakeTimeoutRef.current) {
              clearTimeout(shakeTimeoutRef.current);
            }

            // Set timeout to trigger reset (debounce)
            shakeTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                resetResult();
              }
            }, 100);
          }
        });
      } catch (error) {
        // Gracefully handle accelerometer errors
        console.error('Shake detection setup error:', error);
      }
    };

    setupShakeDetection();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Get display label for current side
   */
  const getDisplayLabel = () => {
    if (!side) {
      return 'Ready';
    }
    if (side === 'A' && customSideA && customSideA.trim()) {
      return customSideA.trim();
    }
    if (side === 'B' && customSideB && customSideB.trim()) {
      return customSideB.trim();
    }
    return side;
  };

  /**
   * Toggle between default and custom mode
   */
  const toggleMode = () => {
    // Guard: Don't toggle during flip
    if (isFlipping || flipInProgressRef.current) {
      return;
    }

    Keyboard.dismiss();
    setIsCustomMode(!isCustomMode);
    // Reset result when switching modes
    setSide(null);
  };

  /**
   * Sanitize custom side input
   * Allow at least 10 words (150 characters should be enough)
   */
  const handleCustomSideAChange = (text) => {
    // Guard: Limit length but don't trim - trimming removes spaces between words while typing
    const sanitized = text.substring(0, 150);
    setCustomSideA(sanitized);
  };

  const handleCustomSideBChange = (text) => {
    // Guard: Limit length but don't trim - trimming removes spaces between words while typing
    const sanitized = text.substring(0, 150);
    setCustomSideB(sanitized);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>Decision Coin</Text>
          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            style={styles.historyButton}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            onPress={toggleMode}
            style={[
              styles.modeButton,
              !isCustomMode && styles.modeButtonActive,
            ]}
            disabled={isFlipping}
          >
            <Text
              style={[
                styles.modeButtonText,
                !isCustomMode && styles.modeButtonTextActive,
              ]}
            >
              Heads/Tails
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleMode}
            style={[
              styles.modeButton,
              isCustomMode && styles.modeButtonActive,
            ]}
            disabled={isFlipping}
          >
            <Text
              style={[
                styles.modeButtonText,
                isCustomMode && styles.modeButtonTextActive,
              ]}
            >
              Custom (A/B)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Side Inputs */}
        {isCustomMode && (
          <View style={styles.customInputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Side A:</Text>
              <TextInput
                style={styles.input}
                value={customSideA}
                onChangeText={handleCustomSideAChange}
                placeholder="Enter label for A (up to 150 characters)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                maxLength={150}
                multiline={true}
                numberOfLines={3}
                editable={!isFlipping}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Side B:</Text>
              <TextInput
                style={styles.input}
                value={customSideB}
                onChangeText={handleCustomSideBChange}
                placeholder="Enter label for B (up to 150 characters)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                maxLength={150}
                multiline={true}
                numberOfLines={3}
                editable={!isFlipping}
              />
            </View>
          </View>
        )}

        {/* Coin Component */}
        <Coin
          side={side || 'Heads'} // Pass default for display
          isFlipping={isFlipping}
          onFlipStart={flipCoin}
          customSideA={customSideA}
          customSideB={customSideB}
        />

        {/* Result Display */}
        {side && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Result:</Text>
            <Text style={styles.resultText}>{getDisplayLabel()}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={flipCoin}
            style={[styles.button, styles.flipButton, isFlipping && styles.buttonDisabled]}
            disabled={isFlipping}
          >
            <Text style={styles.buttonText}>
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </Text>
          </TouchableOpacity>

          {side && (
            <TouchableOpacity
              onPress={resetResult}
              style={[styles.button, styles.resetButton, isFlipping && styles.buttonDisabled]}
              disabled={isFlipping}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            • Tap "Flip Coin" or flick the coin upward to flip
          </Text>
          <Text style={styles.instructionText}>
            • Flick your phone upward to toss the coin
          </Text>
          <Text style={styles.instructionText}>
            • Shake device or tap "Reset" to clear result
          </Text>
          <Text style={styles.instructionText}>
            • View history to see last 10 flips
          </Text>
        </View>
      </ScrollView>

      {/* History Panel */}
      <HistoryPanel
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2C3A47',
  },
  container: {
    flex: 1,
    backgroundColor: '#2C3A47',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1B9CFC',
    borderRadius: 20,
  },
  historyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E2A34',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#1B9CFC',
  },
  modeButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  customInputs: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3D4F5F',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#1E2A34',
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#1E2A34',
    borderRadius: 16,
  },
  resultLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  flipButton: {
    backgroundColor: '#1B9CFC',
  },
  resetButton: {
    backgroundColor: '#3D4F5F',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructions: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#1E2A34',
    borderRadius: 12,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default App;

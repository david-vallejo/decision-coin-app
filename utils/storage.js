import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@decision_coin_history';
const MAX_HISTORY_ENTRIES = 10;

/**
 * Storage utility functions with error handling
 * Guards against AsyncStorage failures to prevent crashes
 */

/**
 * Save a flip result to history
 * Automatically maintains max 10 entries
 * @param {string} side - The coin side result (e.g., "Heads", "Tails", or custom)
 * @returns {Promise<boolean>} - True if saved successfully, false otherwise
 */
export const saveFlipToHistory = async (side) => {
  try {
    // Guard: Ensure side is valid
    if (!side || typeof side !== 'string') {
      console.warn('saveFlipToHistory: Invalid side parameter');
      return false;
    }

    const timestamp = Date.now();
    const entry = {
      side: side.trim(),
      timestamp: timestamp,
    };

    // Get current history
    const currentHistory = await getHistory();

    // Add new entry at the beginning
    const updatedHistory = [entry, ...currentHistory];

    // Keep only last 10 entries (guard against exceeding limit)
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ENTRIES);

    // Save back to storage
    const jsonValue = JSON.stringify(trimmedHistory);
    await AsyncStorage.setItem(HISTORY_KEY, jsonValue);

    return true;
  } catch (error) {
    // Gracefully handle storage errors - don't crash the app
    console.error('saveFlipToHistory error:', error);
    return false;
  }
};

/**
 * Get flip history from storage
 * @returns {Promise<Array>} - Array of history entries, empty array on error
 */
export const getHistory = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
    
    // Guard: Handle null/empty storage
    if (jsonValue == null) {
      return [];
    }

    const parsed = JSON.parse(jsonValue);

    // Guard: Ensure parsed value is an array
    if (!Array.isArray(parsed)) {
      console.warn('getHistory: Stored data is not an array, returning empty array');
      return [];
    }

    return parsed;
  } catch (error) {
    // Gracefully handle storage errors
    console.error('getHistory error:', error);
    return [];
  }
};

/**
 * Clear all history from storage
 * @returns {Promise<boolean>} - True if cleared successfully, false otherwise
 */
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    // Gracefully handle storage errors
    console.error('clearHistory error:', error);
    return false;
  }
};

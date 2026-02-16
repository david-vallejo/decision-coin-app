import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getHistory, clearHistory } from '../utils/storage';

/**
 * HistoryPanel Component
 * Modal/slide-out panel showing flip history
 * Handles storage errors gracefully
 */
const HistoryPanel = ({ visible, onClose }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history when modal opens
  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const historyData = await getHistory();
      // Guard: Ensure history is an array
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('HistoryPanel loadHistory error:', error);
      setHistory([]); // Fallback to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const success = await clearHistory();
      if (success) {
        setHistory([]);
      }
      // If it fails, the error is already logged in storage.js
    } catch (error) {
      console.error('HistoryPanel handleClearHistory error:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    // Guard: Ensure timestamp is valid
    if (!timestamp || typeof timestamp !== 'number') {
      return 'Unknown time';
    }

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('formatTimestamp error:', error);
      return 'Unknown time';
    }
  };

  const renderHistoryItem = ({ item, index }) => {
    // Guard: Ensure item is valid
    if (!item || typeof item !== 'object') {
      return null;
    }

    const side = item.side || 'Unknown';
    const timestamp = item.timestamp || Date.now();

    return (
      <View style={styles.historyItem}>
        <Text style={styles.historySide}>{side}</Text>
        <Text style={styles.historyTime}>{formatTimestamp(timestamp)}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Flip History</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No flip history yet</Text>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              <FlatList
                data={history}
                renderItem={renderHistoryItem}
                keyExtractor={(item, index) => {
                  // Guard: Create unique key
                  return item.timestamp
                    ? `${item.timestamp}-${index}`
                    : `item-${index}`;
                }}
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
              />
              <TouchableOpacity
                onPress={handleClearHistory}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear History</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#2C3A47',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3D4F5F',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  listWrapper: {
    flex: 1,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E2A34',
    borderRadius: 12,
    marginBottom: 12,
  },
  historySide: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  historyTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 12,
  },
  clearButton: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HistoryPanel;

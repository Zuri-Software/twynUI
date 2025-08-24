import React from 'react';
import { Modal, View, StyleSheet, Text } from 'react-native';
import { Loading, LoadingType } from './LoadingStates';
import { COMPONENT_RADIUS } from '../../styles/borderRadius';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  type?: LoadingType;
  color?: string;
  transparent?: boolean;
}

/**
 * LoadingOverlay - Full-screen loading overlay component
 * 
 * Features:
 * - Modal-based overlay that blocks interaction
 * - Customizable loading animations
 * - Optional loading messages
 * - Transparent or solid backgrounds
 * - Used for operations that require user to wait
 */
export default function LoadingOverlay({
  visible,
  message,
  type = LoadingType.SPINNER,
  color = '#007AFF',
  transparent = true,
}: LoadingOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Loading
            type={type}
            message={message}
            color={color}
            size="large"
          />
          {message && (
            <Text style={[styles.message, { color }]}>{message}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: COMPONENT_RADIUS.modal,
    padding: 32,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 200,
  },
});
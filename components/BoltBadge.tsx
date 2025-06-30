import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';

interface BoltBadgeProps {
  size?: number;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  style?: any;
}

export function BoltBadge({ 
  size = 40, 
  position = 'bottom-right',
  style 
}: BoltBadgeProps) {
  const handlePress = () => {
    Linking.openURL('https://bolt.new');
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyle, top: 20, right: 20 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 20, right: 20 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 20, left: 20 };
      case 'top-left':
        return { ...baseStyle, top: 20, left: 20 };
      default:
        return { ...baseStyle, bottom: 20, right: 20 };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getPositionStyle(),
        { width: size, height: size },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        source={require('../assets/images/black_circle_360x360.png')}
        style={[styles.badge, { width: size, height: size }]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badge: {
    borderRadius: 50,
  },
});
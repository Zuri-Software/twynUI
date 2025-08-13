import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface StaggeredGridProps<T> {
  data: T[];
  columns?: number;
  spacing?: number;
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
}

export default function StaggeredGrid<T>({
  data,
  columns = 2,
  spacing = 12,
  renderItem,
  keyExtractor = (item, index) => `${index}`,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: StaggeredGridProps<T>) {
  
  // Calculate column width
  const columnWidth = (screenWidth - spacing * (columns + 1)) / columns;

  // Distribute items across columns
  const getColumnItems = (columnIndex: number): T[] => {
    return data.filter((_, index) => index % columns === columnIndex);
  };

  // Render a column
  const renderColumn = (columnIndex: number) => {
    const columnItems = getColumnItems(columnIndex);
    
    return (
      <View key={columnIndex} style={[styles.column, { width: columnWidth }]}>
        {columnItems.map((item, index) => {
          const originalIndex = data.findIndex((dataItem) => dataItem === item);
          return (
            <View key={keyExtractor(item, originalIndex)} style={{ marginBottom: spacing }}>
              {renderItem(item, originalIndex)}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingHorizontal: spacing },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      <View style={[styles.grid, { gap: spacing }]}>
        {Array.from({ length: columns }, (_, index) => renderColumn(index))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },
});
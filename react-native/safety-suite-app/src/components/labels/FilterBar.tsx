import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable, Text } from 'react-native';
import { Surface } from 'react-native-paper';

import { platformIOS } from '../../../utils/utils';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { Category, getBgSelectedColor } from '../../data/label';
import { useLabels } from '../../hooks/use-labels';

const FooterItem = (props: {
  category: Category;
  isActive: boolean;
  handleCategoryChange: (cat: string) => void;
}) => {
  const { category, isActive, handleCategoryChange } = props;

  const activeItemColor: string = getBgSelectedColor(category.bgColor);
  const footerItemStyle = StyleSheet.create({
    surface: {
      margin: 2,
      padding: 1,
      backgroundColor: category.bgColor, //itemColor,
      borderRadius: 10,
      height: windowHeight * 0.075,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: windowWidth * 0.12,
    },
    activeSurface: {
      marginTop: 15,
      marginBottom: 15,
      padding: 2,
      backgroundColor: activeItemColor,
      borderRadius: 7,
      height: windowHeight * 0.075,
      minWidth: windowWidth * 0.12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: category.bgColor,
    },
    text: {
      color: category.textColor || 'white',
      fontSize: 16,
      padding: 3,
      margin: 3,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    chip: {
      backgroundColor: activeItemColor,
      height: windowHeight * 0.075,
      color: 'white',
      fontSize: 20,
      padding: 5,
      margin: 3,
      textAlign: 'center',
    },
  });

  const handlePress = () => {
    if (!category.category) {
      handleCategoryChange('');
      console.warn(
        'Tried to remove category filter but category was empty string',
        category,
      );
      return;
    }

    handleCategoryChange(category.category);
  };

  return (
    <View style={styles.surfaceContainer}>
      <Pressable onPress={handlePress}>
        <Surface
          style={isActive ? footerItemStyle.activeSurface : footerItemStyle.surface}
          elevation={3}
        >
          <Text style={footerItemStyle.text}>{category.category}</Text>
        </Surface>
      </Pressable>
    </View>
  );
}; // end foot item

const Separator = () => {
  return <View style={styles.footerItem} />;
};

const FilterBar = () => {
  const [{ handleCategoryChange, category: selectedCategory, categories }] = useLabels();

  const renderItem = useCallback(
    ({ item }: { item: Category }) => {
      return (
        <FooterItem
          category={item}
          isActive={selectedCategory === item.category}
          handleCategoryChange={handleCategoryChange}
        />
      );
    },
    [handleCategoryChange, selectedCategory]
  );

  return (
    <View>
      <FlatList
        data={categories}
        scrollEnabled={true}
        horizontal={true}
        numColumns={1}
        style={styles.footerContainer}
        ItemSeparatorComponent={Separator}
        renderItem={renderItem}
      />
    </View>
  );
};

export default FilterBar;

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
    paddingHorizontal: windowWidth * 0.025,
    alignContent: 'center',
    backgroundColor: 'grey',
    marginStart: 0,
    flex: 1,
    flexDirection: 'row',
  },
  footerItem: {
    width: platformIOS.isPad ? windowWidth * 0.015 : windowWidth * 0.015,
    height: windowHeight * 0.025,
    padding: windowWidth * 0.015,
    justifyContent: 'center',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  surfaceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflowX: 'scroll',
  },
  footerContainer: {
    marginHorizontal: platformIOS.isPad ? 15 : 5,
    padding: 2,
  },
});

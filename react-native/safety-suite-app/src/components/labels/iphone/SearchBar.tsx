import { Searchbar } from 'react-native-paper';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { StyleSheet } from 'react-native';
import React from 'react';
import { platformIOS } from '../../../../utils/utils';
import { windowWidth } from '../../../../utils/Dimensions';
import { useLabels } from '../../../hooks/use-labels';
import { translate } from '../../../data/translations';

const SearchBarIphoneView = () => {
  const [{ search, handleSearchChange }] = useLabels();
  return (
    <Searchbar
      placeholder={translate('search')}
      onChangeText={handleSearchChange}
      value={search}
      elevation={0}
      placeholderTextColor={PATHSPOT_COLORS.PATHSPOT_LIGHT_GREY}
      style={styles.searchBar}
      iconColor={'white'}
      clearIcon={'close'}
      inputStyle={styles.inputStyles}
    />
  );
};

export default SearchBarIphoneView;

const styles = StyleSheet.create({
  container: {
    width: windowWidth,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  input: {
    alignContent: 'flex-end',
    textAlign: 'left',
    padding: 15,
    fontSize: 20,
    paddingVertical: 1,
  },
  inputStyles: { color: 'white' },
  icon: {
    flexDirection: 'row',
    alignContent: 'flex-end',
    alignItems: 'flex-end',
    marginVertical: 9,
  },
  searchBar: {
    width: platformIOS.isPad ? windowWidth * 0.45 : windowWidth * 0.55,
    bottom: 2,
    marginRight: platformIOS.isPad ? 0 : 0,
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    left: -15,
    backgroundColor: 'transparent',
  },
});

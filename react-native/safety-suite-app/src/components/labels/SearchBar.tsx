import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { setSearchBarFilter } from '../../../store/slices/labelSlice';
import { Searchbar } from 'react-native-paper';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { platformIOS } from '../../../utils/utils';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { translate } from '../../data/translations';

const SearchBar = () => {
  const [search, setSearch] = useState<string>('');
  const dispatch = useDispatch();

  const onChange = (txt: string) => {
    setSearch(txt);
    const payload = { search: search.toLowerCase() };
    dispatch(setSearchBarFilter(payload));
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={translate('placeholder')}
        onChangeText={onChange}
        value={search}
        elevation={0}
        placeholderTextColor={'white'}
        style={styles.searchBar}
        iconColor={'white'}
        clearIcon={'close'}
        inputStyle={styles.inputStyles}
      />
    </View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    width: platformIOS.isPad ? windowWidth * 0.25 : '100%',
    height: platformIOS.isPad ? windowHeight * 0.025 : windowHeight * 0.045,
    bottom: 15,
    marginHorizontal: '1%',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    color: 'white',
  },
  input: {
    alignContent: 'flex-end',
    textAlign: 'left',
    padding: 15,
    fontSize: 20,
    paddingVertical: 1,
  },
  inputStyles: { color: 'white', padding: 3 },
  icon: {
    flexDirection: 'row',
    alignContent: 'flex-end',
    alignItems: 'flex-end',
    marginVertical: 9,
  },
  searchBar: {
    height: 25,
    width: platformIOS.isPad ? windowWidth * 0.25 : windowWidth * 0.5,
    bottom: -windowHeight * 0.03,
    borderBottomWidth: 1,
    borderColor: 'white',
    color: 'white',
    marginRight: '75%',
  },
});

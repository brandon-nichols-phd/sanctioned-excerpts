import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/types/store-types';
import { PSelect } from '../../../utils/components/selects';
import { platformIOS } from '../../../utils/utils';
import { Location } from '../../types/app';
import { setLocation } from '../../../store/slices/contextSlice';

const styles = StyleSheet.create({
  container: {
    width: platformIOS.isPad ? '25%' : '45%',
    height: platformIOS.isPad ? '100%' : '85%',
    justifyContent: 'center',
    alignItems: platformIOS.isPad ? 'center' : 'flex-start',
    alignSelf: 'center',
    marginRight: platformIOS.isPad ? '5%' : 0,
    marginTop: '2%',
  },
});

const selectStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: '5%',
    borderColor: 'grey',
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: 'center',
    textAlign: 'center',
    padding: '1%',
    backgroundColor: 'white',
    marginRight: '7%',
  },
  boxStyles: {
    width: '100%',
    height: '40%',
    justifyContent: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4.41,
  },
  dropdownStyles: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
  dropdownItemStyles: {
    marginHorizontal: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: 'grey',
    backgroundcolor: 'grey',
  },
  selectedTextStyle: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 14,
  },
  placeholderStyle: {
    textAlign: 'center',
  },
});

type LocationSelectProps = {
  width: string | number;
  selectWidth: string | number;
  selectHeight: string | number;
};

const LocationSelect = (props: LocationSelectProps) => {
  const { width, selectWidth, selectHeight } = props;
  const isOnline = useSelector((state: State) => state.context.online);
  const contextLocationId = useSelector((state: State) => state.context.locationId);
  const userState = useSelector((state: State) => state.user);
  const dispatch = useDispatch();

  const [storeFilter, setStoreFilter] = useState<any>(null);

  const locations: any = useMemo(() => {
    const locs: Location[] = userState.currUser?.locations || [];
    const locOpts: any[] = locs.map((loc: Location) => ({
      label: loc.locationName,
      value: loc.locationId,
    }));

    // console.log('[LocationSelect] locOpts: ', locOpts);
    // assign default location to be assigned from device reg locationId
    const initLocation: number = contextLocationId || userState.currUser?.locationId;
    setStoreFilter(initLocation);
    return locOpts;
  }, [userState.currUser?.id]);

  useEffect(() => {
    if (contextLocationId != storeFilter && storeFilter) {
      // app context to curr location
      const lPayload: any = { locationId: storeFilter };
      dispatch(setLocation(lPayload));
    }
  }, [storeFilter]);

  return (
    <View
      style={[
        styles.container,
        {
          width: width ? width : styles.container.width,
          // bottom: contextState?.bottomTabContext == 'Tasks' ? 22 : 0,
        },
      ]}
    >
      <PSelect
        isMulti={false}
        placeholder={'Store'}
        autoScroll={false}
        labelName="label"
        valueField={'value'}
        selected={storeFilter}
        setSelected={(val: any) => {
          console.log('[locationSelect] onselected is:  ', val);
          setStoreFilter(val);
        }}
        options={locations}
        styles={
          selectWidth || selectHeight
            ? {
                ...selectStyles,
                container: {
                  ...selectStyles.container,
                  width: selectWidth || selectStyles.container.width,
                  height: selectHeight || selectStyles.container.height,
                },
              }
            : selectStyles
        }
        disabled={!isOnline}
      />
    </View>
  );
};

export default LocationSelect;

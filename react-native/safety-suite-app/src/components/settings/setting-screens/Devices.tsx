import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DataTable, IconButton, Button, Searchbar } from 'react-native-paper';
import { platformIOS } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { isIphoneSe } from '../../../../utils/Platform';
import { windowWidth } from '../../../../utils/Dimensions';
import { useDevices } from '../../../hooks/use-devices';
import Loading from '../../../../utils/components/Loading';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { translate } from '../../../data/translations';

const NUMBER_OF_ITEMS_PER_PAGE = isIphoneSe ? 5 : 7;
const Devices = () => {
  const navigation = useNavigation();

  const { devices, loading, hasManageDevicePermissions, fetchDevices } = useDevices();
  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>('');

  const from = page * NUMBER_OF_ITEMS_PER_PAGE;
  const to = Math.min((page + 1) * NUMBER_OF_ITEMS_PER_PAGE, devices.length);

  const tableData = useMemo(() => {
    if (search) {
      return devices.filter((device) => device.name.includes(search));
    } else {
      return devices;
    }
  }, [devices, search]);

  const navigateToDeviceManagment = (deviceId?: number | undefined) => {
    navigation.navigate('DeviceManagement', { deviceId: deviceId });
  };

  // refetch on every nav
  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={platformIOS.isPad ? styles.header : styles.headerIphone}>
        <Text style={styles.title}>{translate('settingsDevicesTitle')}</Text>

        <Button
          style={styles.btn}
          labelStyle={styles.btnLabel}
          onPress={() => {
            navigateToDeviceManagment();
          }}
          mode="elevated"
          compact={true}
          textColor="green"
          disabled={hasManageDevicePermissions ? false : true}
        >
          {translate('settingsDevicesAddDevice')}
        </Button>
      </View>

      <Searchbar
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={'white'}
        style={styles.searchbar}
        clearIcon={'close'}
        elevation={0}
      />
      <DataTable style={styles.tableContainer}>
        {loading && <Loading />}
        <DataTable.Header>
          <DataTable.Title
            textStyle={{ color: 'black', textAlign: 'center' }}
            style={{ flex: platformIOS.isPad ? 2 : 2, justifyContent: 'flex-start' }}
          >
            {translate('settingsDevicesName')}
          </DataTable.Title>

          <DataTable.Title
            style={{
              flex: platformIOS.isPad ? 1.25 : 0.85,
              justifyContent: 'flex-start',
            }}
            numberOfLines={2}
            textStyle={{ color: 'black', textAlign: 'center' }}
          >
            {translate('settingsDevicesCode')}
          </DataTable.Title>

          <DataTable.Title
            style={{ flex: platformIOS.isPad ? 1 : 1, justifyContent: 'flex-start' }}
            textStyle={{ color: 'black', textAlign: 'center' }}
          >
            {translate('settingsDevicesActive')}
          </DataTable.Title>

          <DataTable.Title
            textStyle={{ color: 'black', textAlign: 'center' }}
            style={{ flex: platformIOS.isPad ? 0.5 : 0.5, justifyContent: 'flex-start' }}
          >
            {translate('settingsDevicesEdit')}
          </DataTable.Title>
        </DataTable.Header>

        {tableData.slice(from, to).map((device) => {
          return (
            <DataTable.Row
              key={device.id}
              style={{
                overflow: 'scroll',
              }}
            >
              <View
                style={{
                  flex: platformIOS.isPad ? 2 : 3,
                  marginVertical: '1%',
                  justifyContent: 'center',
                }}
              >
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{
                    textAlign: 'left',
                    fontSize: platformIOS.isPad ? 16 : 14,
                    justifyContent: 'center',
                  }}
                >
                  {device.name}
                </Text>
              </View>

              <View
                style={{
                  flex: platformIOS.isPad ? 2 : 2,
                  marginVertical: '1%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{
                    textAlign: 'center',
                    fontSize: platformIOS.isPad ? 16 : 14,
                    justifyContent: 'center',
                  }}
                >
                  {device.setupCode}
                </Text>
              </View>

              <DataTable.Cell style={{ flex: 1.25, justifyContent: 'center' }}>
                {device.active ? translate('yesText') : translate('noText')}
              </DataTable.Cell>
              <DataTable.Cell style={{ flex: 1, justifyContent: 'center' }}>
                <IconButton
                  icon={'pencil'}
                  iconColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
                  onPress={() => navigateToDeviceManagment(device.id)}
                  disabled={hasManageDevicePermissions ? false : true}
                />
              </DataTable.Cell>
            </DataTable.Row>
          );
        })}

        <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(devices.length / NUMBER_OF_ITEMS_PER_PAGE)}
          onPageChange={(p) => {
            setPage(p);
          }}
          label={translate('settingsPagination', {
            from: from + 1,
            to: to,
            length: devices.length,
          })}
          numberOfItemsPerPageList={[
            NUMBER_OF_ITEMS_PER_PAGE,
            NUMBER_OF_ITEMS_PER_PAGE,
            NUMBER_OF_ITEMS_PER_PAGE,
          ]}
          numberOfItemsPerPage={NUMBER_OF_ITEMS_PER_PAGE}
          showFastPaginationControls
          selectPageDropdownLabel={translate('settingsRowsPerPage')}
          style={styles.pagination}
        />
      </DataTable>
    </View>
  );
};

export default Devices;

const styles = StyleSheet.create({
  btn: {
    textAlign: 'center',
    alignSelf: 'center',
    width: platformIOS.isPad ? windowWidth * 0.15 : windowWidth * 0.325,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: '1%',
  },
  headerIphone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: '2%',
  },
  title: {
    fontSize: platformIOS.isPad ? 26 : 24,
    fontWeight: 'bold',
    textAlign: 'left',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  btnLabel: {
    fontWeight: '600',
    fontSize: platformIOS.isPad ? 18 : 16,
  },
  container: {
    margin: platformIOS.isPad ? '2%' : '3%',
  },
  searchbar: {
    width: platformIOS.isPad ? windowWidth * 0.35 : windowWidth * 0.45,
    borderBottomWidth: 1,
    borderColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    backgroundColor: 'transparent',
  },
  tableContainer: {
    overflow: 'scroll',
  },
  pagination: {
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { PATHSPOT_COLORS } from '../../constants/constants';
import {
  State,
  TaskFilterPayload,
  TaskFilterTypes,
} from '../../../store/types/store-types';
import { taskFilters } from '../../data/task';
import { platformIOS } from '../../../utils/utils';
import { globalStyles } from '../../../utils/styles';
import { setTaskFilters } from '../../../store/slices/taskSlice';
import { translate } from '../../data/translations';

const windowHeight = Dimensions.get('window').height;

const FilterBar = () => {
  const dispatch = useDispatch();
  const contextState = useSelector((state: State) => state.context);
  const taskState = useSelector((state: State) => state.tasks);
  const currUser = useSelector((state: State) => state.user.currUser);

  const [dateFilter, setDateFilter] = useState<taskFilters>(
    taskState.filters.date ? taskState.filters.date : taskFilters.TODAY
  );

  useEffect(() => {
    if (taskState.filters.date !== dateFilter) {
      const payload: TaskFilterPayload = {
        type: TaskFilterTypes.DATE,
        filter: dateFilter,
      };
      dispatch(setTaskFilters(payload));
    }
  }, [taskState.filters.date, dispatch, dateFilter]);

  const includeAdhocFilter =
    currUser?.locations.find(
      (location) =>
        contextState.locationId && location.locationId === contextState.locationId
    )?.protoFeatureFlags?.includeAdhocFilter ?? false;

  return (
    <View style={styles.container}>
      {contextState.bottomTabContext === 'Task List' || platformIOS.isPad ? (
        <View style={[globalStyles.row, styles.filter]}>
          <Pressable
            onPress={() => {
              if (dateFilter !== taskFilters.ALL) {
                setDateFilter(taskFilters.ALL);
              }
            }}
            style={
              dateFilter === taskFilters.ALL
                ? styles.dateFilterSelected
                : styles.dateFilter
            }
          >
            <Text style={styles.datefilterText}>{translate('taskFiltersAll')}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (dateFilter === taskFilters.TODAY) {
                setDateFilter(taskFilters.ALL);
              } else {
                setDateFilter(taskFilters.TODAY);
              }
            }}
            style={
              dateFilter === taskFilters.TODAY
                ? styles.dateFilterSelected
                : styles.dateFilter
            }
          >
            <Text style={styles.datefilterText}>{translate('taskFiltersToday')}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (dateFilter === taskFilters.WEEKLY) {
                setDateFilter(taskFilters.ALL);
              } else {
                setDateFilter(taskFilters.WEEKLY);
              }
            }}
            style={
              dateFilter === taskFilters.WEEKLY
                ? styles.dateFilterSelected
                : styles.dateFilter
            }
          >
            <Text style={styles.datefilterText}>{translate('taskFiltersWeekly')}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (dateFilter === taskFilters.MONTHLY) {
                setDateFilter(taskFilters.ALL);
              } else {
                setDateFilter(taskFilters.MONTHLY);
              }
            }}
            style={
              dateFilter === taskFilters.MONTHLY
                ? styles.dateFilterSelected
                : styles.dateFilter
            }
          >
            <Text style={styles.datefilterText}>{translate('taskFiltersMonthly')}</Text>
          </Pressable>

          {includeAdhocFilter && (
            <Pressable
              onPress={() => {
                if (dateFilter === taskFilters.NONE) {
                  setDateFilter(taskFilters.ALL);
                } else {
                  setDateFilter(taskFilters.NONE);
                }
              }}
              style={
                dateFilter === taskFilters.NONE
                  ? styles.dateFilterSelected
                  : styles.dateFilter
              }
            >
              <Text style={styles.datefilterText}>{translate('taskFiltersForms')}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: platformIOS.isPad ? '12%' : '7%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filter: {
    width: '96%',
    justifyContent: 'space-around',
    alignContent: 'center',
    marginHorizontal: '2%',
  },
  dpcontainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginHorizontal: platformIOS.isPad ? 0 : '1%',
  },
  dp: {
    display: 'flex',
    flexDirection: 'row',
  },
  datePicker: {
    width: '100%',
    height: 25,
    color: 'white',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  dategroup: {
    width: platformIOS.isPad ? '30%' : '25%',
    height: 25,
    justifyContent: 'center',
  },
  dateFilter: {
    height: platformIOS.isPad ? windowHeight * 0.045 : windowHeight * 0.025,
  },
  dateFilterSelected: {
    height: platformIOS.isPad ? windowHeight * 0.045 : windowHeight * 0.025,
    borderBottomWidth: 1,
    borderBottomColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  datefilterText: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    fontWeight: '600',
    fontSize: platformIOS.isPad ? 24 : 16,
    textAlign: 'center',
  },
});

export default FilterBar;

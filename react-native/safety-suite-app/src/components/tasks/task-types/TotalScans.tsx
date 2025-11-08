import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS } from '../../../../utils/utils';
import { Task } from '../../../data/task';

const TotalScans = (props: { task: Task }) => {
  const { task } = props;

  const getPercentTextColor = (percent: number): string => {
    if (percent >= 80) {
      return 'green';
    } else if (percent >= 50) {
      return PATHSPOT_COLORS.PATHPOT_ORANGE;
    } else {
      return 'red';
    }
  };

  const { color, percent } = useMemo(() => {
    const scans = parseInt(task.taskResponse, 10);
    const expectedScans =
      typeof task.expectedScans === 'string'
        ? parseInt(task.expectedScans, 10) || 1
        : task.expectedScans || 1;

    const pVal = (scans / expectedScans) * 100;
    return { color: getPercentTextColor(pVal), percent: pVal.toString() || '0' };
  }, [task]);

  return (
    <View>
      <AnimatedCircularProgress
        size={80}
        width={12}
        fill={Number.parseInt(percent, 10)}
        tintColor={color}
        backgroundColor={PATHSPOT_COLORS.PATHSPOT_GREY}
      >
        {() => (
          <Text style={[styles.text, { color: color }]}>
            {percent ? percent + '%' : '0%'}
          </Text>
        )}
      </AnimatedCircularProgress>
    </View>
  );
};

export default TotalScans;

const styles = StyleSheet.create({
  text: {
    justifyContent: 'center',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: platformIOS.isPad ? 24 : 18,
  },
});

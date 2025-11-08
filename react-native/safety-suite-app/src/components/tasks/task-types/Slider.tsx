import React, { FC, useCallback, useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Task } from '../../../data/task';
import { windowWidth } from '../../../../utils/Dimensions';
import { platformIOS } from '../../../../utils/utils';
import Slider from '@react-native-community/slider';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { globalStyles } from '../../../../utils/styles';
import { debounce } from 'lodash';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';

type PSliderProps = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
};

const WIDTH = platformIOS.isPad ? windowWidth * 0.25 : windowWidth * 0.45;
const LEFT_COEFFICIENT = 0.93;
const PSlider: FC<PSliderProps> = (props) => {
  const { task, readOnly, saveResponse } = props;

  const min: number = task.sliderNumericOptions?.min
    ? Number.parseFloat(task.sliderNumericOptions.min)
    : 0;

  const max: number = task.sliderNumericOptions?.max
    ? Number.parseFloat(task.sliderNumericOptions.max)
    : 5;

  const step: number = task.sliderNumericOptions?.step
    ? Number.parseFloat(task.sliderNumericOptions.step)
    : 0.5;

  const [value, setValue] = useState<number>(0.0);

  useEffect(() => {
    const isValid = isNumberTaskResponseValid(task.taskResponse);
    if (isValid) {
      setValue(parseFloat(task.taskResponse));
    }
  }, [task.taskResponse]);

  const left: number = useMemo(() => {
    const v = value / max;
    return WIDTH * v * LEFT_COEFFICIENT;
  }, [max, value]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce((val: number) => {
      saveResponse(val.toPrecision(2));
    }, 1000),
    [saveResponse]
  );

  const handleChange = (val: number) => {
    const n: number = Number.parseFloat(val.toPrecision(2));
    setValue(n);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        {/* thumb label with current value */}
        <Text style={[styles.valueLabel, { left: left || 0 }]}>{value}</Text>

        <Slider
          {...props}
          style={styles.container}
          minimumValue={min}
          maximumValue={max}
          step={step}
          minimumTrackTintColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
          maximumTrackTintColor={PATHSPOT_COLORS.PATHSPOT_GREY}
          thumbTintColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
          value={value}
          onValueChange={handleChange}
          onSlidingComplete={save}
          disabled={readOnly}
          tapToSeek={true}
        />

        {/* min and max labels */}
        <View style={styles.sliderLabelView}>
          <Text style={styles.boundLabel}>{min}</Text>
          <Text style={styles.boundLabel}>{max}</Text>
        </View>
      </View>
    </View>
  );
};

export default PSlider;

const styles = StyleSheet.create({
  container: {
    ...globalStyles.row,
    alignItems: 'center',
  },
  sliderContainer: {
    justifyContent: 'center',
    width: WIDTH,
    opacity: 1,
  },
  sliderLabelView: {
    ...globalStyles.row,
    justifyContent: 'space-between',
  },
  valueLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  boundLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});

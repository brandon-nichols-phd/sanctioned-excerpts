import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Dimensions,
  ScaledSize,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type CreateStylesFunction<T extends NamedStyles<T>> = (
  width: number,
  height: number
) => T;

export const useStylesWithDimensions = <T extends NamedStyles<T>>(
  createStyles: CreateStylesFunction<T>
) => {
  const [dimensions, setDimensions] = useState(() => ({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  }));

  useEffect(() => {
    const updateDimensions = ({ window }: { window: ScaledSize }) => {
      setDimensions({ width: window.width, height: window.height });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => {
      subscription.remove();
    };
  }, []);

  const styles = useMemo(
    () => StyleSheet.create(createStyles(dimensions.width, dimensions.height)),
    [dimensions, createStyles]
  );

  return styles;
};

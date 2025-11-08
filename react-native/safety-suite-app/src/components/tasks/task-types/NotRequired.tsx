import React, { FC, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { windowWidth } from '../../../../utils/Dimensions';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS } from '../../../../utils/utils';
import { translate } from '../../../data/translations';

type Props = {
  skipped: boolean;
  handleSkipResponse: (skipped: boolean) => void;
  readOnly: boolean;
};

export const NotRequired: FC<Props> = ({ skipped, handleSkipResponse, readOnly }) => {
  const handleSave = useCallback(() => {
    handleSkipResponse(!skipped);
  }, [skipped, handleSkipResponse]);

  return (
    <View style={styles.container}>
      <Button
        style={skipped ? styles.NABorder : styles.border}
        textColor={skipped ? 'white' : PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
        buttonColor={skipped ? PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE : 'white'}
        onPress={handleSave}
        disabled={readOnly}
      >
        {translate('taskNA')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: platformIOS.isPad ? windowWidth * 0.055 : windowWidth * 0.15,
    justifyContent: 'flex-end',
    left: '5%',
    alignSelf: 'center',
  },
  NABorder: { borderRadius: 7 },
  border: {
    borderColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    borderRadius: 7,
    borderWidth: 1,
  },
});

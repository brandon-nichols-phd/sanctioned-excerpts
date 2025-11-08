import { createSlice } from '@reduxjs/toolkit';
import { UserInteractionState } from '../types/store-types';
import moment from 'moment';

const initUserInteractionState: UserInteractionState = {
  _lastUserAction: 0,
  isUserInactive: false,
};

const userInteractionState = createSlice({
  name: 'userInteraction',
  initialState: initUserInteractionState,
  reducers: {
    setLastUserAction: (state) => {
      const lastTime = state._lastUserAction;
      const newTime = moment();

      const isLastInteractionInThePast = moment(lastTime).isBefore(
        moment().startOf('day')
      );

      state._lastUserAction = newTime.valueOf();
      state.isUserInactive = isLastInteractionInThePast;
    },
  },
});

export const { setLastUserAction } = userInteractionState.actions;

export default userInteractionState.reducer;

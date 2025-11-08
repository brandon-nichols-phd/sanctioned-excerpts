import { createSlice } from '@reduxjs/toolkit';
import { UserState } from '../types/store-types';
import { Location, User } from '../../src/types/app';
import { orderList } from '../../utils/utils';

const initLabelState: UserState = {
  currUser: null,
  users: [],
  loading: false,
};

export type SetCurrUserPayload = { user: User | null };
const userSlice = createSlice({
  name: 'user',
  initialState: initLabelState,
  reducers: {
    /**
     * @param state
     * @param action - filter category as string, modifies state to include a selected category
     */
    setCurrentUser: (state, action: { payload: SetCurrUserPayload }) => {
      const { user } = action.payload;
      state.currUser = user;
    },
    setUsersList: (state, action: any) => {
      const { users } = action.payload;

      state.users = users;

      const currUser: User | undefined = users?.find(
        (usr: User) => usr.id === state.currUser?.id
      );

      if (currUser) {
        state.currUser = currUser;
      }
    },
    updateUser: (state, action: any) => {
      const { user } = action.payload;

      if (!user) {
        return state;
      }

      // order
      const order: any[] = state.users.map((usr: User) => usr.id);

      // ignoring order
      const users: User[] = state.users.filter((usr: User) => usr.id !== user?.id) || [];

      if (users) {
        const newUserList: User[] = [user, ...users];
        const orderedUserList: User[] = orderList(order, newUserList);
        state.users = orderedUserList;
      }
      if (user?.id === state.currUser?.id) {
        state.currUser = user;
      }
    },
    addUser: (state, action: any) => {
      const { user } = action.payload;

      if (!user) {
        return state;
      }

      state.users = [...state.users, user];
    },
    /**
     *
     * @param state
     * @param action
     * @summary
     * 	find user in state.users
     * 	and removes the current location from his locations list
     */
    deactivateUser: (state, action: any) => {
      const { userId, locationId } = action.payload;
      const user: User | undefined = state.users.find((usr: User) => usr.id === userId);

      if (user) {
        const fstate: User[] = state.users.filter((usr: User) => usr.id === userId);
        const userLocations: Location[] = user.locations.filter(
          (loc: Location) => loc.locationId === locationId
        );

        const modifiedUser: User = {
          ...user,
          locations: userLocations,
        };
        state.users = [...fstate, modifiedUser];

        if (state.currUser?.id === userId) {
          state.currUser = null;
        }
      }
    },
  },
});

export const { setCurrentUser, setUsersList, updateUser, addUser, deactivateUser } =
  userSlice.actions;
export const selectUser = (State: UserState) => State;

export default userSlice.reducer;

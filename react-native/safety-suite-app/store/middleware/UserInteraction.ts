import { setLastUserAction } from '../slices/userInteractionSlice';
import { pathsToIgnore } from './Middleware';

/**
 *
 * @returns dispatches action to context after each user action
 */
export const UserInteraction = (store: any) => (next: any) => (action: any) => {
  if (!pathsToIgnore.includes(action.type)) {
    store.dispatch(setLastUserAction());
  }

  return next(action);
};

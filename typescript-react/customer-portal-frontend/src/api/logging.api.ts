import {api} from './api';
import {API_URL_INTERACTION_LOGGING} from './constants';

export const logInteraction = (interactionTypeId: any): Promise<any> => {
  return api.withAuth().url(`${API_URL_INTERACTION_LOGGING}/${interactionTypeId}`).get().json().then(api.zjson);
};

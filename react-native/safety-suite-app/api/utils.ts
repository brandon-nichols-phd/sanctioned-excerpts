import { Buffer } from 'buffer';
//@ts-expect-error
import zlib from 'react-zlib-js';
import { ContextState } from '../store/types/store-types';
import { ToastTypes, User } from '../src/types/app';
import { showToast } from '../utils/utils';
import { JWT, ApiParams, ApiResponse } from './constants';

export const API_RESP_JSON = 'application/json';

export const decodeApiRes = <T = any>(res: any, type?: string): ApiResponse<T> => {
  const decodedData = Buffer.from(res, 'base64');
  const unzippedData = zlib.unzipSync(decodedData);

  const restoredJsonString: string = Buffer.from(unzippedData).toString('utf-8');
  let restoredJson;
  if (!type || type === API_RESP_JSON) {
    restoredJson = JSON.parse(restoredJsonString);
  }

  return restoredJson ? restoredJson : restoredJsonString;
};

export const getApiResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const contentType = res.headers.get('Content-Type');
  if (res.ok && contentType === API_RESP_JSON) {
    const json = (await res.json()) as { data: T };
    const decodedData = decodeApiRes(json.data);
    return { status: res.status, data: decodedData };
  }

  return { status: res.status, data: null };
};

export const getApiResponseJson = async (res: any) => {
  const json: any = await res.json();
};

/** these are needed for every get reqeust */

export const getWrapper = (params: ApiParams) => {
  return `?customerId=${params.customerId}&locationId=${params.locationId}&deviceId=${params.deviceId}&userId=${params.userId}`;
};

export const authPost = async <TArgs, TResponse>(
  url: string,
  { arg }: { arg: DefaultAPIParams & TArgs }
): Promise<ApiResponse<TResponse>> => {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: 'post',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
      body: JSON.stringify(arg),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await getApiResponse(response);
  } catch (error) {
    console.error(`POST request failed for ${url}`, error);
    throw error;
  } finally {
    const end = performance.now();
    const duration = end - start;
    console.debug(`POST ${url} completed in ${duration.toFixed(2)}ms`);
  }
};

export const authFetcher = async <T>(url: string): Promise<ApiResponse<T>> => {
  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'get',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await getApiResponse(response);
  } catch (error) {
    console.error(`GET request failed for ${url}`, error);
    throw error;
  } finally {
    const end = performance.now();
    const duration = end - start;
    console.debug(`GET ${url} completed in ${duration.toFixed(2)}ms`);
  }
};

/** these are needed for every reqeust */
export type DefaultAPIParams = {
  customerId: number;
  locationId: number;
  deviceId: number;
  userId: number;
};

export const defaultParams = (
  context: ContextState,
  currUser: User | undefined | null
): DefaultAPIParams | null => {
  if (currUser?.id) {
    return {
      customerId: context.customerId,
      locationId: context.locationId,
      deviceId: context.deviceId,
      userId: currUser.id,
    };
  } else {
    showToast({
      type: ToastTypes.ERROR,
      txt1: 'Please login and try again.',
    });
    return null;
  }
};

import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import useSWR from 'swr';

import { ApiParams, ApiResponse } from '../../api/constants';
import { SENSOR_URL, SensorUrlParams } from '../../api/tasks';
import { State } from '../../store/types/store-types';
import { BackendEpoch, Task } from '../data/task';
import { authFetcher } from '../../api/utils';
import { showToast } from '../../utils/utils';
import { ToastTypes } from '../types/app';

export type SensorResponse = {
  success: boolean;
  data: Sensor[] | null;
  message: string;
};
export type SensorDataType =
  | 'HUMIDITY'
  | 'TEMPERATURE'
  | 'BATTERY'
  | 'RSSI'
  | 'TEMPERATURE_SECONDARY';

export type SensorUnit = '%' | 'db' | 'C' | 'F';

export type Sensor = {
  createdWhen: BackendEpoch;
  dataType: SensorDataType;
  id: string;
  lastModifiedWhen: BackendEpoch;
  localCreatedWhen: BackendEpoch;
  receiverStationId: number;
  sensorId: number;
  sensorUnit: SensorUnit;
  sensorValue: number;
};

type Return = {
  sensorValue: number | null;
  loading: boolean;
  fetch: () => void;
};

export const useSensor = ({
  taskId,
  assignedId,
}: {
  taskId: Task['id'];
  assignedId: Task['assingedToChecklistId'];
}): Return => {
  const [sensors, setSensors] = useState<Sensor[] | null>(null);
  const currUser = useSelector((state: State) => state.user.currUser);
  const online = useSelector((state: State) => state.context.online);
  const customerId = useSelector((state: State) => state.context.customerId);
  const locationId = useSelector((state: State) => state.context.locationId);
  const deviceId = useSelector((state: State) => state.context.deviceId);

  const defParams: ApiParams | null =
    online && customerId && locationId && currUser
      ? ({
          customerId: customerId,
          locationId: locationId,
          deviceId: deviceId,
          userId: currUser.id,
        } as ApiParams)
      : null;

  const sensorParams: SensorUrlParams = { assignedId: assignedId, taskId: taskId };

  const url: string | null =
    online && customerId && deviceId && currUser && locationId && defParams
      ? SENSOR_URL(defParams, sensorParams)
      : null;

  const { isLoading, mutate } = useSWR<{
    data: ApiResponse<SensorResponse> | null;
  }>(url, authFetcher, {
    keepPreviousData: true,
  });

  const fetch = useCallback(() => {
    if (!isLoading) {
      return mutate();
    }
    return Promise.resolve();
  }, [isLoading, mutate]);

  const callfetch = useCallback(() => {
    setSensors(null);
    fetch()
      .then((res: ApiResponse<SensorResponse>) => {
        if (res.status === 200 && res.data?.success) {
          setSensors(res.data.data ?? null);
        } else if (res.status === 200 && res.data?.message) {
          if (res.data.message === 'No sensor data available') {
            showToast({
              type: ToastTypes.ERROR,
              txt1: 'No sensor data available for this task',
              txt2: 'Please make sure you have internet connection and try again',
            });
          } else if (res.data.message === 'Sensor data is stale') {
            showToast({
              type: ToastTypes.INFO,
              txt1: 'Sensor data is older than an hour',
              txt2: 'Please enter the sensor reading manually',
            });
          } else {
            showToast({
              type: ToastTypes.ERROR,
              txt1: 'Could not get sensor data',
              txt2: 'Please check the connectivity of the sensor, or switch to manual entry',
            });
          }
          setSensors(null);
        } else {
          showToast({
            type: ToastTypes.ERROR,
            txt1: 'Could not get sensor data',
            txt2: 'Please check the connectivity of the sensor, or switch to manual entry',
          });
          setSensors(null);
        }
      })
      .catch((err: ApiResponse<Sensor>) => {
        showToast({
          type: ToastTypes.ERROR,
          txt1: 'Could not get sensor data',
          txt2: 'Please check the connectivity of the sensor, or switch to manual entry',
        });
        setSensors(null);
        console.error(err);
      });
  }, [fetch]);

  const value: number | null = useMemo(() => {
    if (sensors?.length) {
      // assume temp is always sent in Celsius and only includes Temperature primary types
      return sensors[0]?.sensorValue != null && sensors[0]?.sensorValue !== 0
        ? sensors[0]?.sensorValue
        : null;
    }
    return null;
  }, [sensors]);

  return useMemo(
    () => ({
      sensorValue: value,
      loading: isLoading,
      fetch: callfetch,
    }),
    [isLoading, callfetch, value]
  );
};

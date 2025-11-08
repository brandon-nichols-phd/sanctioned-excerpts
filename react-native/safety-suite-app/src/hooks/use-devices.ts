import { useSelector } from 'react-redux';
import { ContextState, State, UserState } from '../../store/types/store-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Device, DeviceApiRes, formatDeviceListResponse } from '../data/device';
import { DEVICES } from '../../api/constants';
import { Location } from '../types/app';
import useSWR from 'swr';
import { authFetcher } from '../../api/utils';

export type useDevicesReturn = {
  devices: Device[];
  loading: boolean;
  hasManageDevicePermissions: boolean;
  fetchDevices: () => Promise<unknown>;
};

export const useDevices = (): useDevicesReturn => {
  const contextState: ContextState = useSelector((state: State) => state.context);
  const userState: UserState = useSelector((state: State) => state.user);
  const [devices, setDevices] = useState<Device[]>([]);

  const url: string = DEVICES({
    customerId: contextState.customerId,
    locationId: contextState.locationId || null,
    deviceId: contextState.deviceId,
    userId: userState.currUser?.id,
  });

  const { data, isLoading, mutate } = useSWR<{ data: DeviceApiRes[] | null }>(
    url,
    authFetcher,
    {
      keepPreviousData: true,
      shouldRetryOnError: false,

      // to fix stale data
      refreshWhenHidden: true,
      focusThrottleInterval: 500,
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (data?.data) {
      const devices: Device[] = formatDeviceListResponse(data.data);
      setDevices(devices || []);
    }
  }, [data]);

  const hasManageDevicePermissions = useMemo(() => {
    const currLocationId: number = contextState.locationId;
    const currLocation: Location | undefined = userState.currUser?.locations.find(
      (loc: Location) => loc.locationId == currLocationId
    );

    if (currLocation) {
      const currPerms: any = currLocation.permissions;
      const manageDevices: boolean =
        currPerms?.permissions?.manageDevices ||
        currPerms?.additionalPermissions?.manageDevices;
      return manageDevices || false;
    } else {
      return false;
    }
  }, [userState.currUser?.id, contextState.locationId]);

  const fetchDevices = useCallback(() => {
    if (!isLoading) {
      return mutate();
    }
    return Promise.resolve();
  }, [isLoading, mutate]);

  return useMemo(() => {
    return {
      devices: devices,
      loading: isLoading,
      hasManageDevicePermissions: hasManageDevicePermissions,
      fetchDevices: fetchDevices,
    };
  }, [devices, isLoading, hasManageDevicePermissions]);
};

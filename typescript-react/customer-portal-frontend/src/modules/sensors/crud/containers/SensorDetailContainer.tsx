import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import useSWR from 'swr'

import {
  isNullOrUndefined,
  isNullUndefinedOrEmptyString,
  isNullUndefinedOrZero,
} from '../../../../webapp-lib/pathspot-react/api/types/type-utils'
import { TimeUnit } from '../../../../webapp-lib/pathspot-react/api/time/time.types'
import { BaseItem, valueof, notify } from '../../../../webapp-lib/pathspot-react'
import { SelectableItem } from '../../../../api/types'

import {
  InboundSensorAction,
  ReportDataTypeList,
  SensorAction,
  SensorAlertCriticality,
  SensorAlertCriticalityEnum,
  SensorDataType,
  SensorDataTypeLabel,
  SensorDataUnitType,
  SensorModelProtocol,
  SensorTemperatureUnit,
  SensorUnitType,
} from '../../api/sensor-types'
import { ToastContainer } from 'react-toastify'
import {
  sensorByIdUrl,
  sensorModelsUrl,
  sensorPermissionsUrl,
  usersByLocationIdUrl,
  createNewSensor,
  editSensor,
  sensorUnitTypeUrl,
} from '../../api/sensor-requests.api'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import {
  alertLimitToPOSTPayload,
  generateSensorConfigAlertLimit,
  reduceAlertRecipientPayload,
  reduceSensorAlertConfigurationPayload,
  toPhoneToAlertRecipient,
  filterAlertRecipientsWithoutEmail,
  durationAsSeconds,
  getAlertRecipients,
} from '../api/sensor-crud.api'
import { authFetcher } from '../../../../api/api'

export type SensorModelCapabilities = {
  temperature: boolean
  humidity: boolean
  temperatureSecondary: boolean
  battery: boolean
  cooldownProbe: boolean
}

export enum SensorBounds {
  UPPER = 'UPPER',
  LOWER = 'LOWER',
  NONE = 'NONE',
}
export interface SensorLimit {
  label?: string
  dataType?: SensorDataType
  unit: SelectableItem<SensorDataUnitType>
  value?: number
  limitType: SensorBounds
}
export type SensorModel = {
  name: string
  protocol: SensorModelProtocol
  id: number // this is a duplicate of 'id' sent from backend, likely unecessary
  sensorModelId: number // this is a duplicate of 'id' sent from backend, likely unecessary
  capabilities: SensorModelCapabilities
}
export interface SensorValueLimits {
  [SensorBounds.UPPER]?: SensorLimit
  [SensorBounds.LOWER]?: SensorLimit
}

export interface SensorDuration {
  duration: number
  unit: TimeUnit
}
export type SensorAlertRecipient = {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
}
export type SelectableAlertRecipient = SelectableItem<SensorAlertRecipient>

export type SensorAlertRecipients = {
  cc?: SelectableAlertRecipient[]
  bcc?: SelectableAlertRecipient[]
  to?: SelectableAlertRecipient[]
  phoneTo?: SelectableAlertRecipient[]
}

export interface SensorAlertConfiguration {
  id?: string
  active: boolean
  reportTemplateId: number
  dataType?: SelectableItem<SensorDataType>
  limits?: SensorValueLimits
  suppression?: SensorDuration
  recurrence?: SensorDuration
  criticality?: SelectableItem<SensorAlertCriticalityEnum>
  recipients?: SensorAlertRecipients
  followBusinessHours?: boolean
  alertInC?: boolean
}

export interface SensorDetailPayloadAction {
  id: string
  active: boolean
  dataType: string
  createdWhen: string | null
  deployedSensorId: string | null
  highLimit: number | null
  lowLimit: number | null
  duration: number | null
  durationUnits?: string
  criticality: string | null
  recurrence: number | null
  cc: Array<SensorAlertRecipient> | []
  bcc: Array<SensorAlertRecipient> | []
  to: Array<SensorAlertRecipient> | []
  phoneTo: Array<SensorAlertRecipient> | []
  reportTemplateId: number
  alertInC?: boolean
  suppressUntil: string | null
  pathspotTeamMember: string | null
  followBusinessHours: boolean | null
  start0orSensorDataId: string | null
  lastModifiedWhen: string | null
  lastReadingWhen: number | null
}
export type SensorDetailPayload = {
  id: string
  active: boolean
  createdWhen: string | null
  departmentId: number | null
  departmentName: string | null
  lastModifiedWhen: string | null
  locationId: number | null
  locationName: string | null
  mac: string | null
  name: string | null
  publicAddr: string | null
  reportDataType: string | null
  sensorId: string | null
  sensorModel: SensorModel
  sensorModelId: number | null
  unitType: string | null
  unitTypeId: string | null
  applicationId: number | null
  tag: Array<string> | null
  actions: Array<SensorDetailPayloadAction> | null
  availableTags: Array<string> | null
}
export type SensorDetails = {
  id?: string
  name?: string
  model?: SelectableItem<SensorModel>
  publicAddr?: string
  location?: LocationPermission
  department?: LocationPermission['departments'][0]
  category?: SelectableTag
  unitType?: SelectableItem<SensorUnitType>
  active?: boolean
  tag?: Array<string>
  alerts?: Array<SensorAlertConfiguration>
  reportDataType?: typeof ReportDataTypeList[0]
  availableCategories?: SelectableTag[]
}
export type SensorDetailsPOSTPayload = {
  locationId?: string | number
  departmentId?: string | number
  sensorModelId?: string | number | unknown
  active: boolean
  name?: string
  publicAddr?: string
  unitTypeId?: string | number | unknown
  tag?: [string] | null | unknown
  reportDataType?: string | number | unknown
  actions?: Array<InboundSensorAction> | unknown
}
export type SelectableTag = {
  label: string
  value: string
  source?: { name: string }
}

export type SensorDetailKey = keyof SensorDetails

export type SensorOptions = {
  sensorModels?: Array<SelectableItem<SensorModel>>
  locations?: LocationPermission[]
  departments?: Array<SelectableItem<BaseItem>>
  unitTypes?: Array<SelectableItem<SensorUnitType>>
  categories?: Array<SelectableTag>
  reportDataType?: typeof ReportDataTypeList
}

export type SensorLocationSource = {
  name: string
  id: number
  departments: Array<{ label: string; value: number }>
}

export type SensorDetailError = {
  [T in SensorDetailKey]?: string
}

export type SensorAlertError = {
  [T in keyof SensorAlertConfiguration]?: string
}

export type SensorConfigurationErrors = {
  details?: SensorDetailError
  alerts?: Array<SensorAlertError | undefined>
}

type SensorDetailContainerType = {
  sensorDetails: SensorDetails | null
  editContext: SensorEditContext | null
  permissions: SensorPermissions | undefined
  options: SensorOptions | undefined
  alertableUserOptions: SensorAlertRecipients | undefined
  errors: SensorConfigurationErrors | null
  isLoading: boolean
  canViewSensorAndActions: boolean | null
  canEditSensor: boolean | null
  canEditAlerts: boolean | null
  setFieldValue: (field: keyof SensorDetails, value: valueof<SensorDetails>) => void
  removeAlert: (index: number) => void
  addAlert: () => void
  editAlert: (index: number, field: keyof SensorAlertConfiguration, value: valueof<SensorAlertConfiguration>) => void
  onSaveClick: () => Promise<void>
  onResetClick: () => void
  userPreferredTemperatureUnit: SensorTemperatureUnit
}

const SensorDetailConfigurationContext = React.createContext<SensorDetailContainerType | null>(null)

type SensorDetailContextType = {
  children: React.ReactNode
}
type SensorEditContext = 'new' | 'existing' | null

const setDetailError = (sensorDetailsErrors: SensorDetailError, fieldName: SensorDetailKey) => {
  switch (fieldName) {
    case 'name':
      sensorDetailsErrors.name = 'A sensor name is required.'
      return
    case 'publicAddr':
      sensorDetailsErrors.publicAddr = 'The sensor EUI (Lora)/ ID# (Other) is required to save changes.'
      return
    case 'model':
      sensorDetailsErrors.model = 'A sensor type selection is required.'
      return
    case 'location':
      sensorDetailsErrors.location = 'A location selection is required.'
      return
    case 'category':
      sensorDetailsErrors.category = 'A category selection is required.'
      return
    case 'unitType':
      sensorDetailsErrors.unitType = 'A unit type selection is required.'
      return
    default:
      return
  }
}

const setAlertError = (sensorDetailsErrors: SensorAlertError, fieldName: keyof SensorAlertConfiguration) => {
  switch (fieldName) {
    case 'dataType':
      sensorDetailsErrors.dataType = 'An alert type is required.'
      return
    case 'criticality':
      sensorDetailsErrors.criticality = 'Alert criticality is a required field.'
      return
    case 'suppression':
      sensorDetailsErrors.suppression = 'An alert supression interval is required and must be non-zero.'
      return
    case 'limits':
      sensorDetailsErrors.limits = 'High limit must be greater than lower limit.'
      return
    default:
      return
  }
}

const onResetClick = () => {
  window.location.reload()
}

const sanitizeRecipientsFromOptions = (
  alertableUserOptions: SensorAlertRecipients,
  alert: SensorAlertConfiguration,
  field: keyof SensorAlertRecipients
) => {
  return alert.recipients?.[field]?.map(
    (recipient) => alertableUserOptions[field]?.find((cleanRecipient) => cleanRecipient.value === recipient.value) ?? recipient
  )
}

export type LocationPermission = {
  value: number
  label: string
  departments: {
    value: number
    label: string
  }[]
}
export type Tag = {
  label: string
  value: string
}

type SensorPermissions = {
  availableTags: Tag[]
  viewSensorsAndActions: LocationPermission[]
  editActions: LocationPermission[]
  editSensors: LocationPermission[]
}

export const getLocationsFromPermissions = (permissions: SensorPermissions): LocationPermission[] => {
  if (permissions.viewSensorsAndActions.length > 0) {
    return permissions.viewSensorsAndActions
  }
  return []
}

const getTagsFromPermissions = (permissions: SensorPermissions) => {
  return permissions.availableTags.map((tag) => ({
    label: tag.label,
    value: tag.label.toLowerCase().replace(/\s/g, ''),
    source: { name: tag.label },
  }))
}

const checkViewSensorandActionPermission = (sensorLocationId: number, permissions: SensorPermissions): boolean => {
  return permissions.viewSensorsAndActions.some((permission) => permission.value === sensorLocationId)
}
const checkEditSensorPermission = (sensorLocationId: number, permissions: SensorPermissions): boolean => {
  return permissions.editSensors.some((permission) => permission.value === sensorLocationId)
}
const checkEditAlertsPermission = (sensorLocationId: number, permissions: SensorPermissions): boolean => {
  return permissions.editActions.some((permission) => permission.value === sensorLocationId)
}

const SensorDetailContainer = ({ children }: SensorDetailContextType) => {
  const location = useLocation()
  const history = useHistory()
  const { authState } = useAuthContext()
  const alertRecipientsSanitizedRef = useRef(false)

  // TODO: migrate to formik
  const [sensorDetails, _setSensorDetails] = useState<SensorDetails>({} as SensorDetails)

  const { data: permissions, isLoading: permsLoading } = useSWR<SensorPermissions>(
    sensorPermissionsUrl(),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const sensorId = useMemo(() => {
    if (location.pathname) {
      const splitLocation = location.pathname.split('sensors/')
      const parsedSensorId = splitLocation.length ? splitLocation[1] : null
      if (parsedSensorId !== undefined && parsedSensorId !== null) {
        return parsedSensorId
      }
    }

    return null
  }, [location.pathname])

  const editContext = useMemo((): SensorEditContext => {
    if (sensorId != null) {
      if (sensorId === 'new') {
        return 'new'
      } else if (sensorId !== '') {
        return 'existing'
      }
    }
    return null
  }, [sensorId])

  const canViewSensorAndActions = useMemo(() => {
    if (editContext === 'new') {
      return true
    }

    const locationId = sensorDetails.location?.value
    if (locationId && permissions) {
      return checkViewSensorandActionPermission(locationId, permissions)
    }

    return false
  }, [editContext, sensorDetails.location, permissions])

  const canEditSensor = useMemo(() => {
    if (editContext === 'new') {
      return true
    }

    const locationId = sensorDetails.location?.value
    if (locationId && permissions) {
      return checkEditSensorPermission(locationId, permissions)
    }

    return false
  }, [editContext, sensorDetails.location, permissions])

  const canEditAlerts = useMemo(() => {
    if (editContext === 'new') {
      return true
    }

    const locationId = sensorDetails.location?.value
    if (locationId && permissions) {
      const canEditAlertPermissions = checkEditAlertsPermission(locationId, permissions)
      return canEditAlertPermissions
    }

    return null
  }, [editContext, sensorDetails.location, permissions])

  const { data: sensorPayload, isLoading: sensorLoading } = useSWR<Record<string, SensorDetailPayload>>(
    sensorId && editContext === 'existing' ? sensorByIdUrl(sensorId) : null,
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const { data: sensorModels, isLoading: modelsLoading } = useSWR<SensorModel[]>(sensorModelsUrl(), authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const { data: sensorUnitTypes, isLoading: unitTypesIsLoading } = useSWR<SensorUnitType[]>(
    sensorUnitTypeUrl(),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const sensorOptions = useMemo((): SensorOptions | undefined => {
    if (permissions && sensorModels) {
      const smodels = sensorModels.map((model) => ({
        value: model.sensorModelId,
        label: `${model.name} (${model.protocol})`,
        source: { ...model },
      }))
      const sUnitTypes = sensorUnitTypes
        ?.map((unitType) => ({
          value: unitType.id,
          label: `${unitType.unitType}`,
          source: { ...unitType },
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }))
      return {
        sensorModels: smodels,
        locations: getLocationsFromPermissions(permissions),
        unitTypes: sUnitTypes,
        categories: getTagsFromPermissions(permissions).sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
        ),
        reportDataType: ReportDataTypeList,
      }
    }
  }, [permissions, sensorModels, sensorPayload])

  const { data: alertableUsersPayload, isLoading: usersLoading } = useSWR<SensorAlertRecipient[]>(
    sensorDetails.location && (canEditAlerts || canViewSensorAndActions) ? usersByLocationIdUrl(sensorDetails.location.value) : null,
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  /**
   * Note:
   * some configured sensors in prod dont have a location set
   * this is causing some undefined fields for configured alert users because this function relies on
   * a location set to return correct infomartion to format alert recipients
   *
   * the functions to format the alert recipients are: reduceAlertRecipientPayload() and toPhoneToAlertRecipient()
   * there are additions in these functions to handle undefined or missing fields more gracefully/User friendly
   *
   * however, do we want to go forward with allowing a sensor to not have a location?
   */
  const alertableUserOptions = useMemo((): SensorAlertRecipients | undefined => {
    if (alertableUsersPayload) {
      const alertableUsers = reduceAlertRecipientPayload(alertableUsersPayload)
      return {
        cc: filterAlertRecipientsWithoutEmail(alertableUsers),
        bcc: filterAlertRecipientsWithoutEmail(alertableUsers),
        to: filterAlertRecipientsWithoutEmail(alertableUsers),
        phoneTo: alertableUsers.map((phoneItem) => toPhoneToAlertRecipient(phoneItem)),
      }
    }
  }, [alertableUsersPayload])

  useEffect(() => {
    if (sensorId != null && editContext === 'existing' && sensorPayload && sensorOptions) {
      const sensorIdKey = Object.keys(sensorPayload)[0] as keyof SensorDetailPayload | undefined
      if (sensorIdKey) {
        const sensor = sensorPayload[sensorIdKey]
        if (sensor) {
          const { locationId, departmentId, sensorModelId, actions, tag } = sensor

          const alertConfigurations = reduceSensorAlertConfigurationPayload(actions, authState.temperatureInC)

          const currentLocation = sensorOptions.locations?.find((locationOption) => locationOption.value === locationId)
          const reducedDetails: SensorDetails = {
            id: sensor.id,
            name: sensor.name === null ? undefined : sensor.name,
            publicAddr: sensor.publicAddr === null ? undefined : sensor.publicAddr,
            tag: sensor.tag === null ? undefined : sensor.tag,
            active: sensor.active,
            location: currentLocation,
            department: currentLocation?.departments.find((deptOption) => deptOption.value === departmentId),
            model: sensorOptions.sensorModels?.find((sensorOption) => sensorOption.value === sensorModelId),
            category: sensorOptions.categories?.find((categoryOption) => categoryOption.label === tag![0]),
            unitType: sensorOptions.unitTypes?.find((unitType) => unitType.source.id === sensor.unitTypeId),
            alerts: alertConfigurations,
            reportDataType: sensorOptions.reportDataType?.find((reporDataType) => reporDataType.value === sensor.reportDataType),
            availableCategories: permissions ? getTagsFromPermissions(permissions) : [],
          }

          _setSensorDetails(reducedDetails)
        }
      }
    }
  }, [authState.temperatureInC, editContext, sensorId, sensorOptions, sensorPayload])

  useEffect(() => {
    // Ideally this is done closer to the UI, or be done as part of sensor details when that is moved to formik
    if (alertableUserOptions != null && sensorDetails.alerts != null && !alertRecipientsSanitizedRef.current) {
      //Now that the user options have been fetched, need to update the sensor alert configs to use a standardized object format to guarantee it displays properly
      const currentAlerts = sensorDetails.alerts
      if (Array.isArray(currentAlerts) && currentAlerts.length > 0) {
        const newAlerts = currentAlerts.map((alert) => {
          const to = sanitizeRecipientsFromOptions(alertableUserOptions, alert, 'to')
          const bcc = sanitizeRecipientsFromOptions(alertableUserOptions, alert, 'bcc')
          const cc = sanitizeRecipientsFromOptions(alertableUserOptions, alert, 'cc')
          const phoneTo = sanitizeRecipientsFromOptions(alertableUserOptions, alert, 'phoneTo')
          const newAlert = { ...alert, recipients: { to, cc, phoneTo, bcc } }
          return newAlert
        })
        if (Array.isArray(newAlerts) && newAlerts.length > 0) {
          _setSensorDetails((_sensorDetails) => ({ ..._sensorDetails, alerts: [...newAlerts] }))
          alertRecipientsSanitizedRef.current = true
        }
      }
    }
  }, [alertableUserOptions, sensorDetails.alerts])

  const errors = useMemo((): SensorConfigurationErrors | null => {
    //Prior to saving, need to check required fields:
    //Sensor Form: [Name, publicAddr, model, location, tag (all fields minus active, it just defaults to false)]
    //Alert Configs: [alertType, criticality, suppression]
    let sensorConfigErrors: SensorConfigurationErrors = {}
    const sensorDetailsErrors: SensorDetailError = {}

    isNullUndefinedOrEmptyString(sensorDetails.name) && setDetailError(sensorDetailsErrors, 'name')
    isNullUndefinedOrEmptyString(sensorDetails.publicAddr) && setDetailError(sensorDetailsErrors, 'publicAddr')
    sensorDetails.model == null && setDetailError(sensorDetailsErrors, 'model')
    sensorDetails.location == null && setDetailError(sensorDetailsErrors, 'location')
    sensorDetails.category == null && setDetailError(sensorDetailsErrors, 'category')
    sensorDetails.unitType == null && setDetailError(sensorDetailsErrors, 'unitType')
    sensorDetails.reportDataType == null && setDetailError(sensorDetailsErrors, 'reportDataType')

    if (Object.keys(sensorDetailsErrors).length > 0) {
      sensorConfigErrors = { details: { ...sensorDetailsErrors } }
    }

    //Check Alert Configs
    const sensorAlertConfigErrors = sensorDetails.alerts?.map((alert) => {
      const alertErrors: SensorAlertError = {}
      alert.dataType == null && setAlertError(alertErrors, 'dataType')
      alert.criticality == null && setAlertError(alertErrors, 'criticality')

      if (isNullUndefinedOrZero(alert.suppression?.duration) || isNullUndefinedOrEmptyString(alert.suppression?.duration)) {
        setAlertError(alertErrors, 'suppression')
      }

      if (alert.limits?.UPPER?.value != null && alert.limits.LOWER?.value != null) {
        const lowLimit = alertLimitToPOSTPayload(alert.dataType?.source, alert.limits.LOWER)
        const highLimit = alertLimitToPOSTPayload(alert.dataType?.source, alert.limits.UPPER)
        if (highLimit != null && lowLimit != null && highLimit <= lowLimit) {
          setAlertError(alertErrors, 'limits')
        }
      } else if (alert.limits?.UPPER?.value == null && alert.limits?.LOWER?.value == null) {
        alertErrors.limits = 'Must enter either Upper or Lower limit for alert'
      }
      if (Object.keys(alertErrors).length > 0) {
        return { ...alertErrors }
      } else {
        return undefined
      }
    })

    if (sensorAlertConfigErrors?.some((alertError) => alertError && Object.keys(alertError).length > 0)) {
      sensorConfigErrors = { ...sensorConfigErrors, alerts: [...sensorAlertConfigErrors] }
    }

    if (Object.keys(sensorConfigErrors).length === 0) {
      return null
    }

    return sensorConfigErrors
  }, [sensorDetails])

  // API

  const onSaveClick = useCallback(async () => {
    if (errors == null || Object.keys(errors).length === 0) {
      //Save the config
      const sensorActions = sensorDetails.alerts?.reduce((newActions, alertConfiguration) => {
        if (alertConfiguration.criticality?.value && alertConfiguration.dataType && alertConfiguration.suppression && canEditAlerts) {
          const editedAction: SensorAction = {
            id: alertConfiguration.id,
            active: alertConfiguration.active,
            reportTemplateId: alertConfiguration.reportTemplateId || 15,
            criticality: alertConfiguration.criticality.value as SensorAlertCriticality,
            dataType: alertConfiguration.dataType.source,
            lowLimit: alertLimitToPOSTPayload(alertConfiguration.dataType.source, alertConfiguration.limits?.LOWER),
            highLimit: alertLimitToPOSTPayload(alertConfiguration.dataType.source, alertConfiguration.limits?.UPPER),
            duration: `${durationAsSeconds(alertConfiguration.suppression)}`,
            recurrence: alertConfiguration.recurrence ? `${durationAsSeconds(alertConfiguration.recurrence)}` : null,
            ...getAlertRecipients(alertConfiguration),
            alertInC: alertConfiguration.alertInC,
            followBusinessHours: alertConfiguration.followBusinessHours,
          }
          return [...newActions, { ...editedAction }]
        }
        return [...newActions]
      }, [] as SensorAction[])
      const data: SensorDetailsPOSTPayload = {
        locationId: sensorDetails.location?.value,
        departmentId: sensorDetails.department?.value,
        sensorModelId: sensorDetails.model?.value,
        active: sensorDetails.active ? true : sensorDetails.active === false ? false : true,
        name: sensorDetails.name,
        publicAddr: sensorDetails.publicAddr,
        unitTypeId: sensorDetails.unitType?.value,
        tag: [sensorDetails.category?.label],
        reportDataType: sensorDetails.reportDataType?.value,
        actions: sensorActions && sensorActions.length ? [...sensorActions] : undefined,
      }
      try {
        // Initial notification for user to know action is in progress
        // and doesn't click several times
        notify(true, 'Saving...')
        if (sensorDetails.id != null && canEditSensor) {
          await editSensor(sensorDetails.id, data)
          notify(true, 'Sensor has been updated successfully!', 1000)
          // setTimeout(() => {
          //   window.location.reload()
          // }, 1000)
        } else if (editContext === 'new') {
          const res = await createNewSensor(data)
          notify(true, 'Sensor has been created successfully!', 1000)
          if (res.data != null) {
            const newSensorKey = Object.keys(res.data)[0]
            if (!isNullOrUndefined(newSensorKey) && typeof res.data != 'string') {
              const newSensorInfo = res.data[newSensorKey]
              if (newSensorInfo) {
                const newPathname = `../sensors/${newSensorInfo.id}`

                setTimeout(() => {
                  history.push(newPathname)
                }, 1000)
              }
            }
          }
        } else {
          throw new Error('Unable to create or modify sensor. Please contact PathSpot support.')
        }
      } catch (e) {
        notify(false, 'Something went wrong. Sensor configuration not saved....')
      }
    }
  }, [errors, sensorDetails, history])

  const setFieldValue = useCallback((field: keyof SensorDetails, value: valueof<SensorDetails>) => {
    _setSensorDetails((_sensorDetails) => ({ ..._sensorDetails, [field]: value }))
  }, [])

  const addAlert = useCallback(() => {
    const defaultTempUnit = authState.temperatureInC ? 'C' : 'F'
    const newAlert: SensorAlertConfiguration = {
      alertInC: false,
      active: true,
      reportTemplateId: 15,
      dataType: {
        source: 'TEMPERATURE',
        label: SensorDataTypeLabel.get('TEMPERATURE'),
        value: 'TEMPERATURE',
      },
      limits: {
        [SensorBounds.UPPER]: generateSensorConfigAlertLimit('TEMPERATURE', undefined, SensorBounds.UPPER, defaultTempUnit),
        [SensorBounds.LOWER]: generateSensorConfigAlertLimit('TEMPERATURE', undefined, SensorBounds.LOWER, defaultTempUnit),
      },
      followBusinessHours: false,
    }
    const currentAlerts = sensorDetails.alerts
    if (Array.isArray(currentAlerts)) {
      setFieldValue('alerts', [...currentAlerts, newAlert])
    } else {
      setFieldValue('alerts', [newAlert])
    }
  }, [authState.temperatureInC, sensorDetails.alerts, setFieldValue])

  const editAlert = useCallback(
    (
      index: number,
      field: keyof SensorAlertConfiguration | Array<keyof SensorAlertConfiguration>,
      value: valueof<SensorAlertConfiguration> | Array<valueof<SensorAlertConfiguration>>
    ) => {
      //When units are being changed, the value parameter has the previous value and previous unit
      const currentAlerts = sensorDetails.alerts ? [...sensorDetails.alerts] : undefined
      const currentAlert = currentAlerts?.[index]
      if (currentAlert) {
        const alertToEdit = { ...currentAlert }
        if (Array.isArray(field)) {
          if (Array.isArray(value)) {
            const newAlert = field.reduce(
              (alertObject: SensorAlertConfiguration, currentField: keyof SensorAlertConfiguration, idx: number) => {
                return { ...alertObject, [currentField]: value[idx] }
              },
              { ...alertToEdit }
            )
            currentAlerts[index] = { ...newAlert }
          }
        } else {
          const newAlert = { ...alertToEdit, [field]: value }
          if (field === 'dataType') {
            const newDataType: SensorDataType = (value as { value: SensorDataType }).value
            if (newDataType !== alertToEdit.dataType?.value) {
              if (newAlert.limits?.LOWER) {
                newAlert.limits.LOWER = generateSensorConfigAlertLimit(newDataType, undefined, SensorBounds.LOWER, null)
              }
              if (newAlert.limits?.UPPER) {
                newAlert.limits.UPPER = generateSensorConfigAlertLimit(newDataType, undefined, SensorBounds.UPPER, null)
              }
              currentAlerts[index] = { ...newAlert }
            }
          } else {
            currentAlerts[index] = { ...newAlert }
          }
        }

        setFieldValue('alerts', [...currentAlerts])
      }
    },
    [sensorDetails, setFieldValue]
  )

  const removeAlert = useCallback(
    (index: number) => {
      if (index >= 0) {
        editAlert(index, 'active', false)
      }
    },
    [editAlert]
  )

  const contextState = useMemo(() => {
    return {
      options: sensorOptions,
      alertableUserOptions,
      permissions,
      errors,
      sensorDetails,
      editContext,
      isLoading: permsLoading || usersLoading || modelsLoading || sensorLoading || unitTypesIsLoading,
      canViewSensorAndActions,
      canEditSensor,
      canEditAlerts,
      setFieldValue,
      removeAlert,
      addAlert,
      editAlert,
      onSaveClick,
      onResetClick,
      userPreferredTemperatureUnit: authState.temperatureInC ? 'C' : ('F' as SensorTemperatureUnit),
    }
  }, [
    sensorOptions,
    alertableUserOptions,
    permissions,
    errors,
    sensorDetails,
    editContext,
    permsLoading,
    usersLoading,
    modelsLoading,
    sensorLoading,
    unitTypesIsLoading,
    canViewSensorAndActions,
    canEditSensor,
    canEditAlerts,
    setFieldValue,
    removeAlert,
    addAlert,
    editAlert,
    onSaveClick,
    authState.temperatureInC,
  ])

  return (
    <SensorDetailConfigurationContext.Provider value={contextState}>
      <ToastContainer />
      {children}
    </SensorDetailConfigurationContext.Provider>
  )
}
export { SensorDetailContainer, SensorDetailConfigurationContext }

import { SelectableItem } from '../../../api/types'
import unitCategoryGroupData from '../api/sensorCategories.json'

/**
 * Sensor Permissions Types
 */
export type SensorDepartmentPermissionItem = {
  value: number
  label: string
}
export type SensorLocationPermissionItem = {
  value: number
  label: string
  departments: Array<SensorDepartmentPermissionItem>
}
export type SensorPermType = 'viewSensorsAndActions' | 'view_sensors_and_actions' | 'editSensors' | 'edit_sensors'

export type SensorActionPermType = 'viewSensor' | 'editSensor' | 'editAction'

export type SensorPerms = {
  [key in SensorActionPermType]?: SensorLocationPermissionItem[]
}

/**
 * Sensor Unit Type
 */
export type SensorUnitType = {
  id: string
  unitTypeGroup: string
  unitType: string
  description: string
  active: boolean
}

export type UnitCategory = {
  category: string
  description: string
  available: boolean
}

export type UnitCategoryGroup = {
  categoryGroup: string
  categories: UnitCategory[]
}

export const SensorUnitCategory = Object.fromEntries(
  unitCategoryGroupData
    .flatMap((group: UnitCategoryGroup) => group.categories)
    .filter((category: UnitCategory) => category.available)
    .map((category) => [category.category, category.description])
) as Record<string, string>

export type SensorUnitCategoryType = keyof typeof SensorUnitCategory

export const SensorUnitCategoryList = unitCategoryGroupData
  .map((group: UnitCategoryGroup) => ({
    label: group.categoryGroup,
    value: group.categoryGroup,
    source: group,
    items: group.categories
      .filter((category) => category.available)
      .map((category) => ({
        label: category.category,
        value: category.description,
        source: category,
      })),
  }))
  .filter((group) => group.items.length > 0)

export type SensorUnitCategoryGroup = typeof SensorUnitCategoryList

//Get a list of all possible categories from unit definitions
export const SensorCategoryList = SensorUnitCategoryList.flatMap((unitCategory) => unitCategory.items.map((item) => item.label))

//Create type from the list of categories
export type SensorCategory = string //typeof SensorCategoryList[number]

export const ReportDataTypeList: SelectableItem<string>[] = [
  { label: 'Temperature', value: 'TEMPERATURE', source: 'TEMPERATURE' },
  { label: 'Secondary Probe', value: 'TEMPERATURE_SECONDARY', source: 'TEMPERATURE_SECONDARY' },
]


export enum SensorDataTypeEnum {
  TEMPERATURE = 'TEMPERATURE',
  TEMPERATURE_SECONDARY = 'TEMPERATURE_SECONDARY',
  HUMIDITY = 'HUMIDITY',
  BATTERY = 'BATTERY',
  RSSI = 'RSSI',
}
export const SensorDataTypeLabel = new Map<SensorDataType, string>([
  ['TEMPERATURE', 'Temperature'],
  ['TEMPERATURE_SECONDARY', 'Probe Temperature'],
  ['HUMIDITY', 'Humidity'],
  ['BATTERY', 'Battery'],
  ['RSSI', 'Signal Strength (RSSI)'],
])
export type SensorDataType = keyof typeof SensorDataTypeEnum //equivalent to 'TEMPERATURE' | 'TEMPERATURE_SECONDARY' | 'HUMIDITY' | 'BATTERY' | 'RSSI'
export const SensorDataTypeList = Object.entries(SensorDataTypeEnum).map(([key, value]: [string, SensorDataTypeEnum]) => {
  const selectableDataType: SelectableItem<SensorDataType> = {
    label: SensorDataTypeLabel.get(key as SensorDataType),
    value: value,
    source: value,
  }
  return selectableDataType
})

export enum SensorDataUnitEnum {
  'C' = 'C',
  'F' = 'F',
  '%' = '%',
  'dB' = 'dB',
}
export type SensorTemperatureUnit = 'C' | 'F'
export type SensorBatteryUnit = '%'
export type SensorHumidityUnit = '%'
export type SensorRSSIUnit = 'dB'
export type SensorDataUnitType = SensorTemperatureUnit | SensorBatteryUnit | SensorHumidityUnit | SensorRSSIUnit

export type SensorDataTypeUnitType<T extends SensorDataType> = T extends
  | SensorDataTypeEnum.TEMPERATURE
  | SensorDataTypeEnum.TEMPERATURE_SECONDARY
  ? SensorTemperatureUnit
  : T extends SensorDataTypeEnum.HUMIDITY
  ? SensorHumidityUnit
  : T extends SensorDataTypeEnum.BATTERY
  ? SensorBatteryUnit
  : T extends SensorDataTypeEnum.RSSI
  ? SensorRSSIUnit
  : never

export interface SensorValue {
  value: number
  type: SensorDataType
  unit: SensorDataUnitType
}
export type SensorDataValueType = number | string | null
export type SensorLimitValueType = number | null
//How to get a computed property value enum equivalent:
export const SensorEvent = {
  [SensorDataTypeEnum.TEMPERATURE]: 'TEMPERATURE',
  [SensorDataTypeEnum.TEMPERATURE_SECONDARY]: 'TEMPERATURE_SECONDARY',
  [SensorDataTypeEnum.HUMIDITY]: 'HUMIDITY',
  [SensorDataTypeEnum.BATTERY]: 'BATTERY',
  [SensorDataTypeEnum.RSSI]: 'RSSI',
} as const
export type SensorEventType = typeof SensorEvent

export enum SensorTimeUnitEnum {
  years = 'years',
  months = 'months',
  weeks = 'weeks',
  days = 'days',
  hours = 'hours',
  mins = 'mins',
  s = 's',
  ms = 'ms',
}
export type SensorTimeUnit = keyof typeof SensorTimeUnitEnum

export interface SensorTimeInterval {
  start: number
  end: number
  duration: number
  unit: SensorTimeUnit
}

/**
 *Sensor Overview Dashboard Types
 */
export type InboundSensorWhen = {
  str: string
  epoch: number
  epoch_ms: number
}

export type SensorTriggerStatus = 'PENDING' | 'ALERT_SENT' | 'COMPLETE'

export type InboundOverviewSensorData = {
  createdWhen: InboundSensorWhen
  sensorId: string
  sensorUnit: string
  sensorValue: number
  dataType: SensorDataType
}

export type InboundOverviewSensor = {
  tag: Array<SensorCategory> | null
  locationId: number
  locationName: string
  reportDataType: SensorDataType
  sensorId: string
  sensorModelId: number
  sensorName: string
}

export type SensorLimitType = 'max' | 'min' | 'setpoint' | 'duration' | 'frequency'

export type InboundSensorAction = {
  alertInC: boolean | null
  criticality: SensorAlertCriticality
  dataType: SensorDataType
  duration: number
  highLimit: number | null
  lastReadingWhen: InboundSensorWhen
  lowLimit: number | null
  recurrence: number | null
  saActive: boolean
  saId: string | null //sensor action id
  saStartDatumId: string | null // start data point of sensor action
  sensorId: string
  suppressUntil: InboundSensorWhen | null
  taAlertStartWhen: InboundSensorWhen | null
  taConsumedWhen: InboundSensorWhen | null
  taCreatedWhen: InboundSensorWhen | null
  taDataType: SensorDataType | null
  taIsOor: boolean | null
  taStatus: SensorTriggerStatus | null
  taValue: number | null
}

export type ReducedSensorAction = InboundSensorAction & {
  limitUnit: SensorDataUnitType
}
export interface SensorsOverviewPayload {
  actionData: Array<InboundSensorAction>
  sensorData: Array<InboundOverviewSensorData>
  sensors: Array<InboundOverviewSensor>
}

export interface SensorOverviewPayloadItem {
  active: boolean
  locationId: number
  locationName: string
  sensorName: string
  sensorId: string
  sensorIdAsKey?: string
  deployedSensorId?: string
  tag?: Array<string>
  reportDataType: SensorDataType
  isFavorited?: boolean
}

export interface SensorGridItem extends InboundOverviewSensor {
  isFavorited: boolean
  primaryDataCurrent?: InboundOverviewSensorData
  primaryDataAlerts?: Array<ReducedSensorAction>
  primaryDataOutOfAlertsRange?: Array<boolean> //T/F map of above of whether or not the primary datatype is out of range
  actionsOnAlert: Array<ReducedSensorAction>
  category: SensorCategory
  actions: Array<ReducedSensorAction>
  data: Array<InboundOverviewSensorData>
  sensorGridKey: string
}

export interface SensorListItem {
  name: string
  locationId: number
  locationName: string
  departmentId: number
  departmentName: string
  sensorId: string
  active: boolean
  tag: string[] // where sensor is located
  sensorType?: SensorType
  actions?: SensorAction[] | null
}

// Sensor action below is save payload
export interface SensorAction<T extends SensorDataType = SensorDataType> {
  id?: string
  dataType: T
  highLimit?: number | null
  hlUnits?: SensorDataTypeUnitType<T>
  lowLimit?: number | null
  llUnits?: SensorDataTypeUnitType<T>
  duration: string
  durationUnits?: string
  criticality: SensorAlertCriticality
  recurrence?: string | null
  recurrenceUnits?: string
  cc?: Array<number>
  bcc?: Array<number>
  to?: Array<number>
  phoneTo?: Array<number>
  reportTemplateId: number
  active: boolean
  followBusinessHours?: boolean
  alertInC?: boolean
  // pathspotTeamMember: "", // is this needed?
}

export interface SensorType {
  sensorModelId: number
  protocol: string
  name?: string
}

export enum SensorAlertCriticalityEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}
export type SensorAlertCriticality = keyof typeof SensorAlertCriticalityEnum

export enum SensorModelProtocol {
  BLUETOOTH = 'BLUETOOTH',
  LORA = 'LORA',
}

export enum AlertTemperatureField {
  TEMPERATURE = 'TEMPERATURE',
  TEMPERATURE_SECONDARY = 'TEMPERATURE_SECONDARY',
}

import {
  SensorAlertCriticality,
  SensorAlertCriticalityEnum,
  SensorDataType,
  SensorDataUnitType,
  SensorGridItem,
  SensorLimitType,
  SensorTimeInterval,
  SensorTimeUnit,
  SensorTriggerStatus,
} from '../../api/sensor-types'
import {
  ChartLegendOptions,
  ChartOptions,
  PositionType,
  ChartTitleOptions,
  ChartLegendLabelItem,
  ChartData,
  ChartLegendItem,
  ChartDataSets,
} from 'chart.js'
import { NumberFormat } from 'libphonenumber-js'

export type SensorDataSignal<V, T> = {
  values: Array<V>
  unit: string | T
}

export type SensorGraphPayloadSeries = {
  data: Array<number>
  unit: SensorDataUnitType
  timeEpoch: Array<number>
  timeLocal: Array<string>
}

export type SensorGraphDataPayload = {
  locationId: number
  locationName: string
  sensorId: string
  sensorName: string
} & Partial<Record<SensorDataType, SensorGraphPayloadSeries>>

export interface SensorTimeDomain {
  values: Array<number> //POSIX time
  unit: SensorTimeUnit
  interval: SensorTimeInterval
  gapIntervals: Array<SensorTimeInterval>
}

export type SensorDataTrace = {
  dataType: SensorDataType
  values: Array<number | null>
  unit: SensorDataUnitType
  max: number | null
  min: number | null
}

export type SensorGraphBaseSeries = {
  trace: SensorDataTrace
  domain: SensorTimeDomain
  length: number
}

export enum SensorGraphDataSparsityEnum {
  RAW = 'RAW',
  UPSAMPLED = 'UPSAMPLED',
  DOWNSAMPLED = 'DOWNSAMPLED',
}

export type SensorGraphDataSparsity = keyof typeof SensorGraphDataSparsityEnum

export type SensorGraphSparsitySeries<T extends SensorGraphDataSparsity = SensorGraphDataSparsity> = Partial<
  Record<T, SensorGraphBaseSeries>
>
export type SensorGraphAlertBound = 'Max' | 'Min'

export type SensorGraphAlertSparsitySeries<
  T extends SensorGraphDataSparsity = SensorGraphDataSparsity,
  C extends SensorAlertCriticality = SensorAlertCriticality
> = SensorGraphSparsitySeries<T> & {
  criticality: C
  alertStartWhen: number | null
  consumedWhen: number | null
  duration: number
  recurrence: number | null
  limitValue: number
  limitUnit: SensorDataUnitType
  limitType: SensorGraphAlertBound
  sensorActionId: string
  limitTypeIndex: number // keep track of multiples of same type of alert
}

export type SensorGraphDataSeries<
  T extends SensorDataType = SensorDataType,
  S extends SensorGraphDataSparsity = SensorGraphDataSparsity
> = Partial<Record<T, SensorGraphSparsitySeries<S>>>

export type SensorGraphAlertDataSeries<
  T extends SensorDataType = SensorDataType,
  S extends SensorGraphDataSparsity = SensorGraphDataSparsity,
  C extends SensorAlertCriticality = SensorAlertCriticality
> = Partial<Record<T, Array<SensorGraphAlertSparsitySeries<S, C>>>>

export type SensorGraphData<
  T extends SensorDataType = SensorDataType,
  S extends SensorGraphDataSparsity = SensorGraphDataSparsity,
  C extends SensorAlertCriticality = SensorAlertCriticality
> = {
  cardInfo: Partial<SensorGridItem>
  series: SensorGraphDataSeries<T, S>
  alertLines: SensorGraphAlertDataSeries<T, S, C>
}
export type SensorGraphTicks = {
  targetAmount?: number
  labels?: Array<string>
  showTicks?: boolean
  lineWidth?: number
  color?: string
  fontSize?: string
  showGridLines?: boolean
  layout?: 'normal' | 'vertical' | 'slanted'
  maxTicksLimit?: number
  maxRotation?: number
  minRotation?: number
}

export type SensorGraphDisplayAxis = {
  label: string
  showLabel: boolean
  showAxis: boolean
  timeFormat?: string
  unit?: SensorTimeUnit | SensorDataUnitType | 'DateTime'
  lims?: {
    min?: number
    max?: number
  }
  ticks?: SensorGraphTicks
}

export type SensorGraphDisplayAxes = {
  x: SensorGraphDisplayAxis
  y: SensorGraphDisplayAxis
}
export type SensorGraphLegend = ChartLegendLabelItem

// export type SensorGraphSeriesDisplayConfig = {
//   lineLabel: string
//   lineColor: string
//   lineStyle: string
//   lineThickness: string
//   show: boolean
// }

// export type SensorGraphDisplayConfig = {
//   series: SensorGraphSeriesDisplayConfig
//   title: string
//   legend: SensorGraphLegend
//   axes: SensorGraphDisplayAxes
// }
// export type SensorGraph<
//   T extends SensorDataType = SensorDataType,
//   S extends SensorGraphDataSparsity = SensorGraphDataSparsity,
//   C extends SensorAlertCriticalityEnum = SensorAlertCriticalityEnum
// > = {
//   data: SensorGraphData<T, S, C>
//   config: SensorGraphDisplayConfig
// }

export interface SensorGraphDisplayPreferences {
  useNoData: boolean
  useInterpolated: boolean
  useDownsampled: boolean
  useOriginal: boolean
  useMaxMinLines: boolean
  useAlertOverlay: boolean
  showMovingAverageLine: boolean
  showConstantAverageLine: boolean
  showAlertMaxLine: boolean
  showAlertMinLine: boolean
  showCubic: boolean
  showGaps: boolean
  showAlertMaxDurationExceeded: boolean
  showAlertMinDurationExceeded: boolean
}

export interface SensorGraphDisplayDataset extends ChartDataSets {
  label?: string
  data?: Array<number | null>
  showLine?: boolean
  hoverOffset?: number
  legendOptions?: SensorGraphLegend
}
export type SensorGraphDisplayData = {
  labels: Array<string | [string, string]> //Effectively the x data vector
  datasets: Array<SensorGraphDisplayDataset>
  axes: SensorGraphDisplayAxes
}

// export type SensorGraphDisplay = {
//   data?: SensorGraphDisplayData
//   options?: ChartOptions
// }

export type SensorGraphDisplay =
  | { status: 'valid'; options: ChartOptions; data: SensorGraphDisplayData }
  | { status: 'invalid'; options: undefined; data: undefined }

export type SensorGraphAlertThresholdLineType<
  C extends SensorAlertCriticality = SensorAlertCriticality,
  B extends SensorGraphAlertBound = SensorGraphAlertBound
> = `Alert: ${C} (${B})`
export type SensorGraphAlertExceededLineType<
  C extends SensorAlertCriticality = SensorAlertCriticality,
  B extends SensorGraphAlertBound = SensorGraphAlertBound
> = `Alert Exceeded: ${C} (${B})`
export type SensorGraphDataLineType = SensorDataType | 'Unavailable' | 'Rolling Average' | 'Constant Average'
export type SensorGraphAlertLineType = SensorGraphAlertThresholdLineType | SensorGraphAlertExceededLineType

export type SensorGraphLineType = SensorGraphDataLineType | SensorGraphAlertLineType

export type SensorGraphLineDisplayCategory = SensorDataType | 'UNAVAILABLE' | 'AVERAGE' | 'UNKNOWN' | SensorAlertCriticality

export type SensorGraphLineDisplayOptions = {
  multiAlertIdx?: number //Used when there is more than one alert of the same type and criticality
  isComboLine?: boolean //Necessary to do things like having a single legend item for both alert max and min, i.e. 'Alert Max/Min'
  hasGaps?: boolean //Used when partial data exists to highlight where the gap is
  hidden?: boolean //To toggle visibility
}

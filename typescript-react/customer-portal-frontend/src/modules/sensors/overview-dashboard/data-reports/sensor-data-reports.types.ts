import { CurrentUser } from '../../../../api/authentication/AuthenticationContext'
import { SelectableItem } from '../../../../webapp-lib/pathspot-react'

export type TimeMeridiem = 'am' | 'pm'

export enum SensorDataReportState {
  unknown = 'unknown',
  pendingSelections = 'pendingSelections',
}
export enum SensorDataReportDownloadState {
  unknown = 'unknown',
  pendingSelections = 'pendingSelections',
  fetching = 'fetching',
}

export enum SensorDataReportContext {
  downloadReport = 'downloadReport',
  startDataReport = 'startDataReport',
  unknown = 'unknown',
}

export type InboundCreatedWhen = {
  str: string
  epoch: number
  epoch_ms: number
}

export type CurrentReport = {
  reportDetails: InboundReport
  reportSelections: ReportSelections
  locationOptions: Array<SelectableItem<LocationOption>>
  departmentOptions?: Array<SelectableItem<DepartmentOption>>
}

export type ReportQueryParams = {
  locationId: string
  departmentId?: string
  reportId: string
  date: string
}

export type DepartmentOption = {
  departmentName: string
  departmentId: number
}

export type LocationOption = {
  customerId: number
  customerName: string
  locationId: number
  locationName: string
  sensorCount: number
  timezone: string
  departments?: Array<DepartmentOption>
  departmentOptions?: Array<SelectableItem<DepartmentOption>>
}
export type ReportModalOption = {
  customerId: number
  id: number
  name: string
}
export type ReportCheckColumn = 'day_of_month' | 'reading' | 'corrective_action' | 'user'

export type ReportCheck = {
  columns: Array<ReportCheckColumn>
  startTime: string
  endTime: string
  name: string
}
export type TableStringFormat = { size: number; style: string; family: string }

export type ReportTableFormatting = {
  font: TableStringFormat
  header: {
    columns: Array<string>
    colWidths: Array<number>
    headingsStyle: { sizePt: number; emphasis: string; fillcolor: Array<number> }
  }
  preWrite: { h: number; txt: string }
}

export type TableString = {
  x: number
  y: number
  font: TableStringFormat
}

export type ReportTiming = {
  table: ReportTableFormatting
  checks: Array<ReportCheck>
  footer: string
  strings: Array<TableString>
}
export type InboundReading = {
  active: boolean
  category: Array<string>
  createdWhen: InboundCreatedWhen
  departmentId: number
  localCreatedWhen: InboundCreatedWhen | null
  locationId: number
  outOfRange: boolean
  readingId: string | null
  sensorId: string
  sensorCheckId: number
  sensorName: string
  sensorReading: string | number | null
  sensorUnit: 'C' | 'F'
  unitType: string
}
export type InboundSignedReading = {
  readingWhen: InboundCreatedWhen
  readingValue: number | string
  readingId: string
  signedWhen: string
  signerId: number | string
  signerName: string
  reportDate: string
  reportConfigEntryIndex: number
  id: string
  correctiveAction?: string
  overrideTime?: InboundCreatedWhen
  overrideValue?: string
  sensorId: string
}
export type FormattedReading = InboundReading & {
  signerId: number | string
  signedWhen: string
  signerName: string
  reportDate: string
  reportConfigEntryIndex: number | null
  id: string
  comment?: string
  overrideTime?: InboundCreatedWhen
  overrideValue?: string
  override: boolean
  sensorCheckValue?: boolean
}
export type TableFormattedReading = FormattedReading & {
  temperature: {
    reading: string
    unit: string
  }
  overrideTemperature: {
    reading: string
    unit: string
  }
}
export type MeridiemSet = {
  data: Array<FormattedReading>
  rowContext: TableRowContext
}
export type InboundReport = {
  readings: Array<InboundReading>
  reportTiming: ReportTiming
  signed: Array<InboundSignedReading>
}

export type ReportOption = {
  cadence: null | string
  customerId: number
  id: number
  readingUnit: 'C' | 'F'
  sensorCategories: null | Array<string>
  timing: null | ReportTiming
}

export type ReportSelections = {
  selectedDate: string
  selectedLocation: SelectableItem<LocationOption>
  selectedReport: SelectableItem<ReportOption>
  selectedDepartment?: SelectableItem<DepartmentOption>
}

export type ReportSaveItem = {
  sensorId: string
  correctiveAction: string | null
  overrideValue: number | null
  overrideTime: number | null
  readingId: string
  reportConfigEntryIndex: number
}

export type OutboundReportSave = {
  reportId: string
  reportDate: string
  entries: Array<ReportSaveItem>
}
export interface SensorDataReportModal {
  name: string
  user: CurrentUser
}
export interface SensorDataReportModalState {
  showModal: boolean
  context: SensorDataReportContext
  contextState?: SensorDataReportState | SensorDataReportDownloadState
  payload?: Record<string, unknown>
  options?:
    | {
        [T in string]: Array<unknown>
      }
    | null
  callbacks?:
    | {
        [T in string]: () => void
      }
    | null
}

export const ModalContext = SensorDataReportContext

export const defaultModalState: SensorDataReportModalState = {
  showModal: false,
  context: ModalContext.unknown,
  contextState: undefined,
  payload: {} as Record<string, unknown>,
  options: null,
  callbacks: null,
}
export enum TableRowContext {
  expanded = 'expanded',
  normal = 'normal',
  unknown = 'unknown',
}

// export type ReportSubmission = {
//   reportId: number
//   date: string
//   entries: Array<ReportSaveItem>
// }

export type ReportTableRow = {
  departmentId: number
  locationId: number
  sensorCheckId: number
  sensorId: string
  sensorCheckValue: boolean //always false on first reception of items
  sensorName: string
  readingId: string | null
  time: string
  temperature: string
  user: string | null
  override: boolean
  overrideTime: string
  overrideValue: number
  comment: string
  outOfRange: boolean
  limitExceeded?: number
  temperatureExceeded?: string
  previouslySigned: boolean
  unitType: string | null
}

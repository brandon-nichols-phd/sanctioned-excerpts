import { useMemo } from 'react'
import _ from 'lodash'
import { SelectableItem } from '../../webapp-lib/pathspot-react'
import { LocationOption, ReportModalOption } from './overview-dashboard/data-reports/sensor-data-reports.types'
import { ReportJobReportType } from '../utils/reports/use-report-job'

type ProcessedOption = { id: number; name: string }

export type SelectLocationOption = SelectableItem<LocationOption>
export type SelectReportOption = SelectableItem<ReportModalOption>

type Return = {
  customers: ProcessedOption[]
  reports: Array<ProcessedOption & SelectReportOption>
  locations: Array<ProcessedOption & SelectLocationOption>
  departments: Array<
    ProcessedOption & {
      departmentId: number
      departmentName: string
    }
  >
}

export type UseSensorsReportingDropdownsProps = {
  customerId: number | null
  locationId: number | null
  reportType: ReportJobReportType | null
  locationOptions: Array<SelectableItem<LocationOption>>
  reportOptions: Array<SelectableItem<ReportModalOption>>
}

export const useSensorsReportingDropdowns = (props: UseSensorsReportingDropdownsProps): Return => {
  return useMemo(
    () => ({
      customers: _.sortBy(
        _.uniqBy(props.locationOptions, (option) => option.source.customerId).map((option) => ({
          id: option.source.customerId,
          name: option.source.customerName,
        })),
        (customer) => customer.name
      ),
      reports: _.sortBy(
        props.reportOptions
          .filter((option) => option.source.customerId === props.customerId)
          .map((report) => ({
            ...report,
            id: report.source.id,
            name: report.label,
          })),
        (report) => report.name
      ),
      locations: _.sortBy(
        props.locationOptions
          .filter(
            (option) =>
              option.source.customerId === props.customerId &&
              props.reportType !== null &&
              (props.reportType !== ReportJobReportType.HACCP_A3 || option.source.sensorCount > 0)
          )
          .map((location) => ({
            ...location,
            id: location.value,
            name: location.label,
          })),
        (location) => location.name
      ),
      departments: _.sortBy(
        Object.values(props.locationOptions.find((option) => props.locationId === option.value)?.source.departments ?? {}).map(
          (department) => ({
            ...department,
            id: department.departmentId,
            name: department.departmentName,
          })
        ),
        (department) => department.name
      ),
    }),
    [props.customerId, props.reportType, props.reportOptions, props.locationId, props.locationOptions]
  )
}

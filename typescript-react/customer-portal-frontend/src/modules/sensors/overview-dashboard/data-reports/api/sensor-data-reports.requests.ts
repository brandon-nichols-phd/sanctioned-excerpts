import moment from 'moment'
import { api } from '../../../../../api/api'
import { API_URL } from '../../../../../api/constants'
import queryString from 'query-string'
import { UnzippedPayload, RequestSuccessful } from '../../../../../api/api.types'
import { InboundReport, OutboundReportSave, ReportSelections } from '../sensor-data-reports.types'
import { LocationOption } from '../../../overview-dashboard/data-reports/sensor-data-reports.types'

export enum REPORTING_ENDPOINTS {
  LOCATIONS = '/reporting/list-locations',
  REPORT_TYPES = '/reporting/list-reports',
  APPROVE = '/reporting/approve-report',
}

export const getReportQueryString = (reportObject: ReportSelections) => {
  const { selectedLocation, selectedReport, selectedDate, selectedDepartment } = reportObject
  const reportDate = selectedDate ? moment(selectedDate) : moment()
  const stringifiedQuery = queryString.stringify(
    {
      date: reportDate.format('YYYY-MM-DD'),
      locationId: selectedLocation.value,
      reportId: selectedReport.value,
      departmentId: selectedDepartment?.value ? selectedDepartment.value : undefined,
    },
    { arrayFormat: 'comma' }
  )
  return stringifiedQuery
}

export const fetchReportLocations = async (): Promise<UnzippedPayload<Array<LocationOption>>> => {
  const endpointData = await api.withAuth().url(`${API_URL}${REPORTING_ENDPOINTS.LOCATIONS}`).get().json().then(api.zjson)
  return endpointData as any
}

export const fetchReportTypes = async (): Promise<UnzippedPayload<Array<LocationOption>>> => {
  const endpointData = await api.withAuth().url(`${API_URL}${REPORTING_ENDPOINTS.REPORT_TYPES}`).get().json().then(api.zjson)
  return endpointData as any
}

export const getReportForApproval = async (reportObject: ReportSelections): Promise<UnzippedPayload<InboundReport>> => {
  const stringifiedQuery = getReportQueryString(reportObject)
  const endpointData = await api.withAuth().url(`${API_URL}${REPORTING_ENDPOINTS.APPROVE}?${stringifiedQuery}`).get().json().then(api.zjson)
  return endpointData as any
}
export const submitReportsDetailsForApprovals = async (params: OutboundReportSave): Promise<RequestSuccessful> => {
  const endpointData = await api.withAuth().url(`${API_URL}${REPORTING_ENDPOINTS.APPROVE}`).post(params).json().then(api.zjson)
  return endpointData as any
}

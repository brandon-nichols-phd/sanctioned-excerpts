import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import moment from 'moment'
import * as Sentry from '@sentry/react'
import wretch from 'wretch'
import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_REPORTS_SENSORS_HACCP_A1, API_URL_REPORTS_SENSORS_HACCP_A2, API_URL_REPORTS_SENSORS_HACCP_A3 } from '../../api/constants'
import { SensorTemperatureUnit } from './api/sensor-types'

type ExcelReport = {
  base64Xlsx: string
}
type PdfReport = {
  pdfB64: string
}
type ReportData = PdfReport | ExcelReport

type ReportJob = {
  jobId?: string
  jobStatus: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR'
  result?: string
}

type ErrorResponse = {
  error: boolean
  reason: string
}

export type Return = {
  submit: () => void
  abort: () => void
  response: ReportData | null
  isLoading: boolean
  error: Error | undefined
}

export type ReportType = 'HACCP_A1' | 'HACCP_A2' | 'HACCP_A3'

export type Props = {
  customerId: number | null
  reportType: ReportType | null
  reportId: number | null
  locationId: number | null
  departmentIds: number[]
  tempUnit: SensorTemperatureUnit
  reportDate: Date | null
  onDownloadDone: () => void
}

const getEndpoit = (reportType: ReportType): string => {
  switch (reportType) {
    case 'HACCP_A1':
      return API_URL_REPORTS_SENSORS_HACCP_A1
    case 'HACCP_A2':
      return API_URL_REPORTS_SENSORS_HACCP_A2
    case 'HACCP_A3':
      return API_URL_REPORTS_SENSORS_HACCP_A3
  }
}

const getQueryParams = (params: {
  reportJobId?: string
  customerId: number
  reportId: number
  locationId: number
  departmentIds: number[]
  tempUnit: SensorTemperatureUnit
  reportDate: Date
}) => {
  const queryParams = new URLSearchParams()

  if (params.reportJobId) {
    queryParams.append('reportJobId', params.reportJobId)
  }

  queryParams.append('customerId', params.customerId.toString())
  queryParams.append('reportId', params.reportId.toString())
  queryParams.append('locationId', params.locationId.toString())

  // If "all" (-1) is selected we don't add departments since that signals the backend that we don't cate about them.
  if (!params.departmentIds.includes(-1)) {
    queryParams.append('departmentIds', params.departmentIds.join(','))
  }

  queryParams.append('tempUnit', params.tempUnit)
  queryParams.append('reportDate', moment(params.reportDate).format('YYYY-MM-DD'))

  return queryParams
}

export const useSensorsReporting = (props: Props): Return => {
  const { authState } = useAuthContext()

  const [requestTimestamp, setRequestTimestamp] = useState<number | null>(null)
  const [response, setResponse] = useState<ReportData | null>(null)
  const [apiError, setApiError] = useState<Error>()
  const [reportJob, setReportJob] = useState<ReportJob | null>(null)
  const [processingPayload, setProcessingPayload] = useState(false)

  const { isLoading, isValidating } = useSWR<ReportJob | ErrorResponse, Error>(
    () => {
      if (
        requestTimestamp === null ||
        props.customerId === null ||
        props.reportType === null ||
        props.reportId === null ||
        props.locationId === null ||
        !props.reportDate
      ) {
        return null
      }

      const endpoint = getEndpoit(props.reportType)
      const queryParams = getQueryParams({ ...props, reportJobId: reportJob?.jobId } as Parameters<typeof getQueryParams>[0]).toString()

      return `${endpoint}?${queryParams}`
    },
    authFetcher(authState.accessToken),
    {
      shouldRetryOnError: false,
      // This starts counting from the moment it receives a complete response.
      refreshInterval: 10000,
      refreshWhenHidden: true,
      onError: (error) => {
        setRequestTimestamp(null)
        setApiError(error)
        setReportJob(null)
      },
      onSuccess: (data) => {
        if ('error' in data) {
          setRequestTimestamp(null)
          setApiError(new Error(data.reason))
          setReportJob(null)
          return
        }
        setReportJob(data)

        // A job status of 'ERROR' or 'FINISHED' represents a completed state therefore we process the data and stop
        // polling.
        switch (data.jobStatus) {
          case 'ERROR':
            setApiError(new Error(data.result))
            setRequestTimestamp(null)
            break

          case 'FINISHED': {
            const timestampNow = performance.now()
            const timeElapsed = timestampNow - (requestTimestamp ?? 0)
            const queryParams = getQueryParams({ ...props, reportJobId: reportJob?.jobId } as Parameters<typeof getQueryParams>[0])
            Sentry.metrics.distribution('report_job_request_time', timeElapsed, {
              tags: { reportType: props.reportType, ...Object.fromEntries(queryParams.entries()) },
              unit: 'millisecond',
            })

            setProcessingPayload(true)
            wretch(data.result)
              .get()
              .text()
              .then((encodedData) => ({ data: encodedData }))
              .then(api.zjson)
              .then((reportData: any) => {
                Sentry.metrics.distribution('report_job_download_time', performance.now() - timestampNow, {
                  tags: { reportType: props.reportType, ...Object.fromEntries(queryParams.entries()) },
                  unit: 'millisecond',
                });

                setResponse(reportData.data)
                setRequestTimestamp(null)

                const isPdf = props.reportType === 'HACCP_A3'
                const aLink = document.createElement('a')
                const fileHeader = isPdf
                  ? 'data:application/pdf;base64,'
                  : 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Value is not `null` at this step
                const fileName = `report_${props.reportType!.toLowerCase()}_${moment(props.reportDate).format('YYYY-MM')}.${
                  isPdf ? 'pdf' : 'xlsx'
                }`
                const fileData = isPdf ? (reportData.data as PdfReport).pdfB64 : (reportData.data as ExcelReport).base64Xlsx

                aLink.setAttribute('href', `${fileHeader}${fileData}`)
                aLink.setAttribute('download', fileName)
                aLink.click()

                setProcessingPayload(false)
                props.onDownloadDone()
              })
            break
          }
          case 'RUNNING':
          case 'PENDING':
            break
        }
      },
    }
  )

  // Clear out the saved response when doing new fetches
  useEffect(() => {
    if (isLoading || isValidating) {
      setResponse(null)
      setProcessingPayload(false)
    }
  }, [isLoading, isValidating])

  return useMemo(
    () => ({
      error: apiError,
      response,
      // The reporting is loading so long we haven't reached a completed state on our polling.
      isLoading: isLoading || isValidating || (!!reportJob && !['ERROR', 'FINISHED'].includes(reportJob.jobStatus)) || processingPayload,
      submit: () => {
        setRequestTimestamp(performance.now())
        setApiError(undefined)
        setReportJob(null)
      },
      abort: () => {
        setRequestTimestamp(null)
        setApiError(undefined)
        setReportJob(null)
      },
    }),
    [apiError, response, isLoading, isValidating, reportJob, processingPayload]
  )
}

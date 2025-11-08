import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import moment from 'moment'
import * as Sentry from '@sentry/react'
import wretch from 'wretch'
import useAuthContext from '../../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../../api/api'
import { API_URL_REPORT_JOB } from '../../../api/constants'

const RECEIVE_RAW_RESPONSE = !!process.env.REACT_APP_RUNNING_LOCAL

export enum ReportJobReportType {
  // CLEANUP: Remove this after testing the new way of calculating the report metrics.
  TASK_RESPONSES_OLD = 'TASK_RESPONSES_OLD',
  TASK_RESPONSES = 'TASK_RESPONSES',
  TASK_COMPLETION_PERCENTAGE = 'TASK_COMPLETION_PERCENTAGE',
  TASK_COMPLETION_MATRIX = 'TASK_COMPLETION_MATRIX',
  HACCP_A1 = 'HACCP_A1',
  HACCP_A2 = 'HACCP_A2',
  HACCP_A3 = 'HACCP_A3',
}

export enum ReportJobFileType {
  JSON = 'JSON',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

type B64Report = {
  mime: string
  extension: string
  b64: string
}

type ReportJobResult<ReportType> = {
  jobId?: string
  jobStatus: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR'
  result?: string | ReportType | B64Report
}

type ErrorResponse = {
  error: boolean
  reason: string
}

type ParametersType = {
  reportType: ReportJobReportType | null
  fileType: ReportJobFileType | null
  startDate: Date | null
  endDate: Date | null
  [key: string]: null | string | number | Date | string[] | number[] | Date[]
}

type UseReportJobProps = {
  parameters: ParametersType
  onDownloadDone: () => void
}

export type UseReportJobReturn<ReportType> = {
  submit: () => void
  abort: () => void
  response: ReportType | B64Report | null
  isLoading: boolean
  error: Error | undefined
}

const getQueryParams = (params: string | ParametersType) => {
  const queryParams = new URLSearchParams()

  if (typeof params === 'string') {
    queryParams.append('reportJobId', params)
  } else {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      const paramValues = Array.isArray(paramValue) ? paramValue : [paramValue]
      const queryParamValue = paramValues.reduce<string[]>((accum, aParam) => {
        if (typeof aParam === 'string') {
          accum.push(aParam)
        } else if (typeof aParam === 'number') {
          accum.push(aParam.toString())
        } else if (aParam instanceof Date && !isNaN(aParam.getTime())) {
          accum.push(moment(aParam).format('YYYY-MM-DD'))
        }
        return accum
      }, [])

      if (queryParamValue.length > 0) {
        queryParams.append(paramKey, queryParamValue.join(','))
      }
    }
  }

  if (RECEIVE_RAW_RESPONSE) {
    queryParams.append('_rawResponse', 'yes')
  }

  return queryParams
}

export const useReportJob = <ReportType = B64Report>(props: UseReportJobProps): UseReportJobReturn<ReportType> => {
  const { authState } = useAuthContext()

  const [requestTimestamp, setRequestTimestamp] = useState<number | null>(null)
  const [response, setResponse] = useState<ReportType | B64Report | null>(null)
  const [apiError, setApiError] = useState<Error>()
  const [reportJob, setReportJob] = useState<ReportJobResult<ReportType> | null>(null)
  const [processingPayload, setProcessingPayload] = useState(false)

  const { isLoading, isValidating } = useSWR<ReportJobResult<ReportType> | ErrorResponse, Error>(
    () => {
      if (requestTimestamp === null || Object.values(props.parameters).some((aParam) => aParam === null)) {
        return null
      }
      return `${API_URL_REPORT_JOB}?${getQueryParams(reportJob?.jobId ?? props.parameters).toString()}`
    },
    authFetcher(authState.accessToken, !RECEIVE_RAW_RESPONSE),
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
        if (Object.hasOwn(data, 'error')) {
          setRequestTimestamp(null)
          setApiError(new Error((data as ErrorResponse).reason))
          setReportJob(null)
          return
        }
        const reportJobResult = data as ReportJobResult<ReportType>
        setReportJob(reportJobResult)

        // A status of 'ERROR' or 'FINISHED' represents a completed state, so we process the data and stop polling.
        switch (reportJobResult.jobStatus) {
          case 'ERROR':
            setApiError(new Error(reportJobResult.result as string))
            setRequestTimestamp(null)
            break

          case 'FINISHED': {
            const timestampNow = performance.now()
            const timeElapsed = timestampNow - (requestTimestamp ?? 0)
            const sentryTags = Object.fromEntries(getQueryParams(reportJob?.jobId ?? props.parameters).entries())
            Sentry.metrics.distribution('report_job_request_time', timeElapsed, {
              tags: sentryTags,
              unit: 'millisecond',
            })

            const processReportData = (reportData: ReportType | B64Report | null) => {
              Sentry.metrics.distribution('report_job_download_time', performance.now() - timestampNow, {
                tags: sentryTags,
                unit: 'millisecond',
              })

              setRequestTimestamp(null)

              if (reportData === null) {
                setApiError(new Error('The requested report is missing its data.'))
                setReportJob(null)
                setProcessingPayload(false)
                return
              }

              setResponse(reportData)

              if (Object.hasOwn(reportData as object, 'b64')) {
                const b64Report = reportData as B64Report
                const link = document.createElement('a')

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- `reportType` is not `null` at this step
                const reportType = props.parameters.reportType!.toLowerCase()
                const startDate = moment(props.parameters.startDate).format('YYYY-MM-DD')
                const endDate = moment(props.parameters.endDate).format('YYYY-MM-DD')

                link.setAttribute('href', `data:${b64Report.mime};base64,${b64Report.b64}`)
                link.setAttribute('download', `report_${reportType}_${startDate}-${endDate}.${b64Report.extension}`)
                link.click()
              }

              setProcessingPayload(false)
              props.onDownloadDone()
            }

            setProcessingPayload(true)

            if (RECEIVE_RAW_RESPONSE) {
              processReportData(reportJobResult.result as ReportType | B64Report)
            } else {
              wretch(reportJobResult.result as string)
                .get()
                .text()
                .then((encodedData) => ({ data: encodedData }))
                .then((repData) => api.zjson<ReportType | B64Report>(repData).data)
                .then(processReportData)
            }
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
      // If we haven't reached a completed state on our polling then the reporting is consider to still be loading.
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

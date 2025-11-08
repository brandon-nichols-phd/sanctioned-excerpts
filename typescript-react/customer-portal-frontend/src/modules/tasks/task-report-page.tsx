import React, { FC, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import moment from 'moment'
import Dialog from '@mui/material/Dialog'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'
import { ReportJobFileType, ReportJobReportType, useReportJob } from '../utils/reports/use-report-job'
import { IndividualTaskListReport } from './reporting'
import { PDFIndividualReport } from './task-pdf-individual-report'
import useAuthContext from '../../api/authentication/useAuthContext'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

type QueryParamsProps = { locationId: number; taskListId: number; startDate: Date; endDate: Date }

const validateQueryParams = (queryParams: URLSearchParams): QueryParamsProps | null => {
  const locationId = parseInt(queryParams.get('locationId') ?? '')
  const taskListId = parseInt(queryParams.get('taskListId') ?? '')
  const startDate = moment(queryParams.get('startDate'))
  const endDate = moment(queryParams.get('endDate'))

  if (locationId > 0 && taskListId > 0 && startDate.isValid() && endDate.isValid()) {
    return {
      locationId,
      taskListId,
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
    }
  }

  return null
}

export const TaskListReport: FC = () => {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)

  const reportingProps = validateQueryParams(queryParams)

  if (reportingProps) {
    return <Report queryParams={reportingProps} />
  }

  return <ErrorView />
}

const Report: FC<{ queryParams: QueryParamsProps }> = (props) => {
  const { authState } = useAuthContext()
  const tempUnit = authState.temperatureInC ? 'C' : 'F'
  const { isLoading, response, submit, error } = useReportJob<IndividualTaskListReport>({
    parameters: {
      // CLEANUP: Change this after testing the new way of calculating the report metrics.
      reportType: ReportJobReportType.TASK_RESPONSES_OLD,
      fileType: ReportJobFileType.JSON,
      startDate: props.queryParams.startDate,
      endDate: props.queryParams.startDate,
      locationIds: [props.queryParams.locationId],
      taskListIds: [props.queryParams.taskListId],
      tempUnit: tempUnit,
    },
    onDownloadDone: () => {
      //
    },
  })

  useEffect(() => {
    submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to submit the request once
  }, [])

  if (isLoading || response == null) {
    return <StyledSpinner message="Generating report..." />
  }

  if (error) {
    return <ErrorView />
  }

  return (
    <ScopedCssBaseline
      sx={{
        backgroundColor: '#ebedef',
      }}
    >
      <ThemeProvider theme={theme}>
        <Dialog fullScreen open sx={{ '& .MuiDialog-paper': { backgroundColor: '#ebedef' } }}>
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <Button
                autoFocus
                color="inherit"
                onClick={() => {
                  window.print()
                }}
              >
                Print
              </Button>
            </Toolbar>
          </AppBar>
          <PDFIndividualReport
            report={response}
            tempUnit={tempUnit}
            dates={[props.queryParams.startDate, props.queryParams.endDate]}
            onReady={() => window.print()}
          />
        </Dialog>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

const ErrorView: FC = () => {
  return <>No Report Available</>
}

export default TaskListReport

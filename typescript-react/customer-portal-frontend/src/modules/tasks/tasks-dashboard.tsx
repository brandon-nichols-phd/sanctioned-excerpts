import React, { FC, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment'
import { Formik, useFormikContext } from 'formik'
import { match, P } from 'ts-pattern'

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'
import { ReportJobFileType, ReportJobReportType, useReportJob, UseReportJobReturn } from '../utils/reports/use-report-job'
import { PDFReport } from './task-pdf-report'
import { PDFIndividualReport } from './task-pdf-individual-report'
import { DailyTasklistReport,  Interval, IndividualTaskListReport } from './reporting'
import { useTaskReportingDropdowns, Return as TaskReportingOptionsReturn } from './use-task-reporting-dropdowns'
import { TemperatureUnit } from './data/task'
import useAuthContext from '../../api/authentication/useAuthContext'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

type ReportDataType = DailyTasklistReport | IndividualTaskListReport

type FormValues = {
  reportType: ReportJobReportType
  fileType: ReportJobFileType
  locationIds: number[]
  customerId: number | null
  taskListIds: number[]
  tempUnit: TemperatureUnit
  dateRange: [Date | null, Date | null]
  dateInterval: Interval
}

export const TaskDashboardModal: FC<{ open: boolean; onClose: () => void }> = (props) => {
  const { authState } = useAuthContext()
  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        <Dialog open={props.open} onClose={props.onClose}>
          <DialogContent>
            <Box
              sx={{
                backgroundColor: '#ebede',
                '& .MuiFormControl-root': { my: 1 },
                '& .MuiCardHeader-root': { backgroundcolor: 'lightgrey' },
                '& .MuiCard-root': { mb: 2 },
                '& > .MuiCard-root:last-child': { mb: 8 },
                '& .MuiTableContainer-root': { mb: 8 },
                '& .table-card': { backgroundColor: theme.palette.primary.main, color: 'white', textDecoration: 'underline' },
                '& .MuiTableHead-root': { backgroundColor: 'white' },
                '& .MuiTableBody-root': { backgroundColor: 'white' },
                '& .MuiTableCell-head': { fontWeight: 'bold', fontStyle: 'italic' },
                '& .MuiTableCell-root': { color: theme.palette.primary.main, textAlign: 'center' },
                '& .MuiTableCell-root:first-child': { textAlign: 'left' },
                '& .active-date::after': {
                  display: 'block',
                  content: '" "',
                  border: '1px solid black',
                  borderRadius: 100,
                  width: '1px',
                  textAlign: 'center',
                  margin: '0 auto',
                  height: '1px',
                  position: 'relative',
                  top: -3,
                },
              }}
            >
              <Formik<FormValues>
                validateOnChange={false}
                initialValues={{
                  reportType: ReportJobReportType.TASK_COMPLETION_PERCENTAGE,
                  fileType: ReportJobFileType.JSON,
                  locationIds: [],
                  customerId: null,
                  taskListIds: [],
                  tempUnit: authState.temperatureInC ? 'C' : 'F',
                  dateRange: [null, null],
                  dateInterval: 'Daily',
                }}
                onSubmit={() => {
                  //
                }}
              >
                {() => <ReportGenerationRequester onClose={props.onClose} />}
              </Formik>
            </Box>
          </DialogContent>
        </Dialog>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

type ReportGenerationStep = 'SELECTING' | 'WAITING' | 'DONE' | 'ERROR'

const ReportGenerationRequester: FC<{ onClose: () => void }> = (props) => {
  const formik = useFormikContext<FormValues>()
  const [reportGenerationStep, setReportGenerationStep] = useState<ReportGenerationStep>('SELECTING')

  const { customers, locations, taskLists, activeDates } = useTaskReportingDropdowns({
    locationIds: formik.values.locationIds,
    customerId: formik.values.customerId,
    taskListIds: formik.values.taskListIds,
  })

  const { isLoading, response, submit, error, abort } = useReportJob<ReportDataType>({
    parameters: {
      reportType: formik.values.reportType,
      fileType: formik.values.fileType,
      startDate: formik.values.dateRange[0],
      endDate: formik.values.dateRange[1],
      customerId: formik.values.customerId,
      locationIds: formik.values.locationIds,
      taskListIds: formik.values.taskListIds.includes(-1) ? [] : formik.values.taskListIds,
      tempUnit: formik.values.tempUnit,
    },
    onDownloadDone: () => {
      if (formik.values.fileType !== ReportJobFileType.JSON) {
        setReportGenerationStep('DONE')
      }
    },
  })

  return match([reportGenerationStep, isLoading, error])
    .with(['SELECTING', P.any, P.nullish], () => (
      <TaskReportSelection
        customers={customers}
        locations={locations}
        taskLists={taskLists}
        activeDates={activeDates}
        onSubmit={() => {
          submit()
          if (formik.values.fileType !== ReportJobFileType.JSON) {
            setReportGenerationStep('WAITING')
          }
        }}
        onAbort={abort}
        requestResponse={response}
        requestError={error}
      />
    ))
    .with(['WAITING', true, P.nullish], () => (
      <ReportGenerationStatus
        message="Generating your report—this may take up to 10 minutes. The download will start automatically when finished. Feel free to use other tabs, but keep this tab open."
        onAction={() => {
          abort()
          setReportGenerationStep('SELECTING')
        }}
        actionLabel="Cancel"
      >
        <Box sx={{ marginY: '1rem', display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={100} />
        </Box>
      </ReportGenerationStatus>
    ))
    .with(['DONE', P.any, P.nullish], () => (
      <ReportGenerationStatus
        message="Your report is ready! Please check your download folder."
        onAction={() => {
          props.onClose()
        }}
        actionLabel="Close"
      />
    ))
    .otherwise(() => (
      <ReportGenerationStatus
        message="There was an error generating your report. Please try again later."
        onAction={() => {
          abort()
          setReportGenerationStep('SELECTING')
        }}
        actionLabel="Back"
      />
    ))
}

type TaskReportSelectionExtraProps = {
  customers: TaskReportingOptionsReturn['customers']
  locations: TaskReportingOptionsReturn['locations']
  taskLists: TaskReportingOptionsReturn['taskLists']
  activeDates: TaskReportingOptionsReturn['activeDates']
  onSubmit: () => void
  onAbort: () => void
  requestResponse: UseReportJobReturn<ReportDataType>['response']
  requestError: UseReportJobReturn<ReportDataType>['error']
}
const TaskReportSelection: FC<TaskReportSelectionExtraProps> = (props) => {
  const formik = useFormikContext<FormValues>()
  const [pdfOpen, setPdfOpen] = useState<boolean>(false)

  const isFormIncomplete =
    formik.values.customerId === null ||
    formik.values.locationIds.length === 0 ||
    formik.values.taskListIds.length === 0 ||
    formik.values.dateRange[0] === null ||
    formik.values.dateRange[1] === null

  const excludeDateIntervals: { start: Date; end: Date }[] = []
  const MAX_DATES_ALLOWED = 30
  if (formik.values.dateRange[1]) {
    excludeDateIntervals.push({
      start: new Date(0), // The Unix epoch (a date before any valid date)
      end: moment(formik.values.dateRange[1]).subtract(MAX_DATES_ALLOWED, 'days').toDate(),
    })
  }
  if (formik.values.dateRange[0]) {
    excludeDateIntervals.push({
      start: moment(formik.values.dateRange[0]).add(MAX_DATES_ALLOWED, 'days').toDate(),
      end: new Date(8640000000000000), // A date far in the future
    })
  }

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="reportTypeLabel">Select Report</InputLabel>
            <Select
              labelId="reportTypeLabel"
              id="reportType"
              label="Select Report"
              value={`${formik.values.reportType}|${formik.values.fileType}`}
              onChange={(event) => {
                const selectedReport = event.target.value as string
                const [reportType, fileType] = selectedReport.split('|')
                formik.setFieldValue('reportType', reportType)
                formik.setFieldValue('fileType', fileType)
              }}
            >
              <MenuItem value={`${ReportJobReportType.TASK_COMPLETION_PERCENTAGE}|${ReportJobFileType.JSON}`}>
                PDF: Task List % Completion
              </MenuItem>
              {/* CLEANUP: Remove this after testing the new way of calculating the report metrics. */}
              <MenuItem value={`${ReportJobReportType.TASK_RESPONSES_OLD}|${ReportJobFileType.JSON}`}>PDF: Task Responses</MenuItem>
              <MenuItem value={`${ReportJobReportType.TASK_COMPLETION_MATRIX}|${ReportJobFileType.EXCEL}`}>
                Excel: Task List % Completion Matrix
              </MenuItem>
              <MenuItem value={`${ReportJobReportType.TASK_RESPONSES}|${ReportJobFileType.EXCEL}`}>Excel: Task Responses</MenuItem>
              <MenuItem value={`${ReportJobReportType.TASK_COMPLETION_PERCENTAGE}|${ReportJobFileType.EXCEL}`}>
                Excel: Task List % Completion
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="customerLabel">Select Customer</InputLabel>
            <Select
              labelId="customerLabel"
              id="customer"
              label="Select Customer"
              value={formik.values.customerId ?? ''}
              onChange={(event) => {
                formik.setFieldValue('customerId', event.target.value as number)
                formik.setFieldValue('locationIds', [])
                formik.setFieldValue('taskListIds', [])
              }}
            >
              {props.customers.map((customer, index) => {
                return (
                  <MenuItem key={index} value={customer.customerId}>
                    {customer.customerName}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="locationLabel">Assigned To</InputLabel>
            <Select
              labelId="locationLabel"
              id="location"
              label="Assigned To"
              multiple
              value={formik.values.locationIds}
              onChange={(event) => {
                const selectedLocations = event.target.value as number[]
                formik.setFieldValue('locationIds', selectedLocations)
                formik.setFieldValue(
                  'taskListIds',
                  formik.values.taskListIds.filter(
                    (taskListId) =>
                      (taskListId === -1 && selectedLocations.length > 0) ||
                      props.taskLists.findIndex((taskList) =>
                        selectedLocations.some((locationId) => taskList.locationIds.includes(locationId))
                      ) >= 0
                  )
                )
              }}
            >
              {props.locations.map((location, index) => {
                return (
                  <MenuItem key={index} value={location.locationId}>
                    {location.locationName}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="taskListLabel">Select task List</InputLabel>
            <Select
              labelId="taskListLabel"
              id="taskList"
              label="Select Tasklist"
              multiple
              value={formik.values.taskListIds}
              onChange={(event) => {
                const options = event.target.value as number[]
                const hasAll = options.some((option) => option === -1)
                const addedAll = hasAll && !formik.values.taskListIds.includes(-1)

                if (hasAll && !addedAll) {
                  // We added a new option that wasn't all, but we had all selected previously
                  // Let's remove all
                  formik.setFieldValue(
                    'taskListIds',
                    options.filter((option) => option !== -1)
                  )
                  return
                }

                if (addedAll && options.length) {
                  // We selected All but user had some other options
                  // Remove other options
                  formik.setFieldValue('taskListIds', [-1])
                  return
                }

                formik.setFieldValue('taskListIds', event.target.value as number[])
              }}
            >
              {props.taskLists.length > 0 && <MenuItem value={-1}>All Task Lists</MenuItem>}
              {props.taskLists.map((taskList, index) => {
                return (
                  <MenuItem key={index} value={taskList.id}>
                    {taskList.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="tempUnitLabel">Select Temperature Unit</InputLabel>
            <Select
              labelId="tempUnitLabel"
              id="tempUnit"
              label="Temperature Unit"
              value={formik.values.tempUnit}
              onChange={(event) => {
                formik.setFieldValue('tempUnit', event.target.value)
              }}
            >
              <MenuItem value="C">Celsius ({'\u00B0'}C)</MenuItem>
              <MenuItem value="F">Fahrenheit ({'\u00B0'}F)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="dateIntervalLabel">Select Time Period</InputLabel>
            <Select
              labelId="dateIntervalLabel"
              id="dateInterval"
              label="Select DateInterval"
              value={formik.values.dateInterval}
              onChange={(event) => {
                formik.setFieldValue('dateInterval', event.target.value as Interval)
                formik.setFieldValue('dateRange', [null, null])
              }}
            >
              <MenuItem value="Daily">Daily</MenuItem>
              <MenuItem value="Monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {formik.values.dateInterval === 'Daily' && (
          <Grid item xs={6}>
            <FormControl fullWidth>
              <DatePicker
                customInput={<TextField fullWidth label="Select Date Range" />}
                selectsRange={true}
                startDate={formik.values.dateRange[0]}
                endDate={formik.values.dateRange[1]}
                filterDate={(date) => moment(date).isSameOrBefore(Date.now())}
                onChange={(update) => {
                  formik.setFieldValue('dateRange', update)
                }}
                isClearable={true}
                excludeDateIntervals={excludeDateIntervals}
                dayClassName={(date) => (props.activeDates.some((activeDate) => activeDate.isSame(date, 'day')) ? 'active-date' : null)}
              />
            </FormControl>
          </Grid>
        )}
        {formik.values.dateInterval === 'Monthly' && (
          <Grid item xs={3}>
            <FormControl fullWidth>
              <DatePicker
                selected={formik.values.dateRange[0]}
                customInput={<TextField fullWidth label="Month" />}
                dateFormat="MM/yyyy"
                filterDate={(date) => moment(date).isSameOrBefore(Date.now())}
                showMonthYearPicker
                onChange={(date) => {
                  formik.setFieldValue('dateRange', [date, moment(date).endOf('month').toDate()])
                }}
              />
            </FormControl>
          </Grid>
        )}
      </Grid>
      <Button
        onClick={() => {
          props.onSubmit()
          setPdfOpen(true)
        }}
        variant="contained"
        type="button"
        disabled={isFormIncomplete}
      >
        <AssessmentIcon /> Generate Report
      </Button>
      <Dialog
        fullScreen
        open={pdfOpen}
        onClose={() => {
          props.onAbort()
          setPdfOpen(false)
        }}
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#ebedef' } }}
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => {
                props.onAbort()
                setPdfOpen(false)
              }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
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
        {match([formik.values.reportType, formik.values.fileType, props.requestResponse, props.requestError])
          .with([P.any, P.any, null, P.not(P.nullish)], () => (
            <div className="text-center my-5">
              <Alert variant="filled" severity="error" sx={{ width: '50%', fontWeight: 'bold', fontSize: 22, marginX: 'auto' }}>
                An error occured when processing the requested report. Please try again later.
              </Alert>
            </div>
          ))
          .with([P.any, P.any, null, undefined], () => <StyledSpinner message="Generating report..." />)
          .with([ReportJobReportType.TASK_COMPLETION_PERCENTAGE, ReportJobFileType.JSON, P.not(P.nullish), undefined], () => (
            <PDFReport
              title={`PDF Task List Completion Report ${formik.values.dateRange[0]?.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })} - ${formik.values.dateRange[1]?.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`}
              report={props.requestResponse as DailyTasklistReport}
              interval={formik.values.dateInterval}
              dates={formik.values.dateRange}
            />
          ))
          .with(
            [
              P.union(ReportJobReportType.TASK_RESPONSES, ReportJobReportType.TASK_RESPONSES_OLD),
              ReportJobFileType.JSON,
              P.intersection({}, P.select()),
              undefined,
            ],
            (individualResponse) => {
              if (Object.keys(individualResponse).length === 0 || formik.values.dateRange.some((date) => date === null)) {
                return (
                  <div className="text-center my-5">
                    <Alert variant="filled" severity="error" sx={{ width: '50%', fontWeight: 'bold', fontSize: 22, marginX: 'auto' }}>
                      No Data Found - Adjust dates to download data
                    </Alert>
                  </div>
                )
              }
              return (
                <PDFIndividualReport
                  report={individualResponse}
                  tempUnit={formik.values.tempUnit}
                  dates={formik.values.dateRange as [Date, Date]}
                  onReady={() => window.print()}
                />
              )
            }
          )
          .otherwise(() => null)}
      </Dialog>
    </>
  )
}

type ReportGenerationStatusExtraProps = {
  message: string
  actionLabel: string
  onAction: () => void
}
const ReportGenerationStatus: FC<ReportGenerationStatusExtraProps> = (props) => {
  return (
    <>
      {props.children}
      <Typography sx={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem' }}>{props.message}</Typography>
      <Button
        onClick={() => {
          props.onAction()
        }}
        variant="contained"
        type="button"
      >
        {props.actionLabel}
      </Button>
    </>
  )
}

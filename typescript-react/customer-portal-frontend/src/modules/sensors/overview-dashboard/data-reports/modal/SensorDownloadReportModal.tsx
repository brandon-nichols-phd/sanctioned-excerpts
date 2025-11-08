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
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { pathspotPrimary } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'
import { TemperatureUnit } from '../../../../tasks/data/task'
import { useSensorsReportingDropdowns, UseSensorsReportingDropdownsProps } from '../../../use-sensors-reporting-dropdowns'
import useAuthContext from '../../../../../api/authentication/useAuthContext'
import { ReportJobFileType, ReportJobReportType, useReportJob } from '../../../../utils/reports/use-report-job'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

type FormValues = {
  customerId: number | null
  reportId: number | null
  reportType: ReportJobReportType | null
  fileType: ReportJobFileType | null
  locationId: number | null
  departmentIds: number[]
  tempUnit: TemperatureUnit
  startDate: Date | null
  endDate: Date | null
}

type SensorDownloadReportModalExtraProps = {
  open: boolean
  locationOptions: UseSensorsReportingDropdownsProps['locationOptions']
  reportOptions: UseSensorsReportingDropdownsProps['reportOptions']
  onClose: () => void
}
export const SensorDownloadReportModal: FC<SensorDownloadReportModalExtraProps> = (props) => {
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
                  customerId: null,
                  reportId: null,
                  reportType: null,
                  fileType: null,
                  locationId: null,
                  departmentIds: [],
                  tempUnit: authState.temperatureInC ? 'C' : 'F',
                  startDate: null,
                  endDate: null,
                }}
                onSubmit={() => {
                  //
                }}
              >
                {() => (
                  <ReportGenerationRequester
                    locationOptions={props.locationOptions}
                    reportOptions={props.reportOptions}
                    onClose={props.onClose}
                  />
                )}
              </Formik>
            </Box>
          </DialogContent>
        </Dialog>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

type ReportGenerationStep = 'SELECTING' | 'WAITING' | 'DONE' | 'ERROR'

type ReportGenerationRequesterExtraProps = {
  locationOptions: UseSensorsReportingDropdownsProps['locationOptions']
  reportOptions: UseSensorsReportingDropdownsProps['reportOptions']
  onClose: () => void
}
const ReportGenerationRequester: FC<ReportGenerationRequesterExtraProps> = (props) => {
  const formik = useFormikContext<FormValues>()
  const [reportGenerationStep, setReportGenerationStep] = useState<ReportGenerationStep>('SELECTING')

  const { customers, reports, locations, departments } = useSensorsReportingDropdowns({
    customerId: formik.values.customerId,
    reportType: formik.values.reportType,
    locationId: formik.values.locationId,
    locationOptions: props.locationOptions,
    reportOptions: props.reportOptions,
  })

  const { isLoading, submit, error, abort } = useReportJob({
    parameters: {
      reportType: formik.values.reportType,
      fileType: formik.values.fileType,
      startDate: formik.values.startDate,
      endDate: formik.values.endDate,
      customerId: formik.values.customerId,
      reportId: formik.values.reportId,
      locationId: formik.values.locationId,
      departmentIds: formik.values.departmentIds.includes(-1) ? [] : formik.values.departmentIds,
      tempUnit: formik.values.tempUnit,
    },
    onDownloadDone: () => {
      setReportGenerationStep('DONE')
    },
  })

  return match([reportGenerationStep, isLoading, error])
    .with(['SELECTING', P.any, P.nullish], () => (
      <SensorReportSelection
        customers={customers}
        reports={reports}
        locations={locations}
        departments={departments}
        onSubmit={() => {
          submit()
          setReportGenerationStep('WAITING')
        }}
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

type ProcessedOption = { id: number; name: string }
type SensorReportSelectionExtraProps = {
  customers: ProcessedOption[]
  reports: ProcessedOption[]
  locations: ProcessedOption[]
  departments: ProcessedOption[]
  onSubmit: () => void
}
const SensorReportSelection: FC<SensorReportSelectionExtraProps> = (props) => {
  const formik = useFormikContext<FormValues>()

  const isFormIncomplete =
    formik.values.customerId === null ||
    formik.values.reportId === null ||
    formik.values.locationId === null ||
    formik.values.startDate === null

  const excludeDateIntervals: { start: Date; end: Date }[] = []
  if (formik.values.startDate) {
    excludeDateIntervals.push({
      start: new Date(),
      end: new Date(8640000000000000), // A date far in the future
    })
  }

  return (
    <>
      <Grid container spacing={1}>
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
                formik.setFieldValue('reportId', null)
                formik.setFieldValue('locationId', null)
                formik.setFieldValue('departmentIds', [])
              }}
            >
              {props.customers.map((customer, index) => {
                return (
                  <MenuItem key={index} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="reportTypeLabel">Select Report</InputLabel>
            <Select
              labelId="reportTypeLabel"
              id="reportType"
              label="Select Report"
              value={formik.values.reportId ?? ''}
              onChange={(event) => {
                const reportId = event.target.value as number
                const reportName = props.reports.find((option) => option.id === reportId)?.name ?? ''
                const extractType = /^Report A(\d+)\D+$/.exec(reportName)
                formik.setFieldValue('reportId', reportId)

                let reportType = ReportJobReportType.HACCP_A3
                let fileType = ReportJobFileType.PDF
                if (extractType !== null) {
                  if (extractType[1] === '1') {
                    reportType = ReportJobReportType.HACCP_A1
                    fileType = ReportJobFileType.EXCEL
                  } else if (extractType[1] === '2') {
                    reportType = ReportJobReportType.HACCP_A2
                    fileType = ReportJobFileType.EXCEL
                  }
                }
                formik.setFieldValue('reportType', reportType)
                formik.setFieldValue('fileType', fileType)
              }}
            >
              {props.reports.map((report, index) => {
                return (
                  <MenuItem key={index} value={report.id}>
                    {report.name}
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
              value={formik.values.locationId ?? ''}
              onChange={(event) => {
                const selectedLocation = event.target.value as number
                formik.setFieldValue('locationId', selectedLocation)
                formik.setFieldValue(
                  'departmentIds',
                  formik.values.departmentIds.filter((departmentId) => departmentId === -1)
                )
              }}
            >
              {props.locations.map((location, index) => {
                return (
                  <MenuItem key={index} value={location.id}>
                    {location.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="departmentsLabel">Select Departments</InputLabel>
            <Select
              labelId="departmentsLabel"
              id="departments"
              label="Select Departments"
              multiple
              value={formik.values.departmentIds}
              onChange={(event) => {
                const options = event.target.value as number[]
                const hasAll = options.some((option) => option === -1)
                const addedAll = hasAll && !formik.values.departmentIds.includes(-1)

                if (hasAll && !addedAll) {
                  // We added a new option that wasn't all, but we had all selected previously
                  // Let's remove all
                  formik.setFieldValue(
                    'departmentIds',
                    options.filter((option) => option !== -1)
                  )
                  return
                }

                if (addedAll && options.length) {
                  // We selected All but user had some other options
                  // Remove other options
                  formik.setFieldValue('departmentIds', [-1])
                  return
                }

                formik.setFieldValue('departmentIds', options)
              }}
            >
              {props.departments.length > 0 && <MenuItem value={-1}>All Departments</MenuItem>}
              {props.departments.map((department, index) => {
                return (
                  <MenuItem key={index} value={department.id}>
                    {department.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="tempUnitLabel">Select Temperature Unit</InputLabel>
            <Select labelId="tempUnitLabel" id="tempUnit" label="Temperature Unit" {...formik.getFieldProps('tempUnit')}>
              <MenuItem value="C">Celsius ({'\u00B0'}C)</MenuItem>
              <MenuItem value="F">Fahrenheit ({'\u00B0'}F)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <DatePicker
              selected={formik.values.startDate}
              customInput={<TextField fullWidth label="Month" />}
              dateFormat="MM/yyyy"
              filterDate={(date) => moment(date).isSameOrBefore(Date.now())}
              showMonthYearPicker
              onChange={(date) => {
                formik.setFieldValue('startDate', date)
                formik.setFieldValue('endDate', date ? moment(date).endOf('month').toDate() : null)
              }}
            />
          </FormControl>
        </Grid>
      </Grid>
      <Button
        onClick={() => {
          props.onSubmit()
        }}
        variant="contained"
        type="button"
        disabled={isFormIncomplete}
      >
        <AssessmentIcon /> Generate Report
      </Button>
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

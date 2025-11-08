import React, { useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  FormHelperText,
  Box,
  Tooltip,
} from '@mui/material'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Formik, Form } from 'formik'
import * as yup from 'yup'
import dayjs, { Dayjs } from 'dayjs'
import { useSensorsReportingDropdowns } from '../../../use-sensors-reporting-dropdowns'
import { REF_DATES, SENSOR_DATA_REPORTING_PATHNAME } from '../../../../../api/constants'
import { getReportQueryString } from '../api/sensor-data-reports.requests'
import { api } from '../../../../../api/api'
import history from '../../../../../api/history'
import { useAppTheme } from '../../../../../theme/ThemeContext'
import { SelectableItem } from '../../../../../webapp-lib/pathspot-react'
import { LocationOption, ReportModalOption } from '../sensor-data-reports.types'
import { ReportJobReportType } from '../../../../utils/reports/use-report-job'
type SensorInitializeReportModalProps = {
  locationOptions: Array<SelectableItem<LocationOption>>
  reportOptions: Array<SelectableItem<ReportModalOption>>
  closeModal: () => void
}

type FormValues = {
  selectedCustomer: number | null
  selectedLocation: number | null
  selectedDepartment: number | null
  selectedReport: number | null
  selectedDate: Dayjs | null
}

const validationSchema = yup.object({
  selectedCustomer: yup.number().nullable().required('Customer is required'),
  selectedLocation: yup.string().nullable().required('Location is required'),
  selectedDepartment: yup.string().nullable(),
  selectedReport: yup.string().nullable().required('Report is required'),
  selectedDate: yup
    .mixed<Dayjs>()
    .nullable()
    .required('Please select a valid date.')
    .test('is-valid-range', 'Date must be in the past.', (value) => value === null || value.isBefore(dayjs().endOf('day'))),
})

const SensorInitializeReportModal: React.FC<SensorInitializeReportModalProps> = ({ locationOptions, reportOptions, closeModal }) => {
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const { theme } = useAppTheme()
  const { customers, locations, reports, departments } = useSensorsReportingDropdowns({
    customerId,
    reportType: ReportJobReportType.HACCP_A3,
    locationId,
    locationOptions,
    reportOptions,
  })
  return (
    <Dialog open onClose={closeModal} fullWidth maxWidth="sm">
      <DialogContent>
        <Formik<FormValues>
          initialValues={{
            selectedCustomer: null,
            selectedLocation: null,
            selectedDepartment: null,
            selectedReport: null,
            selectedDate: dayjs(),
          }}
          validationSchema={validationSchema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={(values) => {
            try {
              const userSelections = {
                selectedLocation: { value: values.selectedLocation },
                selectedDepartment: { value: values.selectedDepartment },
                selectedReport: { value: values.selectedReport },
                selectedDate: values.selectedDate?.format('YYYY-MM-DD') ?? '',
              }

              const queryString = getReportQueryString(userSelections as unknown as Parameters<typeof getReportQueryString>[0]);
              const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${queryString}`

              api.abortAllRequests()
              history.push(redirectPath)
            } catch (error) {
              if (process.env.NODE_ENV === 'development') console.error('Error generating redirect URL:', error)
            }
          }}
        >
          {({ values, errors, setFieldValue, isSubmitting }) => {
            const setReportOption = () => {
              const newReportOptions = reports
              if (newReportOptions.length === 1) {
                setFieldValue('selectedReport', newReportOptions[0]?.id)
              }
            }

            const setLocationOption = () => {
              if (locations.length === 1) {
                const locationSingleton = locations[0]?.id
                if (locationSingleton) {
                  setLocationId(locationSingleton)
                  setFieldValue('selectedLocation', locationSingleton)
                }
              }
            }

            // Find the selected customer
            const updateOptions = (
              modifiedField: 'selectedCustomer' | 'selectedReport' | 'selectedLocation' | 'selectedDepartment',
              newValue: number | null
            ) => {
              if (modifiedField === 'selectedCustomer') {
                setFieldValue('selectedLocation', null)
                setFieldValue('selectedDepartment', null)
                setFieldValue('selectedReport', null)
                setFieldValue('selectedCustomer', newValue)
                setCustomerId(newValue)

                setLocationOption()
                setReportOption()
                //Always set departments to null because it is optional
              } else if (modifiedField === 'selectedLocation') {
                setLocationId(newValue)
                setFieldValue('selectedDepartment', null)
                setFieldValue('selectedReport', null)
                setFieldValue('selectedLocation', newValue)
                setReportOption()
              } else if (modifiedField === 'selectedDepartment') {
                setFieldValue('selectedDepartment', null)
                setFieldValue('selectedDepartment', newValue)
                setReportOption()
              } else {
                setFieldValue('selectedReport', newValue)
              }
            }
            return (
              <Form>
                <Box sx={{ paddingY: theme.spacing(1) }}>
                  <Dropdown
                    label="Select Customer"
                    name="selectedCustomer"
                    value={values.selectedCustomer}
                    options={customers}
                    error={errors.selectedCustomer}
                    disabled={false}
                    onChange={(value) => {
                      updateOptions('selectedCustomer', value)
                    }}
                  />

                  <Dropdown
                    label="Select Location"
                    name="selectedLocation"
                    value={values.selectedLocation}
                    options={locations}
                    error={errors.selectedLocation}
                    disabled={!values.selectedCustomer}
                    onChange={(value) => {
                      updateOptions('selectedLocation', value)
                    }}
                    tooltipTitle={!values.selectedCustomer ? 'Select a Customer first' : ''}
                  />

                  {departments.length > 0 && !!values.selectedLocation && (
                    <Dropdown
                      label="Select Department"
                      name="selectedDepartment"
                      value={values.selectedDepartment}
                      options={departments}
                      error={errors.selectedDepartment}
                      disabled={!values.selectedLocation}
                      onChange={(value) => updateOptions('selectedDepartment', value)}
                    />
                  )}

                  <Dropdown
                    label="Select Report"
                    name="selectedReport"
                    value={values.selectedReport}
                    options={reports}
                    error={errors.selectedReport}
                    disabled={!values.selectedLocation}
                    onChange={(value) => {
                      updateOptions('selectedReport', value)
                    }}
                    tooltipTitle={!values.selectedLocation ? 'Select a Location first' : ''}
                  />

                  <Tooltip title={!values.selectedLocation ? 'Select a Location first' : ''} arrow>
                    <Box>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DesktopDatePicker
                          label="Date"
                          defaultValue={dayjs()}
                          value={values.selectedDate}
                          disabled={!values.selectedLocation || !values.selectedReport}
                          onChange={(date) => setFieldValue('selectedDate', date)}
                          minDate={dayjs(REF_DATES.PS_INC_DATE)}
                          maxDate={dayjs()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: Boolean(errors.selectedDate),
                              helperText: errors.selectedDate,
                              sx: {
                                '& .MuiInputLabel-root': {
                                  '&.Mui-focused': {
                                    color: theme.palette.primary.main,
                                  },
                                },
                                '& .MuiOutlinedInput-root': {
                                  '&.Mui-focused': {
                                    color: theme.palette.primary.main,
                                    '& fieldset': {
                                      borderColor: theme.palette.primary.main,
                                    },
                                  },
                                },
                              },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Box>
                  </Tooltip>
                </Box>
                <DialogActions sx={{ justifyContent: 'flex-start', padding: 0, paddingTop: theme.spacing(1) }}>
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ backgroundColor: theme.palette.primary.main }}
                    disabled={
                      isSubmitting || !values.selectedCustomer || !values.selectedLocation || !values.selectedReport || !values.selectedDate
                    }
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : <AssessmentIcon />} Generate Report
                  </Button>
                </DialogActions>
              </Form>
            )
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  )
}

type DropdownProps = {
  label: string
  name: string
  value: number | null
  options: Array<{ id: number; name: string }>
  error?: string
  disabled: boolean
  onChange: (value: number | null) => void
  tooltipTitle?: string
}

const Dropdown: React.FC<DropdownProps> = ({ label, name, value, options, error, disabled, onChange, tooltipTitle }) => {
  const { theme } = useAppTheme()
  const component = (
    <FormControl fullWidth sx={{ marginBottom: theme.spacing(2) }} error={!!error} disabled={disabled}>
      <InputLabel
        id={`${name}-label`}
        shrink={value !== null}
        sx={{
          backgroundColor: theme.palette.background.paper,
          px: value ? theme.spacing(1) : 0,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
          },
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
        }}
      >
        {label}
      </InputLabel>
      <Select
        labelId={`${name}-label`}
        id={`${name}-select`}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value) || null)}
        sx={{
          backgroundColor: theme.palette.background.paper,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
          },
        }}
      >
        {options.length > 0 ? (
          options.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No Options Available</MenuItem>
        )}
      </Select>
      <FormHelperText>{error}</FormHelperText>
    </FormControl>
  )

  return tooltipTitle ? (
    <Tooltip title={tooltipTitle} arrow>
      {component}
    </Tooltip>
  ) : (
    component
  )
}

export default SensorInitializeReportModal

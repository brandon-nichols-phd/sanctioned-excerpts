import React, { FC, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Formik } from 'formik'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'

import { CategoryValidationSchema, type CategoryFormValues, NumericString, AllOptions } from './category'
import { useCategory } from './use-category'
import { DebounceColorPicker } from '../labeling/debounced-color-picker'

type CategoryDetailsProps = {
  categoryId?: number
  customerId?: NumericString | ''
  options: AllOptions
  disabled: boolean
}

type AlertType = 'NONE' | 'SUCCESS' | 'ERROR'

const CategoryDetails: FC<CategoryDetailsProps> = (props) => {
  const history = useHistory()
  const [activeAlert, setActiveAlert] = useState<AlertType>('NONE')
  const { initialValues, save, isLoading } = useCategory({
    categoryId: props.categoryId,
    customerId: props.customerId,
    options: props.options,
  })

  if (isLoading) {
    return <StyledSpinner message="Retrieving category details..." />
  }

  return (
    <>
      <Formik<CategoryFormValues>
        enableReinitialize={true}
        validateOnChange={true}
        initialValues={initialValues}
        validationSchema={CategoryValidationSchema}
        onSubmit={async (formValues) => {
          try {
            const response = await save(formValues, {
              ...(props.categoryId && { categoryId: props.categoryId }),
            })
            setActiveAlert('SUCCESS')

            if (!props.categoryId) {
              history.replace(`/digital-prep/categories/${response.id}`)
            }
          } catch (e) {
            setActiveAlert('ERROR')
          }
        }}
      >
        {(formik) => {
          const errorToDisplay = Object.values(formik.errors)
          return (
            <Card>
              <CardHeader title="Category Details" />
              <CardContent>
                {errorToDisplay.length > 0 && (
                  <MuiAlert sx={{ mb: 2, textTransform: 'capitalize' }} severity="error">
                    {errorToDisplay.map((error) => (
                      <Typography>{error}</Typography>
                    ))}
                  </MuiAlert>
                )}
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  placeholder="Name"
                  label="Name"
                  error={formik.touched.name && !!formik.errors.name}
                  {...formik.getFieldProps('name')}
                  disabled={props.disabled}
                />

                {/*
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select {...formik.getFieldProps('locationId')} label="Location" disabled={props.disabled}>
                    <MenuItem value="">All Locations</MenuItem>
                    {props.options[formik.values.customerId]?.possibleLocations.map((loc) => (
                      <MenuItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                  */}

                <TextField
                  fullWidth
                  variant="outlined"
                  type="number"
                  placeholder="Order"
                  label="Order"
                  {...formik.getFieldProps('order')}
                  disabled={props.disabled}
                />

                <DebounceColorPicker formik={formik} disabled={props.disabled} field="color" />

                <FormControl>
                  <FormControlLabel
                    control={<Switch {...formik.getFieldProps({ name: 'active', type: 'checkbox' })} />}
                    label="Active"
                    disabled={props.disabled}
                  />
                </FormControl>
              </CardContent>
              <CardActions>
                <Button onClick={formik.submitForm} variant="contained" type="button" disabled={props.disabled}>
                  Save
                </Button>
              </CardActions>
            </Card>
          )
        }}
      </Formik>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={6000}
        open={activeAlert === 'SUCCESS'}
        onClose={() => setActiveAlert('NONE')}
      >
        <MuiAlert elevation={6} variant="filled" severity="success" sx={{ width: '100%' }}>
          Category saved successfully!
        </MuiAlert>
      </Snackbar>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={6000}
        open={activeAlert === 'ERROR'}
        onClose={() => setActiveAlert('NONE')}
      >
        <MuiAlert elevation={6} variant="filled" severity="error" sx={{ width: '100%' }}>
          Error saving category
        </MuiAlert>
      </Snackbar>
    </>
  )
}

export default CategoryDetails

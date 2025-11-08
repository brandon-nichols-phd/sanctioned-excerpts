import React, { FC, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Formik } from 'formik'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Grid from '@mui/material/Grid'
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import CategoryConfiguration from './category-configuration'
import { type NumericString, type AllOptions, CategoryValidationSchema, type CategoryFormValues } from './item'
import { useCategory } from './use-category'
import { DebounceColorPicker } from './debounced-color-picker'

type CategoryDetailsExtraProps = {
  categoryId?: number
  customerId?: NumericString | ''
  options: AllOptions
  disabled: boolean
}

type AlertType = 'NONE' | 'SUCCESS' | 'ERROR'

const CategoryDetails: FC<CategoryDetailsExtraProps> = (props) => {
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

            // If we created a new item then redirect to their details page.
            if (!props.categoryId) {
              history.replace(`/labels/categories/${response.id}`)
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
                <Grid container rowSpacing={1} columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginTop: 1 }}>
                  <Grid item xs={2}>
                    <DebounceColorPicker formik={formik} disabled={props.disabled} field="colorBackground" />
                  </Grid>
                  <Grid item xs={2}></Grid>
                  <Grid item xs={4}>
                    <FormControl>
                      <FormLabel id="text-color-radio-group-label">Text Color</FormLabel>
                      <RadioGroup row aria-labelledby="text-color-radio-group-label" {...formik.getFieldProps('colorText')}>
                        <FormControlLabel value={'#000000'} control={<Radio />} label="Black Text" disabled={props.disabled} />
                        <FormControlLabel value={'#ffffff'} control={<Radio />} label="White Text" disabled={props.disabled} />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      sx={{
                        width: 0.5,
                        height: '5rem',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: formik.values.colorText,
                        backgroundColor: formik.values.colorBackground,
                        '&:hover': { backgroundColor: formik.values.colorBackground },
                      }}
                      disabled={props.disabled}
                    >
                      Sample
                    </Button>
                  </Grid>
                </Grid>
                <FormControl>
                  <FormControlLabel
                    control={<Switch {...formik.getFieldProps({ name: 'active', type: 'checkbox' })} />}
                    label="Active"
                    disabled={props.disabled}
                  />
                </FormControl>
                <CategoryConfiguration options={props.options} disabled={props.disabled} />
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
          Saved configuration!
        </MuiAlert>
      </Snackbar>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={6000}
        open={activeAlert === 'ERROR'}
        onClose={() => setActiveAlert('NONE')}
      >
        <MuiAlert elevation={6} variant="filled" severity="error" sx={{ width: '100%' }}>
          Error saving configuration
        </MuiAlert>
      </Snackbar>
    </>
  )
}

export default CategoryDetails

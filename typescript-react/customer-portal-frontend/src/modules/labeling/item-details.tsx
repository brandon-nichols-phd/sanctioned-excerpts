import React, { FC, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { Formik } from 'formik'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import { type NumericString, type ItemFormValues, type AllOptions, TECH_DEBT, ItemValidationSchema, AllLocationsObject } from './item'
import { useItem } from './use-item'
import ItemConfiguration from './item-configuration'

type ItemDetailsExtraProps = {
  itemId?: number
  customerId?: NumericString | ''
  options: AllOptions
  disabled: boolean
  assignLocationsDisabled: boolean
}

type AlertType = 'NONE' | 'SUCCESS' | 'ERROR'

const ItemDetails: FC<ItemDetailsExtraProps> = (props) => {
  const history = useHistory()
  const [activeAlert, setActiveAlert] = useState<AlertType>('NONE')
  const { initialValues, save, isLoading } = useItem({ itemId: props.itemId, customerId: props.customerId })

  if (isLoading) {
    return <StyledSpinner message="Retrieving ingredient details..." />
  }

  const locationOptions = [AllLocationsObject].concat(
    props.options[initialValues.customerId]!.possibleLocations.map((location) => {
      return { label: location.name ?? '', value: location.id.toString() as NumericString }
    })
  )

  const categoryOptions = props.options[initialValues.customerId]!.possibleCategories
    .map((category) => {
      return { label: category.name ?? '', value: category.id.toString() }
    })
    .sort((lCat, rCat) => {
      return lCat.label < rCat.label ? -1 : lCat.label > rCat.label ? 1 : 0
    })

  return (
    <>
      <Formik<ItemFormValues>
        enableReinitialize={true}
        validateOnChange={true}
        initialValues={initialValues}
        validationSchema={ItemValidationSchema}
        onSubmit={async (formValues) => {
          try {
            const possiblePhases = props.options[formValues.customerId]!.possiblePhases
            const response = await save(formValues, {
              ...(props.itemId && { itemId: props.itemId }),
              // TECH DEBT: Find out the 'Default' phase if possible. We'll use it to potentially create "dummy" configurations
              // for those that have none defined.
              defaultPhase: possiblePhases.find((phase) => phase.name.toLowerCase() === TECH_DEBT.NAME_OF_DEFAULT_PHASE),
            })
            setActiveAlert('SUCCESS')

            // If we created a new item then redirect to their details page.
            if (!props.itemId) {
              history.replace(`/labels/items/${response.item.id}`)
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
              <CardHeader title="Ingredient Details" />
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
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  placeholder="Description"
                  label="Description"
                  error={formik.touched.description && !!formik.errors.description}
                  {...formik.getFieldProps('description')}
                  disabled={props.disabled}
                />
                <TextField
                    fullWidth
                    variant="outlined"
                    type="text"
                    placeholder="Enter only if QR Codes or Barcodes have been enabled on label templates."
                    label="QR Code/Barcode"
                    error={formik.touched.code && !!formik.errors.code}
                    {...formik.getFieldProps('code')}
                    disabled={props.disabled}
                  />
                <FormControl fullWidth>
                  <Autocomplete
                    fullWidth
                    multiple
                    id="categories"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Please select a category."
                        error={formik.touched.categories && !!formik.errors.categories}
                      />
                    )}
                    options={categoryOptions}
                    isOptionEqualToValue={(option, pickedOption) => {
                      return option.value === pickedOption.value
                    }}
                    value={formik.values.categories}
                    onBlur={formik.getFieldProps('categories').onBlur}
                    onChange={(_event, options, reason, details) => {
                      formik.setFieldValue('categories', options)

                      if (details) {
                        // TECH DEBT: Configurations for a category are only defined when the item can expire. The only exception is if
                        // it has the 'Custom' category.
                        const isCustomCategory = details.option.label.toLowerCase() === TECH_DEBT.NAME_OF_CUSTOM_CATEGORY

                        if (formik.values.expiring || isCustomCategory) {
                          if (reason === 'selectOption') {
                            const categoryId = parseInt(details.option.value, 10)
                            const customerCategories = props.options[formik.values.customerId]!.possibleCategories
                            const defaultConfig = customerCategories.find((category) => category.id === categoryId)?.defaultDoc ?? []

                            const defaultConfigClone = defaultConfig.map((phase) => {
                              const phaseClone = { ...phase }

                              // TECH DEBT: The iOS app currently has 'No Expiration' hard-coded and it discards this field. Soon it will
                              // transition to using the stored value instead, so we make sure it's saved correctly.
                              if (
                                isCustomCategory &&
                                phaseClone.phaseName === TECH_DEBT.NAME_OF_DEFAULT_PHASE &&
                                phaseClone.expirationCalculated !== TECH_DEBT.NO_EXPIRATION_STRING_VALUE
                              ) {
                                phaseClone.expirationCalculated = TECH_DEBT.NO_EXPIRATION_STRING_VALUE
                              }

                              return phaseClone
                            })

                            // When a category is added we copy the default phases configured for it.
                            formik.setFieldValue(`configurations.${categoryId}`, defaultConfigClone)
                          } else if (reason === 'removeOption') {
                            const configurations = formik.values.configurations
                            delete configurations[details.option.value as NumericString]

                            // When a category is removed we clear the phases configuration as well.
                            formik.setFieldValue('configurations', configurations)
                          }
                        }
                      }
                    }}
                    disabled={props.disabled}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="expiringLabel">Ingredient Type</InputLabel>
                  <Select
                    id="expiring"
                    labelId="expiringLabel"
                    value={formik.values.expiring.toString()}
                    onChange={(event) => {
                      const expiring = event.target.value === 'true'
                      formik.setFieldValue('expiring', expiring)

                      const customerCategories = props.options[formik.values.customerId]!.possibleCategories

                      // The configuration tied to the 'Custom' category ignores the expiring state set on the item. So we check if it's
                      // present and use the reference to make the proper checks on the code below.
                      const customCategory =
                        customerCategories.find((cusCategory) => cusCategory.name.toLowerCase() === TECH_DEBT.NAME_OF_CUSTOM_CATEGORY)
                          ?.id ?? 0

                      if (expiring) {
                        formik.values.categories.forEach((category) => {
                          const categoryId = parseInt(category.value, 10)
                          if (categoryId === customCategory) {
                            return
                          }

                          const defaultConfig = customerCategories.find((cusCategory) => cusCategory.id === categoryId)?.defaultDoc ?? []

                          formik.setFieldValue(
                            `configurations.${categoryId}`,
                            defaultConfig.map((phase) => ({ ...phase }))
                          )
                        })
                      } else {
                        const customCategoryConfig = formik.values.configurations[customCategory]

                        formik.setFieldValue('configurations', {
                          ...(customCategory && customCategoryConfig && { [customCategory]: customCategoryConfig }),
                        })
                      }
                    }}
                    disabled={props.disabled}
                  >
                    <MenuItem value="true">Expiring</MenuItem>
                    <MenuItem value="false">Not Expiring</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <Autocomplete
                    fullWidth
                    multiple
                    disablePortal
                    id="locations"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Please select a location."
                        error={formik.touched.locations && !!formik.errors.locations}
                      />
                    )}
                    options={locationOptions}
                    isOptionEqualToValue={(option, pickedOption) => {
                      return option.value === pickedOption.value
                    }}
                    value={formik.values.locations}
                    onBlur={formik.getFieldProps('locations').onBlur}
                    onChange={(_event, options, reason, details) => {
                      const hasAll = options.some((option) => option.value === AllLocationsObject.value)
                      const addedAll = reason === 'selectOption' && details?.option.value === AllLocationsObject.value
                      let locations = options

                      // We added a new option while the 'All' options is selected. Therefore, we remove 'All'.
                      if (hasAll && !addedAll) {
                        locations = locations.filter((option) => option.value !== AllLocationsObject.value)
                      }

                      // We added the 'All' option while some other options are selected. Therefore, we only keep 'All'.
                      if (addedAll && options.length > 1) {
                        locations = [details.option]
                      }

                      formik.setFieldValue('locations', locations)
                    }}
                    disabled={props.disabled || props.assignLocationsDisabled}
                  />
                </FormControl>
                <FormControl>
                  <FormControlLabel
                    control={<Switch {...formik.getFieldProps({ name: 'active', type: 'checkbox' })} />}
                    label="Active"
                    disabled={props.disabled}
                  />
                </FormControl>
                <ItemConfiguration options={props.options} disabled={props.disabled} />
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

export default ItemDetails

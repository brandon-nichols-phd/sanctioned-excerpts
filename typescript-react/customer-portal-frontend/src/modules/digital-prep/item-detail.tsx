import React, { FC, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Formik } from 'formik'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import { useItem } from './use-item'
import { ItemFormValues, type AllOptions, ItemValidationSchema } from './item'
import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { ItemExpirationConfig } from './item-expiration-config'

type ItemDetailsProps = {
  itemId?: number
  customerId: string
  options: AllOptions
  disabled: boolean
}

const ItemDetails: FC<ItemDetailsProps> = (props) => {
  const history = useHistory()
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertError, setAlertError] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const { initialValues, save, isLoading } = useItem({ itemId: props.itemId, customerId: props.customerId })

  if (isLoading) {
    return <StyledSpinner message="Loading item details..." />
  }

  const locationOptions =
    props.options[initialValues.customerId]?.possibleLocations.map((loc) => ({
      label: loc.name,
      value: loc.id.toString(),
    })) ?? []

  const categoryOptions =
    props.options[initialValues.customerId]?.possibleCategories.map((cat) => ({
      label: cat.name,
      value: cat.id.toString(),
    })) ?? []

  const itemOptions =
    props.options[initialValues.customerId]?.possibleItems.map((item) => ({
      label: item.name,
      value: item.id.toString(),
    })) ?? []

  const sectionOptions = props.options[initialValues.customerId]?.possibleSections ?? []

  return (
    <>
      <Formik<ItemFormValues>
        enableReinitialize
        initialValues={initialValues}
        validationSchema={ItemValidationSchema}
        onSubmit={async (values) => {
          try {
            const response = await save(values, selectedImage)
            setAlertOpen(true)
            setAlertError(false)
            setSelectedImage(null)

            if (!props.itemId) {
              history.replace(`/digital-prep/items/${response.itemId}`)
            }
          } catch (error) {
            setAlertOpen(true)
            setAlertError(true)
          }
        }}
      >
        {(formik) => (
          <Card>
            <CardHeader title="Item Details" />
            <CardContent>
              {Object.keys(formik.errors).length > 0 && (
                <MuiAlert severity="error" sx={{ mb: 2 }}>
                  {Object.values(formik.errors).map((error, index) => (
                    <Typography key={index}>{error}</Typography>
                  ))}
                </MuiAlert>
              )}

              <FormControl fullWidth margin="normal">
                <Autocomplete
                  options={itemOptions}
                  value={itemOptions.find((option) => option.value === formik.values.itemId.toString()) || null}
                  onChange={(_event, value) => {
                    // When an item is selected, find its details from the options
                    const selectedItem = props.options[initialValues.customerId]?.possibleItems.find(
                      (item) => item.id.toString() === value?.value
                    )
                    if (selectedItem) {
                      formik.setFieldValue('itemId', selectedItem.id)
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Item"
                      error={formik.touched.itemId && !!formik.errors.itemId}
                      helperText="Items will not appear in the list if they have already been configured for DigitalPrep"
                    />
                  )}
                  disabled={props.disabled}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <Autocomplete
                  multiple
                  options={categoryOptions}
                  value={formik.values.categories}
                  onChange={(_event, value) => formik.setFieldValue('categories', value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Categories" error={formik.touched.categories && !!formik.errors.categories} />
                  )}
                  disabled={props.disabled}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <Autocomplete
                  multiple
                  options={locationOptions}
                  value={locationOptions.filter((option) => formik.values.locationIds?.includes(parseInt(option.value, 10)))}
                  onChange={(_event, value) => {
                    const locationIds = value.map((v) => parseInt(v.value, 10))
                    formik.setFieldValue('locationIds', locationIds.length > 0 ? locationIds : null)
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Locations"
                      error={formik.touched.locationIds && !!formik.errors.locationIds}
                      helperText="Leave empty for all locations"
                    />
                  )}
                  disabled={props.disabled}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel id="stacking-type-label">Stacking</InputLabel>
                <Select
                  label="Stacking"
                  labelId="stacking-type-label"
                  value={formik.values.stackingType}
                  onChange={(event) => formik.setFieldValue('stackingType', event.target.value)}
                  disabled={props.disabled}
                >
                  <MenuItem value="by_id">By Item</MenuItem>
                  <MenuItem value="by_id_and_expiration">By Item and Expiration</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.active}
                    onChange={(event) => formik.setFieldValue('active', event.target.checked)}
                    disabled={props.disabled}
                  />
                }
                label="Active"
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedImage(file)
                    }
                  }}
                  disabled={props.disabled}
                />
                <label htmlFor="image-upload">
                  <Button variant="outlined" component="span" fullWidth disabled={props.disabled}>
                    {selectedImage || formik.values.picture ? 'Change Image' : 'Select Image'}
                  </Button>
                </label>
                {(selectedImage || formik.values.picture) && (
                  <Typography variant="caption" sx={{ mt: 1 }}>
                    Selected: {selectedImage?.name ?? formik.values.picture}
                  </Typography>
                )}
              </FormControl>

              <ItemExpirationConfig sections={sectionOptions} disabled={props.disabled} />
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                onClick={() => formik.handleSubmit()}
                disabled={props.disabled || !formik.isValid}
              >
                Save
              </Button>
            </CardActions>
          </Card>
        )}
      </Formik>

      <Snackbar
        open={alertOpen}
        autoHideDuration={6000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert elevation={6} variant="filled" severity={alertError ? 'error' : 'success'} onClose={() => setAlertOpen(false)}>
          {alertError ? 'Error saving item' : 'Item saved successfully'}
        </MuiAlert>
      </Snackbar>
    </>
  )
}

export default ItemDetails

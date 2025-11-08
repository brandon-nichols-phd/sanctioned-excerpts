import React, { FC, FocusEventHandler, useState } from 'react'
import { Formik } from 'formik'
import { match } from 'ts-pattern'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { pathspotPrimary, yellow } from '../../webapp-lib/pathspot-react/styles/ts/colors'
import { useLabelOrderOptions } from './use-label-order-options'
import { LabelMaterial, LabelOrderFormValues, priceToDollars } from './order'
import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { useLabelOrder } from './use-label-order'

type SubmitStep = 'Pending' | 'Confirming' | 'Submitting' | 'Submitted' | 'Error'

const theme = createTheme({
  palette: {
    primary: { main: pathspotPrimary },
  },
})

const alertStyle = {
  fontSize: '2rem',
  '& .MuiAlert-icon': {
    fontSize: '4rem',
  },
}

const LabelOrder: FC = () => {
  const [submitStep, setSubmitStep] = useState<SubmitStep>('Pending')
  const { customers, materials, isLoading } = useLabelOrderOptions()
  const { initialValues, request } = useLabelOrder({ customers })

  if (isLoading) {
    return <StyledSpinner message="Retrieving initial data..." />
  }

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            '& .MuiFormControl-root': { my: 1 },
            '& .MuiCard-root': { mb: 2 },
            '& > .MuiCard-root': { mb: 8 },
            '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
          }}
        >
          <Formik<LabelOrderFormValues>
            enableReinitialize={true}
            initialValues={initialValues}
            onSubmit={async (formValues) => {
              try {
                setSubmitStep('Submitting')
                await request(formValues)
                setSubmitStep('Submitted')
              } catch (e) {
                setSubmitStep('Error')
              }
            }}
          >
            {(formik) => {
              if (submitStep !== 'Pending' && submitStep !== 'Confirming') {
                return (
                  <Card>
                    <CardHeader title="Label Order" />
                    <CardContent>
                      {match(submitStep)
                        .with('Submitting', () => <StyledSpinner message="Submitting your order..." />)
                        .with('Submitted', () => (
                          <Alert severity="info" sx={alertStyle}>
                            Your order has been placed; you will receive an email when this order is shipped. If you need information about
                            the status of your order, or if you wish to make any changes, please contact customer support at{' '}
                            <a href="tel:+17185500040">718-550-0040</a> or <a href="mailto:support@null.com">support@null.com</a> within 24
                            hours of submitting this order.
                          </Alert>
                        ))
                        .otherwise(() => (
                          <Alert severity="error" sx={alertStyle}>
                            There was an error submitting your order. Please try again later or contact customer support at{' '}
                            <a href="tel:+17185500040">718-550-0040</a> or <a href="mailto:support@null.com">support@null.com</a>.
                          </Alert>
                        ))}
                    </CardContent>
                  </Card>
                )
              }

              const allAvailableCustomers = Object.values(customers)

              const customerOptions = allAvailableCustomers.map((customer) => ({
                value: customer.id,
                label: customer.name,
              }))

              const sizeOptions = Array.from(
                materials.reduce((accum, material) => {
                  if (!material.allowedCustomers || material.allowedCustomers.includes(formik.values.customerId)) {
                    accum.add(material.size)
                  }
                  return accum
                }, new Set<string>())
              ).map((size) => {
                return {
                  value: size,
                  label: size,
                }
              })

              const typeOptions = materials
                .reduce((accum, material) => {
                  if (
                    (!material.allowedCustomers || material.allowedCustomers.includes(formik.values.customerId)) &&
                    material.size === formik.values.size
                  ) {
                    accum.push(material)
                  }
                  return accum
                }, [] as LabelMaterial[])
                .map((material) => {
                  return {
                    value: material.id,
                    label: `${material.type}  (${priceToDollars(material.rollPriceAmount)} / roll)`,
                  }
                })

              const locationOptions =
                customers[formik.values.customerId]?.locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                })) ?? []

              const orderLabelMaterial = materials.find((material) => material.id === formik.values.materialId)
              const orderLocation = customers[formik.values.customerId]?.locations.find(
                (location) => location.id === formik.values.locationId
              )
              const quantity = Math.floor(formik.values.quantity)

              const isSingleCustomer = allAvailableCustomers.length === 1
              const disableSubmit =
                !formik.values.customerId ||
                !orderLabelMaterial ||
                !orderLocation ||
                !orderLocation.address ||
                !orderLocation.contactName ||
                formik.isSubmitting ||
                isNaN(quantity) ||
                quantity <= 0

              return (
                <Card>
                  <CardHeader title="Label Order" />
                  <CardContent>
                    <Grid container rowSpacing={1} columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginTop: 1 }}>
                      <Grid item xs={4}>
                        {orderLabelMaterial && (
                          <Box
                            component="img"
                            src={orderLabelMaterial.image}
                            sx={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                          />
                        )}
                      </Grid>
                      <Grid item xs={8}>
                        <Grid
                          container
                          rowSpacing={1}
                          columnSpacing={1}
                          alignItems="center"
                          justifyContent="flex-start"
                          sx={{ marginTop: 1 }}
                        >
                          {!isSingleCustomer && (
                            <Grid item xs={12}>
                              <OrderDropdown
                                idPrefix="customer-select"
                                label="Select Customer"
                                options={customerOptions}
                                {...formik.getFieldProps('customerId')}
                                onChange={(event) => {
                                  formik.setFieldValue('customerId', event.target.value)
                                  formik.setFieldValue('size', '')
                                  formik.setFieldValue('materialId', 0)
                                  formik.setFieldValue('locationId', 0)
                                }}
                              />
                            </Grid>
                          )}
                          <Grid item xs={12}>
                            <OrderDropdown
                              idPrefix="size-select"
                              label="Select Size"
                              disabled={!formik.values.customerId}
                              options={sizeOptions}
                              {...formik.getFieldProps('size')}
                              onChange={(event) => {
                                formik.setFieldValue('size', event.target.value)
                                formik.setFieldValue('materialId', 0)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <OrderDropdown
                              idPrefix="material-select"
                              label="Select Material"
                              disabled={!formik.values.size}
                              options={typeOptions}
                              {...formik.getFieldProps('materialId')}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              variant="outlined"
                              type="number"
                              label="Enter Number of Rolls to Order"
                              placeholder="Enter Number of Rolls to Order"
                              name={formik.getFieldProps('quantity').name}
                              value={formik.getFieldProps('quantity').value}
                              onChange={formik.getFieldProps('quantity').onChange}
                              onBlur={(event) => {
                                formik.getFieldProps('quantity').onBlur(event)
                                const newValue = parseInt(event.currentTarget.value, 10)
                                formik.setFieldValue('quantity', isNaN(newValue) ? 0 : Math.max(0, newValue))
                              }}
                              sx={{ minWidth: '400px' }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Alert severity="info" sx={{ maxWidth: '400px' }}>
                              Selecting a location below will show a preview of the address tied to it. You can head to the Locations page
                              if the address is incorrect or contact Pathspot Support for help.
                            </Alert>
                          </Grid>
                          <Grid item xs={12} container columnSpacing={1} alignItems="center" justifyContent="flex-start">
                            <Grid item xs={'auto'}>
                              <OrderDropdown
                                idPrefix="location-select"
                                label="Select Location"
                                disabled={!formik.values.customerId}
                                options={locationOptions}
                                {...formik.getFieldProps('locationId')}
                              />
                            </Grid>
                            <Grid item xs={true}>
                              {orderLocation && (
                                <Typography
                                  sx={{
                                    marginTop: '0.5rem',
                                    minHeight: '3rem',
                                    bgcolor: yellow,
                                    borderRadius: '5px',
                                    padding: '5px',
                                    maxWidth: '400px',
                                  }}
                                >
                                  {orderLocation.contactName}
                                  <br />
                                  {orderLocation.address}
                                </Typography>
                              )}
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12}>
                        <Card sx={{ marginTop: '1rem', minHeight: '5rem' }}>
                          <CardHeader title="Description" />
                          <CardContent>
                            <Typography>{orderLabelMaterial && orderLabelMaterial.description}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button
                      type="button"
                      color="primary"
                      variant="contained"
                      disabled={disableSubmit}
                      onClick={() => setSubmitStep('Confirming')}
                    >
                      Submit Order
                    </Button>
                    <ConfirmOrderDialog
                      open={submitStep === 'Confirming'}
                      totalPrice={priceToDollars((orderLabelMaterial?.rollPriceAmount ?? 0) * formik.values.quantity)}
                      onCancel={() => setSubmitStep('Pending')}
                      onConfirm={formik.submitForm}
                    />
                  </CardActions>
                </Card>
              )
            }}
          </Formik>
        </Box>
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

type OrderDropdownExtraProps<ValueType extends string | number> = {
  idPrefix: string
  label: string
  name: string
  disabled?: boolean
  value: ValueType
  options: { value: ValueType; label: string }[]
  onBlur?: FocusEventHandler
  onChange?: (event: SelectChangeEvent<ValueType>) => void
}

const OrderDropdown = <ValueType extends string | number>(props: OrderDropdownExtraProps<ValueType>) => {
  return (
    <FormControl>
      <InputLabel id={`${props.idPrefix}-label`}>{props.label}</InputLabel>
      <Select
        labelId={`${props.idPrefix}-label`}
        id={`${props.idPrefix}-options`}
        name={props.name}
        label={props.label}
        disabled={props.disabled}
        value={props.value ? props.value : ''}
        onBlur={(event) => {
          props.onBlur?.(event)
        }}
        onChange={(event) => {
          props.onChange?.(event)
        }}
        sx={{ minWidth: '400px' }}
      >
        {props.options.map((item) => {
          return (
            <MenuItem key={`${props.idPrefix}-option-${item.value}`} value={item.value}>
              {item.label}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}

type ConfirmOrderDialogExtraProps = {
  open: boolean
  totalPrice: string
  onConfirm: () => void
  onCancel: () => void
}

const paragraphStyle = {
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '1rem',
}

const ConfirmOrderDialog: FC<ConfirmOrderDialogExtraProps> = (props) => {
  return (
    <Dialog open={props.open} onClose={props.onCancel}>
      <DialogTitle>Confirm Your Order:</DialogTitle>
      <DialogContent>
        <Typography sx={paragraphStyle}>Your order will be placed to the PathSpot Team.</Typography>
        <Typography sx={paragraphStyle}>
          The total of the order is {props.totalPrice} . This price does not include shipping, you will see this as an added item to your
          PathSpot invoice.
        </Typography>
        <Typography sx={paragraphStyle}>Click "Confirm" below to submit this order.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onConfirm}>Confirm</Button>
        <Button onClick={props.onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

export default LabelOrder

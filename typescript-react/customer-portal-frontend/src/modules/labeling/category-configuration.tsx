import React, { FC, useState } from 'react'
import { match } from 'ts-pattern'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import DeleteIcon from '@mui/icons-material/Delete'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import Checkbox from '@mui/material/Checkbox'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import SelectPhase from './select-phase'

import { useFormikContext } from 'formik'
import { createNewPhaseConfigurationFromOption, type CategoryFormValues, type AllOptions, TECH_DEBT } from './item'

type CategoryConfigurationExtraProps = {
  options: AllOptions
  disabled: boolean
}

const transformExpirationTime = (expiration: string | null) => {
  const transformed: { value: number | string; unit: string } = {
    value: '',
    unit: 'hour',
  }

  if (expiration) {
    const matching = /^(\d+)\s+(\w+?)s?$/i.exec(expiration)

    if (matching && matching[1] && matching[2]) {
      transformed.value = parseInt(matching[1], 10);
      transformed.unit = matching[2].toLowerCase();
    }
  }

  return transformed
}

const CategoryConfiguration: FC<CategoryConfigurationExtraProps> = (props) => {
  const formik = useFormikContext<CategoryFormValues>()
  const [openPhaseDialog, setOpenPhaseDialog] = useState(false)

  const customerOptions = props.options[formik.values.customerId]
  const configuredPhases = new Set(formik.values.configuration.map((phaseConfig) => phaseConfig.phaseId))
  const customerPhaseOptions = customerOptions?.possiblePhases.filter((phase) => !configuredPhases.has(phase.id)) ?? [];


  // TECH DEBT: Find the 'Default' phase since we check for it below in order to perform a special behavior for any category
  // named 'Custom'.
  const defaultPhase = (customerOptions?.possiblePhases ?? []).find((phase) => (phase.name ?? '').toLowerCase() === TECH_DEBT.NAME_OF_DEFAULT_PHASE);
  return (
    <Card>
      <CardHeader title="Configuration" />
      <CardContent>
        {match(formik.values.configuration.length)
          .with(0, () => {
            return <Typography sx={{ fontWeight: 'bold', fontSize: '2rem', textAlign: 'center', m: 3 }}>Add At Least One Stage</Typography>
          })
          .otherwise(() => {
            return (
              <Grid container rowSpacing={1} columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginTop: 1 }}>
                {formik.values.configuration.map((phase, index, allPhases) => {
                  const expirationCalculatedData = transformExpirationTime(phase.expirationCalculated)
                  const expirationAdditionalData = transformExpirationTime(phase.expirationAdditional)

                  return (
                    <React.Fragment key={`Phase-${phase.phaseId}`}>
                      <Grid item xs={1}>
                        <Button
                          type="button"
                          variant="contained"
                          color="error"
                          onClick={() => {
                            allPhases.splice(index, 1)
                            formik.setFieldValue('configuration', allPhases)
                          }}
                          disabled={props.disabled}
                        >
                          <DeleteIcon />
                        </Button>
                      </Grid>

                      <Grid item xs={3}>
                        <TextField
                          variant="outlined"
                          fullWidth
                          type="text"
                          label="Phase Name"
                          placeholder="Phase Name"
                          value={phase.phaseName}
                          disabled={true /* Disabling editing until we fix phase architecture */}
                          // disabled={props.disabled} // placeholder until above is removed
                          onChange={(event) => {
                            formik.setFieldValue(`configuration.${index}.phaseName`, event.target.value)
                          }}
                        />
                      </Grid>

                      <Grid item xs={8}>
                        <Grid container columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginLeft: 2 }}>
                          {
                            // TECH DEBT: Check if the category is named 'Custom' and the iterated phase is the 'Default' one. This has a hardcoded special
                            // behavior on the app that we are duplicating here.
                            match(
                              formik.values.name.toLowerCase() === TECH_DEBT.NAME_OF_CUSTOM_CATEGORY &&
                                defaultPhase &&
                                defaultPhase.id === phase.phaseId
                            )
                              .with(true, () => {
                                // TECH DEBT: The iOS app currently has 'No Expiration' hard-coded and it discards the `expirationCalculated` field.
                                return (
                                  <Grid item xs={12}>
                                    <FormControlLabel label="No Expiration" control={<Checkbox checked={true} />} disabled={true} />
                                  </Grid>
                                )
                              })
                              .otherwise(() => {
                                return (
                                  <>
                                    <Grid item xs={5}>
                                      <FormControlLabel
                                        label="Calculated Expiration"
                                        control={
                                          <Checkbox
                                            checked={phase.expirationCalculated !== null}
                                            onChange={() => {
                                              const updatedValue = phase.expirationCalculated === null ? '0 hour' : null
                                              formik.setFieldValue(`configuration.${index}.expirationCalculated`, updatedValue)
                                            }}
                                          />
                                        }
                                        disabled={props.disabled}
                                      />
                                    </Grid>
                                    <Grid item xs={2}>
                                      <TextField
                                        variant="outlined"
                                        type="number"
                                        label="Amount"
                                        placeholder="Amount"
                                        value={expirationCalculatedData.value}
                                        onChange={(event) => {
                                          const valueAsInt = parseInt(event.target.value, 10)
                                          const updatedValue = !Number.isNaN(valueAsInt)
                                            ? `${event.target.value} ${expirationCalculatedData.unit}`
                                            : null
                                          formik.setFieldValue(`configuration.${index}.expirationCalculated`, updatedValue)
                                        }}
                                        disabled={props.disabled}
                                      />
                                    </Grid>

                                    <Grid item xs={2}>
                                      <FormControl>
                                        <InputLabel id="expirationCalculatedUnit">Unit</InputLabel>
                                        <Select
                                          labelId="expirationCalculatedUnit"
                                          value={expirationCalculatedData.unit}
                                          onChange={(event) => {
                                            const updatedValue = `${
                                              expirationCalculatedData.value === '' ? 0 : expirationCalculatedData.value
                                            } ${event.target.value}`

                                            if (event.target.value === 'hour' && phase.expirationFormat === 'EOD') {
                                              formik.setFieldValue(`configuration.${index}`, {
                                                ...formik.values.configuration[index],
                                                expirationCalculated: updatedValue,
                                                expirationFormat: 'Date and Time',
                                              })
                                            } else {
                                              formik.setFieldValue(`configuration.${index}.expirationCalculated`, updatedValue)
                                            }
                                          }}
                                          disabled={props.disabled}
                                        >
                                          <MenuItem value="hour">Hours</MenuItem>
                                          <MenuItem value="day">Days</MenuItem>
                                          <MenuItem value="week">Weeks</MenuItem>
                                        </Select>
                                      </FormControl>
                                    </Grid>

                                    <Grid item xs={3}>
                                      <FormControl>
                                        <InputLabel id="expirationFormat">Expiration Format</InputLabel>
                                        <Select
                                          labelId="expirationFormat"
                                          value={phase.expirationFormat}
                                          onChange={(event) => {
                                            formik.setFieldValue(`configuration.${index}.expirationFormat`, event.target.value)
                                          }}
                                          disabled={props.disabled}
                                        >
                                          <MenuItem disabled={expirationCalculatedData.unit === 'hour'} value="EOD">
                                            EOD
                                          </MenuItem>
                                          <MenuItem value="Date Only">Date Only</MenuItem>
                                          <MenuItem value="Time Only">Time Only</MenuItem>
                                          <MenuItem value="Date and Time">Date and Time</MenuItem>
                                        </Select>
                                      </FormControl>
                                    </Grid>
                                  </>
                                )
                              })
                          }

                          <Grid item xs={5}>
                            <FormControlLabel
                              label="No Refrigeration Expiration"
                              control={
                                <Checkbox
                                  checked={phase.expirationAdditional !== null}
                                  onChange={() => {
                                    const updatedValue = phase.expirationAdditional === null ? '0 hour' : null
                                    formik.setFieldValue(`configuration.${index}.expirationAdditional`, updatedValue)
                                  }}
                                />
                              }
                              disabled={props.disabled}
                            />
                          </Grid>
                          <Grid item xs={2}>
                            <TextField
                              variant="outlined"
                              type="number"
                              label="Amount"
                              placeholder="Amount"
                              value={expirationAdditionalData.value}
                              onChange={(event) => {
                                const valueAsInt = parseInt(event.target.value, 10)
                                const updatedValue = !Number.isNaN(valueAsInt)
                                  ? `${event.target.value} ${expirationAdditionalData.unit}`
                                  : null
                                formik.setFieldValue(`configuration.${index}.expirationAdditional`, updatedValue)
                              }}
                              disabled={props.disabled}
                            />
                          </Grid>

                          <Grid item xs={2}>
                            <FormControl>
                              <InputLabel id="expirationAdditionalUnit">Unit</InputLabel>
                              <Select
                                labelId="expirationAdditionalUnit"
                                value={expirationAdditionalData.unit}
                                onChange={(event) => {
                                  const updatedValue = `${expirationAdditionalData.value === '' ? 0 : expirationAdditionalData.value} ${
                                    event.target.value
                                  }`
                                  if (event.target.value === 'hour' && phase.expirationAdditionalFormat === 'EOD') {
                                    formik.setFieldValue(`configuration.${index}`, {
                                      ...formik.values.configuration[index],
                                      expirationAdditionalUnit: updatedValue,
                                      expirationAdditionalFormat: 'Date and Time',
                                    })
                                  } else {
                                    formik.setFieldValue(`configuration.${index}.expirationAdditional`, updatedValue)
                                  }
                                }}
                                disabled={props.disabled}
                              >
                                <MenuItem value="hour">Hours</MenuItem>
                                <MenuItem value="day">Days</MenuItem>
                                <MenuItem value="week">Weeks</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={3}>
                            <FormControl>
                              <InputLabel id="expirationAdditionalFormat">Expiration Format</InputLabel>
                              <Select
                                labelId="expirationAdditionalFormat"
                                value={phase.expirationAdditionalFormat}
                                onChange={(event) => {
                                  formik.setFieldValue(`configuration.${index}.expirationAdditionalFormat`, event.target.value)
                                }}
                                disabled={props.disabled}
                              >
                                <MenuItem disabled={expirationAdditionalData.unit === 'hour'} value="EOD">
                                  EOD
                                </MenuItem>
                                <MenuItem value="Date Only">Date Only</MenuItem>
                                <MenuItem value="Time Only">Time Only</MenuItem>
                                <MenuItem value="Date and Time">Date and Time</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12}>
                            <FormControlLabel
                              label="Custom Expiration"
                              control={
                                <Checkbox
                                  checked={phase.expirationCustom}
                                  onChange={() => {
                                    formik.setFieldValue(`configuration.${index}.expirationCustom`, !phase.expirationCustom)
                                  }}
                                />
                              }
                              disabled={props.disabled}
                            />
                          </Grid>
                        </Grid>
                      </Grid>

                      {index < allPhases.length - 1 && (
                        <Grid item xs={12}>
                          <Divider variant="middle" />
                        </Grid>
                      )}
                    </React.Fragment>
                  )
                })}
              </Grid>
            )
          })}
      </CardContent>
      <CardActions>
        <Button
          type="button"
          variant="contained"
          sx={{ mx: 'auto' }}
          disabled={customerPhaseOptions.length === 0 || props.disabled}
          onClick={() => {
            setOpenPhaseDialog(true)
          }}
        >
          Add Stage
        </Button>
        <SelectPhase
          open={openPhaseDialog}
          options={customerPhaseOptions}
          onClose={() => setOpenPhaseDialog(false)}
          onConfirm={(selectedPhase) => {
            const newPhaseIndex = formik.values.configuration.length
            const newPhaseConfiguration = createNewPhaseConfigurationFromOption(selectedPhase)
            formik.setFieldValue(`configuration.${newPhaseIndex}`, newPhaseConfiguration)
            setOpenPhaseDialog(false)
          }}
        />
      </CardActions>
    </Card>
  )
}

export default CategoryConfiguration

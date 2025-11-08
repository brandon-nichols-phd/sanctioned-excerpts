import React, { FC, useState } from 'react'
import { match } from 'ts-pattern'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
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
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SelectPhase from './select-phase'

import { useFormikContext } from 'formik'
import { TECH_DEBT, createNewPhaseConfigurationFromOption, type AllOptions, type ItemFormValues, type NumericString } from './item'

type ItemConfigurationExtraProps = {
  options: AllOptions
  disabled: boolean
}

type TabPanelExtraProps = {
  children?: React.ReactNode
  tabId: string
  value: string
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

const TabPanel: FC<TabPanelExtraProps> = (props) => {
  const { children, value, tabId, ...other } = props

  return (
    <Box role="tabpanel" hidden={value !== tabId} id={`tabpanel-${tabId}`} aria-labelledby={`tab-${tabId}`} {...other}>
      {value === tabId && (
        <Grid container rowSpacing={1} columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginTop: 1 }}>
          {children}
        </Grid>
      )}
    </Box>
  )
}

const ItemConfiguration: FC<ItemConfigurationExtraProps> = (props) => {
  const formik = useFormikContext<ItemFormValues>()
  const [activeTab, setActiveTab] = useState<NumericString>('0')
  const [openPhaseDialog, setOpenPhaseDialog] = useState(false)
  const hasCategories = formik.values.categories.length > 0
  const configurations = Object.entries(formik.values.configurations)

  if (configurations.length === 0) {
    return (
      <Card>
        <CardHeader title="Configuration" />
        <CardContent>
          <Typography sx={{ fontWeight: 'bold', fontSize: '2rem', textAlign: 'center', m: 3 }}>No Expiration Dates Needed</Typography>
        </CardContent>
      </Card>
    )
  }

  const configuredCategories = formik.values.categories.filter((category) => {
    return !!formik.values.configurations[category.value]
  })

  if (!configuredCategories.some((category) => category.value === activeTab)) {
    setActiveTab(configuredCategories[0]?.value ?? '0')
  }

  // Make sure the configurations are sorted in the same order as the categories they match.
  const configuredCategoriesId = configuredCategories.map((category) => category.value)
  configurations.sort(
    ([lId], [rId]) => configuredCategoriesId.indexOf(lId as NumericString) - configuredCategoriesId.indexOf(rId as NumericString)
  )

  const customerOptions = props.options[formik.values.customerId]
  const customerPhaseOptions = customerOptions?.possiblePhases.filter(
    (phase) => !formik.values.configurations[activeTab]?.some((p) => p.phaseId === phase.id)
  ) ?? [];
  // TECH DEBT: Find the 'Custom' category and the 'Default' phase and use them to determine if the current
  // item has them. This will trigger a special behavior.
  const customCategory = customerOptions?.possibleCategories.find((c) => (c.name ?? '').toLowerCase() === TECH_DEBT.NAME_OF_CUSTOM_CATEGORY)?.id?.toString();
  const defaultPhase =customerOptions?.possiblePhases.find((p) => (p.name ?? '').toLowerCase() === TECH_DEBT.NAME_OF_DEFAULT_PHASE);
  return (
    <Card>
      <CardHeader title="Configuration" />
      <CardContent>
        <Tabs value={activeTab} onChange={(_event, newValue) => setActiveTab(newValue)}>
          {configuredCategories.map((category) => {
            return <Tab label={category.label} value={category.value} id={`tab-${category.value}`} key={`Cat-${category.value}`} />
          })}
        </Tabs>
        {configurations.map(([categoryId, phaseConfig]) => {
          const phasesLastIndex = phaseConfig.length - 1

          return (
            <TabPanel value={activeTab} tabId={categoryId} key={`Cat-${categoryId}`}>
              {phaseConfig.map((phase, index) => {
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
                          phaseConfig.splice(index, 1)
                          formik.setFieldValue(`configurations.${categoryId}`, phaseConfig)
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
                        onChange={(event) => {
                          formik.setFieldValue(`configurations.${categoryId}.${index}.phaseName`, event.target.value)
                        }}
                      />
                    </Grid>

                    <Grid item xs={8}>
                      <Grid container columnSpacing={1} alignItems="center" justifyContent="flex-start" sx={{ marginLeft: 2 }}>
                        {match(customCategory && customCategory === categoryId && defaultPhase && defaultPhase.id === phase.phaseId)
                          .with(true, () => {
                            // TECH DEBT: The iOS app currently has 'No Expiration' hard-coded and it discards the `expirationCalculated` field.
                            return (
                              <Grid item xs={12}>
                                <FormControlLabel label="No Expiration" control={<Checkbox checked={true} disabled={props.disabled} />} />
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
                                          formik.setFieldValue(`configurations.${categoryId}.${index}.expirationCalculated`, updatedValue)
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
                                      formik.setFieldValue(`configurations.${categoryId}.${index}.expirationCalculated`, updatedValue)
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
                                          const categoryIndex: number = parseInt(categoryId);
                                          const currentConfig = formik.values.configurations?.[categoryIndex]?.[index];
                                          if (!currentConfig) return;
                                          formik.setFieldValue(`configurations.${categoryId}.${index}`, {
                                            ...currentConfig,
                                            expirationCalculated: updatedValue,
                                            expirationFormat: 'Date and Time',
                                          });
                                        } else {
                                          formik.setFieldValue(
                                            `configurations.${categoryId}.${index}.expirationCalculated`,
                                            updatedValue
                                          );
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
                                        formik.setFieldValue(`configurations.${categoryId}.${index}.expirationFormat`, event.target.value)
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
                          })}

                        <Grid item xs={5}>
                          <FormControlLabel
                            label="No Refrigeration Expiration"
                            control={
                              <Checkbox
                                checked={phase.expirationAdditional !== null}
                                onChange={() => {
                                  const updatedValue = phase.expirationAdditional === null ? '0 hour' : null
                                  formik.setFieldValue(`configurations.${categoryId}.${index}.expirationAdditional`, updatedValue)
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
                              formik.setFieldValue(`configurations.${categoryId}.${index}.expirationAdditional`, updatedValue)
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
                                  const categoryIndex: number = parseInt(categoryId)
                                  formik.setFieldValue(`configurations.${categoryId}.${index}`, {
                                    ...formik.values.configurations![categoryIndex]![index]!,
                                    expirationAdditional: updatedValue,
                                    expirationAdditionalFormat: 'Date and Time',
                                  })
                                } else {
                                  formik.setFieldValue(`configurations.${categoryId}.${index}.expirationAdditional`, updatedValue)
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
                                formik.setFieldValue(`configurations.${categoryId}.${index}.expirationAdditionalFormat`, event.target.value)
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
                                  formik.setFieldValue(`configurations.${categoryId}.${index}.expirationCustom`, !phase.expirationCustom)
                                }}
                              />
                            }
                            disabled={props.disabled}
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    {index !== phasesLastIndex && (
                      <Grid item xs={12}>
                        <Divider variant="middle" />
                      </Grid>
                    )}
                  </React.Fragment>
                )
              })}
            </TabPanel>
          )
        })}
      </CardContent>
      {hasCategories && (
        <CardActions>
          <Button
            type="button"
            variant="contained"
            sx={{ mx: 'auto' }}
            onClick={() => {
              setOpenPhaseDialog(true)
            }}
            disabled={props.disabled}
          >
            Add Stage
          </Button>
          <SelectPhase
            open={openPhaseDialog}
            options={customerPhaseOptions}
            onClose={() => setOpenPhaseDialog(false)}
            onConfirm={(selectedPhase) => {
              const newPhaseIndex = formik.values.configurations![activeTab]!.length;
              const newPhaseConfiguration = createNewPhaseConfigurationFromOption(selectedPhase)
              formik.setFieldValue(`configurations.${activeTab}.${newPhaseIndex}`, newPhaseConfiguration)
              setOpenPhaseDialog(false)
            }}
          />
        </CardActions>
      )}
    </Card>
  )
}

export default ItemConfiguration

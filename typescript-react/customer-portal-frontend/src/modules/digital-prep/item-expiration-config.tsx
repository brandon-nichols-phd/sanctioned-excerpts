import React, { FC, useCallback, useMemo, useState } from 'react'
import { useFormikContext, FieldArray } from 'formik'
import { cloneDeep } from 'lodash'

import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'

import { DebounceColorPicker } from '../labeling/debounced-color-picker'
import { FormDoc, ItemFormValues, OptionSection, createEmptyStage, createEmptyConfig } from './item'

type Props = {
  sections: OptionSection[]
  disabled: boolean
}

const getSectionName = (key: string, sections: OptionSection[]): string => {
  if (key === '0') {
    return 'Default'
  }

  return sections
    .filter((sec) => sec.sectionOrder === Number(key))
    .map((sec) => sec.name)
    .join(', ')
}

type ConfigProps = {
  itemKey: string
  doc: FormDoc
  disabled: boolean
}

const Config: FC<ConfigProps> = ({ itemKey, doc, disabled }) => {
  const formik = useFormikContext<ItemFormValues>()
  const stagesLength = formik.getFieldProps(`configuredDoc.${itemKey}.stages`).value?.length ?? 0

  const handleStageRemove = useCallback(
    (removeStage: (index: number) => void, index: number) => {
      // If we're removing a stage that's not the last one,
      // we need to ensure the new last stage has whenToChange set to null
      const stages = formik.values.configuredDoc[itemKey]?.stages ?? []
      const newLastIndex = stages.length - 2
      if (newLastIndex >= 0) {
        formik.setFieldValue(`configuredDoc.${itemKey}.stages.${newLastIndex}.whenToChange`, null)
      }
      removeStage(index)
    },
    [formik, itemKey]
  )

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        label="Total Expiration (in minutes)"
        type="number"
        name={`configuredDoc.${itemKey}.expiration`}
        value={doc[itemKey]?.expiration}
        onChange={formik.handleChange}
        disabled={disabled}
      />

      <Divider />

      <FieldArray
        name={`configuredDoc.${itemKey}.stages`}
        render={({ push: pushStage, remove: removeStage }) => (
          <Stack spacing={2}>
            <Typography variant="h6">Stages</Typography>

            {doc[itemKey]?.stages.map((_stage, stageIndex) => (
              <Box
                key={stageIndex}
                display="flex"
                gap={2}
                alignItems="center"
                sx={{
                  backgroundColor: 'background.paper',
                  p: 1,
                  borderRadius: 1,
                }}
              >
                <Typography sx={{ width: 225 }}>Stage {stageIndex + 1}</Typography>

                <FormControl fullWidth margin="normal">
                  <InputLabel id="color-label">Color</InputLabel>
                  <Select
                    labelId="color-label"
                    id='color-select'
                    label="Color"
                    variant="outlined"
                    sx={{ flex: 1 }}
                    value={formik.getFieldProps(`configuredDoc.${itemKey}.stages.${stageIndex}.stateName`).value ?? ''}
                    onBlur={formik.handleBlur}
                    onChange={(event) => 
                      {formik.setFieldValue(`configuredDoc.${itemKey}.stages.${stageIndex}.stateName`, event.target.value)
                      switch (event.target.value) {
                        case 'Green':
                          formik.setFieldValue(`configuredDoc.${itemKey}.stages.${stageIndex}.color`, "#AFC155");
                          break;
                        case 'Yellow':
                          formik.setFieldValue(`configuredDoc.${itemKey}.stages.${stageIndex}.color`, "#FED76E");
                          break;
                        case 'Red':
                          formik.setFieldValue(`configuredDoc.${itemKey}.stages.${stageIndex}.color`, "#FF8B8E");
                          break;
                        case 'Grey':
                          formik.setFieldValue(`configuredDoc.${itemKey}.stages.${stageIndex}.color`, "#D3D3D3");
                          break;
                        default: //if error, leave color hex unchanged
                          break;
                      }
                    }
                    }
                    disabled={disabled}
                  >
                    <MenuItem value="Green">Green</MenuItem>
                    <MenuItem value="Yellow">Yellow</MenuItem>
                    <MenuItem value="Red">Red</MenuItem>
                    <MenuItem value="Grey">Grey</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  variant="outlined"
                  placeholder="When to Change (in minutes)"
                  label="When to Change (in minutes)"
                  sx={{ width: 800 }}
                  type="number"
                  {...formik.getFieldProps(`configuredDoc.${itemKey}.stages.${stageIndex}.whenToChange`)}
                  value={doc[itemKey]?.stages[stageIndex]?.whenToChange ?? ''}
                  disabled={disabled || stageIndex === stagesLength - 1}
                />

                <IconButton
                  color="error"
                  onClick={() => handleStageRemove(removeStage, stageIndex)}
                  size="small"
                  sx={{ width: 48 }}
                  disabled={disabled}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => pushStage(createEmptyStage())} disabled={disabled}>
              Add Stage
            </Button>
          </Stack>
        )}
      />
    </Stack>
  )
}

export const ItemExpirationConfig: FC<Props> = (props) => {
  const formik = useFormikContext<ItemFormValues>()
  const doc = formik.values.configuredDoc
  const [isMulti, setIsMulti] = useState(Object.keys(doc).length > 1)
  const [activeTab, setActiveTab] = useState(0)

  const flatSectionsKeys = useMemo(() => {
    return Array.from(new Set(props.sections.map((sec) => sec.sectionOrder)))
  }, [props.sections])

  // When switching to multi mode or when a new tab is selected,
  // we need to ensure the section has data initialized
  const ensureSectionData = useCallback(
    (sectionKey: string) => {
      if (!doc[sectionKey]) {
        const template = doc['0'] ? cloneDeep(doc['0']) : createEmptyConfig()
        formik.setFieldValue(`configuredDoc.${sectionKey}`, template)
      }
    },
    [doc, formik]
  )

  // Handle tab change with initialization
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      const sectionKey = String(flatSectionsKeys[newValue])
      ensureSectionData(sectionKey)
      setActiveTab(newValue)
    },
    [flatSectionsKeys, ensureSectionData]
  )

  // When switching to multi mode, initialize all sections
  const handleMultiSwitch = useCallback(
    (_e: unknown, checked: boolean) => {
      setIsMulti(checked)
      if (checked) {
        flatSectionsKeys.forEach((sectionKey) => {
          ensureSectionData(String(sectionKey))
        })
      } else {
        // Keep only the default section (key '0') and remove others
        const defaultDoc = doc['0'] ?? createEmptyConfig()
        const newDoc = { '0': defaultDoc }
        formik.setFieldValue('configuredDoc', newDoc)
      }
    },
    [flatSectionsKeys, ensureSectionData, doc, formik]
  )

  return (
    <Card>
      <CardHeader title="Expiration Management" />
      <CardContent>
        <FormControl>
          <FormControlLabel control={<Switch checked={isMulti} onChange={handleMultiSwitch} disabled={props.disabled} />} label="Custom" />
        </FormControl>
        <FieldArray
          name="configuredDoc"
          render={({ remove }) => (
            <Stack spacing={3}>
              {isMulti ? (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange}>
                      {flatSectionsKeys.map((sectionKey) => (
                        <Tab
                          key={sectionKey}
                          label={getSectionName(String(sectionKey), props.sections)}
                          sx={{ display: 'flex', justifyContent: 'space-between' }}
                        />
                      ))}
                    </Tabs>
                  </Box>
                  {flatSectionsKeys.map((sectionKey, index) => (
                    <Box key={sectionKey} role="tabpanel" hidden={activeTab !== index} sx={{ mt: 2 }}>
                      {activeTab === index && <Config disabled={props.disabled} itemKey={String(sectionKey)} doc={doc} />}
                    </Box>
                  ))}
                </>
              ) : (
                Object.keys(doc).map((itemKey) => (
                  <Card key={itemKey} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">{getSectionName(itemKey, props.sections)}</Typography>
                          {itemKey !== '0' && (
                            <IconButton color="error" onClick={() => remove(Number(itemKey))} size="small" disabled={props.disabled}>
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                        <Config disabled={props.disabled} itemKey={itemKey} doc={doc} />
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          )}
        />
      </CardContent>
    </Card>
  )
}

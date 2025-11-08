import React, { FC, useState } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Grid from '@mui/material/Grid'

export type SelectInitialValuesProps = {
  title: string
  valuesToSelect: Array<{
    label: string
    list: Array<{
      itemId: number
      itemName: string
    }>
    selector: (itemId: number) => void
  }>
}

export const SelectInitialValues: FC<SelectInitialValuesProps> = (props) => {
  const [selectedValues, setSelectedValues] = useState<Array<number | undefined>>(Array(props.valuesToSelect.length).fill(undefined))
  const firstValues = props.valuesToSelect.map((valueDetails) => valueDetails.list[0]?.itemId)

  return (
    <Card>
      <CardHeader title={props.title} />
      <CardContent>
        <Grid container direction="column" spacing={1}>
          {props.valuesToSelect.map((valueDetails, index) => {
            return (
              <Grid item key={`control-${index}`}>
                <FormControl>
                  <InputLabel id={`label-${index}`}>{valueDetails.label}</InputLabel>
                  <Select
                    labelId={`label-${index}`}
                    id={`select-${index}`}
                    label={valueDetails.label}
                    defaultValue={firstValues[index]}
                    onChange={(e) => {
                      const valuesWithNew = [...selectedValues]
                      valuesWithNew[index] = Number(e.target.value)
                      setSelectedValues(valuesWithNew)
                    }}
                  >
                    {valueDetails.list.map((item) => {
                      return (
                        <MenuItem key={`option-${index}-${item.itemId}`} value={item.itemId}>
                          {item.itemName}
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              </Grid>
            )
          })}
        </Grid>
      </CardContent>
      <CardActions>
        <Button
          type="button"
          color="primary"
          variant="contained"
          onClick={() => {
            selectedValues.forEach((selectedValue, index) => {
              if (selectedValue) {
                props.valuesToSelect[index]?.selector(selectedValue)
              } else if (firstValues[index]) {
                props.valuesToSelect[index]?.selector(firstValues[index])
              }
            })
          }}
        >
          Select
        </Button>
      </CardActions>
    </Card>
  )
}

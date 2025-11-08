import React, { useCallback, useState } from 'react'
import { FormikProps } from 'formik'
import { HexColorPicker } from 'react-colorful'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Popper from '@mui/material/Popper'
import ClickAwayListener from '@mui/material/ClickAwayListener'

import { useDebounce } from './use-debounce'

type DebounceColorPickerExtraProps<T> = {
  field: string
  formik: FormikProps<T>
  disabled: boolean
}

const HEXADECIMAL_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i

// eslint-disable-next-line -- extends is needed to allow generics with JSX syntax
export const DebounceColorPicker = <T extends unknown>(props: DebounceColorPickerExtraProps<T>) => {
  const [openColorPicker, setOpenColorPicker] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const field = props.formik.getFieldProps(props.field)
  const meta = props.formik.getFieldMeta(props.field)
  const [color, setColor] = useState(field.value)

  const debounceFormikUpdate = useDebounce(
    useCallback(
      (newColor: string) => {
        props.formik.setFieldValue(props.field, newColor)
      },
      [props.formik, props.field]
    )
  )

  return (
    <ClickAwayListener
      onClickAway={() => {
        setOpenColorPicker(false)
      }}
    >
      <Box>
        <TextField
          fullWidth
          variant="outlined"
          type="text"
          placeholder="Color"
          label="Color"
          error={meta.touched && !!meta.error}
          name="color"
          value={color}
          onFocus={(event) => {
            // Remove the leading `#` character when editing the field.
            setColor(event.currentTarget.value.substring(1))
            setAnchorEl(event.currentTarget)
            setOpenColorPicker(true)
          }}
          onChange={(event) => {
            const newValue = event.currentTarget.value
            setColor(newValue)
            props.formik.setFieldValue(props.field, newValue)
          }}
          onPaste={(event) => {
            event.preventDefault()
            let newValue = event.clipboardData.getData('text/plain')

            // Accept pasting a hexadecimal color.
            if (HEXADECIMAL_COLOR_PATTERN.test(newValue)) {
              if (newValue.charAt(0) !== '#') {
                newValue = '#' + newValue
              }
              setColor(newValue)
              props.formik.setFieldValue(props.field, newValue)
            }
            return false
          }}
          onBlur={(event) => {
            props.formik.getFieldProps(props.field).onBlur(event)
            let newValue = event.currentTarget.value

            if (HEXADECIMAL_COLOR_PATTERN.test(newValue)) {
              // Add back the leading `#` character.
              if (newValue.charAt(0) !== '#') {
                newValue = '#' + newValue
              }
            } else {
              newValue = '#000000'
            }

            setColor(newValue)
            props.formik.setFieldValue(props.field, newValue)
          }}
          disabled={props.disabled}
        />
        <Popper
          sx={{ zIndex: 1 }}
          open={openColorPicker}
          anchorEl={anchorEl}
          placement="auto-start"
          onFocus={() => {
            setOpenColorPicker(true)
          }}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
          ]}
        >
          <HexColorPicker
            color={color}
            onChange={(newColor) => {
              setColor(newColor)
              debounceFormikUpdate(newColor)
            }}
          />
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}

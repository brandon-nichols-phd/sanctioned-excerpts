import React, { useState } from 'react'
import { Button, Snackbar, Alert } from '@mui/material'
export type ToastNotificaitonMessage = {
  message?: string
  success?: boolean
  display?: boolean
}
export const ToastNotification: React.FC<ToastNotificaitonMessage> = ({ message, success, display }) => {
  const [open, setOpen] = useState(display)

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return
    setOpen(false)
  }

  return (
    <div>
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert
          onClose={handleClose}
          severity={success ? 'success' : 'error'}
          sx={{
            width: '350px',
            fontSize: '1.2rem',
            padding: '20px',
            boxShadow: 3,
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </div>
  )
}

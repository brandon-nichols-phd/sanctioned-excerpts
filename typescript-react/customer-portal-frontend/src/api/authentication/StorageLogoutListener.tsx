import { useEffect } from 'react'
import useAuthContext from './useAuthContext'
import { LoginEvent } from './AuthenticationContext'

const StorageLogoutListener = () => {
  const { userLogout } = useAuthContext()

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LoginEvent.logout && event.newValue === null) {
        userLogout()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [userLogout])

  return null
}

export default StorageLogoutListener
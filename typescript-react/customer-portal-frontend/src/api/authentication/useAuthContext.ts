import { useContext } from 'react'
import { AuthenticationContext } from './AuthenticationContext'

const useAuthContext = () => useContext(AuthenticationContext)

export default useAuthContext

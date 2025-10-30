import { Navigate, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'

interface PrivateRouteProps {
    children: React.ReactNode
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
    const { isConnected, status } = useAccount()
    const location = useLocation()

    // Defer redirect while wallet is connecting/reconnecting on page refresh
    if (status === 'connecting' || status === 'reconnecting') {
        return null
    }

    if (!isConnected && status === 'disconnected') {
        return <Navigate to="/" replace state={{ from: location }} />
    }

    return <>{children}</>
}

export default PrivateRoute


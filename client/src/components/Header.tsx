import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { checkAuth, type User } from '../utils/authUtils'

export default function Header() {
    const [user, setUser] = useState<User | null>(null)
    const [circuitCount, setCircuitCount] = useState(0)

    useEffect(() => {
        // Check authentication
        checkAuth().then(({ authenticated, user }) => {
            if (authenticated && user) {
                setUser(user)
            }
        })

        // Load circuit count
        const updateCircuitCount = () => {
            const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
            setCircuitCount(circuit.length)
        }
        updateCircuitCount()
        window.addEventListener('storage', updateCircuitCount)
        return () => window.removeEventListener('storage', updateCircuitCount)
    }, [])

    return (
        <div className="bg-background-paper shadow-md border-b border-gray-700">
            <div className="container mx-auto px-3 md:px-4 py-2 md:py-4">
                <div className="flex justify-between items-center gap-2 md:gap-4">
                    <Link to="/" className="text-xl md:text-2xl font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 md:gap-2">
                        🛍️ <span className="hidden sm:inline">GoChineur</span>
                    </Link>

                    <div className="flex items-center gap-2 md:gap-4">
                        <Link
                            to="/soumettre"
                            className="bg-primary hover:bg-primary-hover text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-orange-900/20 flex items-center gap-1 md:gap-2"
                        >
                            <span className="text-lg md:text-base">➕</span> <span className="hidden md:inline">Ajouter un événement</span>
                        </Link>

                        {user ? (
                            <Link
                                to="/mon-compte"
                                className="bg-background-lighter hover:bg-gray-700 text-text-primary px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-600 flex items-center gap-1 md:gap-2 relative"
                            >
                                <span className="text-lg md:text-base">👤</span> <span className="hidden md:inline">Mon compte</span>
                                {circuitCount > 0 && (
                                    <span className="absolute -top-1 -right-1 md:static bg-primary text-white rounded-full h-5 w-5 md:h-6 md:w-6 flex items-center justify-center text-xs font-bold">
                                        {circuitCount}
                                    </span>
                                )}
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-background-lighter hover:bg-gray-700 text-text-primary px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-600 flex items-center gap-1 md:gap-2"
                            >
                                <span className="text-lg md:text-base">👤</span> <span className="hidden md:inline">Se connecter</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

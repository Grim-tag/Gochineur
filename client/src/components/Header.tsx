import { Link } from 'react-router-dom'
import { getToken } from '../services/auth'
import { useEffect, useState } from 'react'
import { API } from '../config/constants'

export default function Header() {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const token = getToken()
        if (token) {
            fetch(`${API.BASE_URL}/api/user/current`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUser(data.user)
                    }
                })
                .catch(err => console.error('Error fetching user:', err))
        }
    }, [])

    return (
        <div className="bg-background-paper shadow-md border-b border-gray-700">
            <div className="container mx-auto px-4 py-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <Link to="/" className="text-2xl font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                        🛍️ GoChineur
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            to="/soumettre"
                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-orange-900/20 flex items-center gap-2"
                        >
                            <span>➕</span> <span className="hidden sm:inline">Ajouter un événement</span>
                        </Link>

                        {user ? (
                            <Link
                                to="/mon-compte"
                                className="bg-background-lighter hover:bg-gray-700 text-text-primary px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-600 flex items-center gap-2"
                            >
                                <span>👤</span> <span className="hidden sm:inline">Mon compte</span>
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-background-lighter hover:bg-gray-700 text-text-primary px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-600 flex items-center gap-2"
                            >
                                <span>👤</span> <span className="hidden sm:inline">Se connecter</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

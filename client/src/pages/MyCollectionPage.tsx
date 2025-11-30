import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CollectionSection from '../components/CollectionSection'
import { checkAuth, type User } from '../utils/authUtils'
import Breadcrumbs from '../components/Breadcrumbs'

export default function MyCollectionPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuth().then(({ authenticated, user }) => {
            if (!authenticated || !user) {
                navigate('/login?returnTo=/ma-collection')
                return
            }
            setUser(user)
            setLoading(false)
        })
    }, [navigate])

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />

            <div className="container mx-auto px-4 py-6">
                <Breadcrumbs items={[
                    { label: 'Accueil', path: '/' },
                    { label: 'Mon Compte', path: '/mon-compte' },
                    { label: 'Ma Collection' }
                ]} />

                <div className="mt-6">
                    <CollectionSection user={user} />
                </div>
            </div>
        </div>
    )
}

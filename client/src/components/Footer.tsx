import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API } from '../config/constants'

interface Department {
    code: string
    name: string
}

export default function Footer() {
    const [departments, setDepartments] = useState<Department[]>([])

    useEffect(() => {
        fetch(`${API.BASE_URL}/api/geo/departments`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDepartments(data.departments)
                }
            })
            .catch(err => console.error('Erreur chargement départements footer:', err))
    }, [])

    return (
        <footer className="bg-gray-800 text-gray-300 py-8 mt-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-4">GoChineur</h3>
                        <p className="text-sm">
                            L'agenda de référence pour les vide-greniers, brocantes et bourses aux collections en France.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-4">Liens utiles</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white">Accueil</Link></li>
                            <li><Link to="/soumettre" className="hover:text-white">Ajouter un événement</Link></li>
                            <li><Link to="/mon-compte" className="hover:text-white">Mon compte</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
                        <p className="text-sm">
                            Une question ? Une suggestion ?<br />
                            Contactez-nous sur contact@gochineur.fr
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-8">
                    <h3 className="text-white font-bold text-sm mb-4">Vide-greniers par département</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                        {departments.map(dept => (
                            <Link
                                key={dept.code}
                                to={`/vide-grenier/${dept.code}`}
                                className="hover:text-white truncate"
                                title={`Vide-greniers ${dept.name}`}
                            >
                                {dept.code} - {dept.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-xs">
                    <p>&copy; {new Date().getFullYear()} GoChineur. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    )
}

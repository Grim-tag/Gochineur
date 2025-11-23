import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { checkAuth, redirectToGoogleAuth } from '../utils/authUtils'
import { fetchEventById, updateEvent } from '../services/api'
import { API } from '../config/constants'
import Header from '../components/Header'

interface FormData {
    // Étape 1
    role: string
    type: string
    // Étape 2
    address: string
    city: string
    postalCode: string
    latitude: string
    longitude: string
    date_debut: string
    date_fin: string
    heure_debut: string
    heure_fin: string
    // Étape 3
    name: string
    telephone: string
    email: string
    pays: string
    prix_visiteur: string
    prix_montant: string
    description_visiteurs: string
    description_exposants: string
}

export default function EditEventPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingEvent, setLoadingEvent] = useState(true)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState<FormData>({
        role: '',
        type: '',
        address: '',
        city: '',
        postalCode: '',
        latitude: '',
        longitude: '',
        date_debut: '',
        date_fin: '',
        heure_debut: '09:00',
        heure_fin: '18:00',
        name: '',
        telephone: '',
        email: '',
        pays: 'France',
        prix_visiteur: 'Gratuite',
        prix_montant: '',
        description_visiteurs: '',
        description_exposants: ''
    })

    // Vérification d'authentification
    useEffect(() => {
        checkAuth().then(({ authenticated, user }) => {
            if (authenticated && user) {
                setIsAuthenticated(true)
                setCheckingAuth(false)
            } else {
                // Non authentifié, rediriger vers la connexion Google
                redirectToGoogleAuth(`/edit-event/${id}`)
            }
        }).catch(err => {
            console.error('Erreur lors de la vérification de l\'authentification:', err)
            setError('Erreur de connexion au serveur')
            setCheckingAuth(false)
        })
    }, [navigate, id])

    // Chargement de l'événement
    useEffect(() => {
        if (isAuthenticated && id) {
            setLoadingEvent(true)
            fetchEventById(id)
                .then(event => {
                    // Pré-remplir le formulaire
                    const dateDebut = new Date(event.date_debut || new Date().toISOString())
                    const dateFin = new Date(event.date_fin || event.date_debut || new Date().toISOString())

                    // Extraire les heures
                    const heureDebut = dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    const heureFin = dateFin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

                    // Extraire les descriptions
                    let descVisiteurs = event.description || ''
                    let descExposants = ''

                    if (event.description && event.description.includes('Modalités d\'inscription / Horaires exposants :')) {
                        const parts = event.description.split('Modalités d\'inscription / Horaires exposants :')
                        descVisiteurs = parts[0].replace('Informations visiteurs :', '').trim()
                        descExposants = parts[1].trim()
                    }

                    setFormData({
                        role: event.role || 'Autre',
                        type: event.type,
                        address: event.address,
                        city: event.city,
                        postalCode: event.postalCode,
                        latitude: event.latitude.toString(),
                        longitude: event.longitude.toString(),
                        date_debut: dateDebut.toISOString().split('T')[0],
                        date_fin: dateFin.toISOString().split('T')[0],
                        heure_debut: heureDebut,
                        heure_fin: heureFin,
                        name: event.name,
                        telephone: event.telephone || '',
                        email: event.email || '',
                        pays: event.pays || 'France',
                        prix_visiteur: event.prix_visiteur || 'Gratuite',
                        prix_montant: event.prix_montant ? event.prix_montant.toString() : '',
                        description_visiteurs: descVisiteurs,
                        description_exposants: descExposants
                    })
                    setLoadingEvent(false)
                })
                .catch(err => {
                    console.error('Erreur chargement événement:', err)
                    setError('Impossible de charger l\'événement. Il n\'existe peut-être plus ou vous n\'avez pas les droits.')
                    setLoadingEvent(false)
                })
        }
    }, [isAuthenticated, id])

    // Géocodage avec debounce (identique à SubmitEventPage)
    useEffect(() => {
        // Ne pas géocoder au chargement initial si les coordonnées sont déjà là
        // On géocode seulement si l'utilisateur modifie l'adresse
        // Pour simplifier, on utilise le même debounce, mais on pourrait ajouter un flag "dirty"
        const timer = setTimeout(() => {
            if (formData.address && formData.city && formData.postalCode) {
                // Vérifier si les coordonnées actuelles correspondent déjà à l'adresse (approximativement)
                // Pour l'instant on re-géocode toujours si modification, c'est plus sûr
                geocodeAddress(formData.address, formData.city, formData.postalCode).then(coords => {
                    if (coords) {
                        // On met à jour seulement si différent (pour éviter boucle infinie si on ajoutait dépendance lat/lon)
                        if (coords.latitude.toString() !== formData.latitude || coords.longitude.toString() !== formData.longitude) {
                            setFormData(prev => ({
                                ...prev,
                                latitude: coords.latitude.toString(),
                                longitude: coords.longitude.toString()
                            }))
                        }
                    }
                })
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [formData.address, formData.city, formData.postalCode])

    // Géocodage de l'adresse (via proxy serveur)
    const geocodeAddress = async (address: string, city: string, postalCode: string) => {
        try {
            const query = `${address}, ${postalCode} ${city}, France`
            const baseUrl = API.BASE_URL || ''
            const response = await fetch(
                `${baseUrl}/api/geo/geocode?q=${encodeURIComponent(query)}&limit=1`
            )

            if (response.ok) {
                const data = await response.json()
                if (data.length > 0) {
                    return {
                        latitude: parseFloat(data[0].lat),
                        longitude: parseFloat(data[0].lon)
                    }
                }
            }
        } catch (error) {
            console.warn('Erreur lors du géocodage:', error)
        }
        return null
    }

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
    }

    const handleAddressChange = (address: string) => {
        handleInputChange('address', address)
    }

    const validateStep = (step: number): boolean => {
        setError(null)

        if (step === 1) {
            if (!formData.role || !formData.type) {
                setError('Veuillez sélectionner votre rôle et le type d\'événement.')
                return false
            }
        } else if (step === 2) {
            if (!formData.address || !formData.city || !formData.date_debut) {
                setError('Veuillez remplir l\'adresse, la ville et la date de début.')
                return false
            }
            if (!formData.latitude || !formData.longitude) {
                setError('Impossible de géocoder l\'adresse. Vérifiez que l\'adresse est complète.')
                return false
            }
        } else if (step === 3) {
            if (!formData.name) {
                setError('Veuillez saisir le titre de l\'événement.')
                return false
            }
        }

        return true
    }

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrevious = () => {
        setCurrentStep(prev => prev - 1)
        setError(null)
    }

    const handleSubmit = async () => {
        if (!validateStep(3) || !id) return

        setLoading(true)
        setError(null)

        try {
            // Convert string coordinates to numbers for the API
            const eventData = {
                ...formData,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                prix_montant: formData.prix_montant ? parseFloat(formData.prix_montant) : undefined
            }

            await updateEvent(id, eventData)

            setSuccess(true)
            setTimeout(() => {
                navigate('/mon-compte')
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la modification de l\'événement')
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth || loadingEvent) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Chargement...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="bg-background-paper rounded-lg shadow-lg p-8 max-w-md text-center border border-gray-700">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-text-primary mb-4">Modifications enregistrées !</h1>
                    <p className="text-text-secondary mb-6">
                        Votre événement a été mis à jour avec succès.
                    </p>
                    <Link
                        to="/mon-compte"
                        className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors inline-block font-semibold"
                    >
                        Retour à mon compte
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold text-text-primary mb-2">Modifier l'événement</h1>
                <p className="text-text-secondary mb-8">Mettez à jour les informations de votre événement</p>

                {/* Indicateur de progression */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-gray-500'}`}>
                            Étape 1: Rôle et Catégorie
                        </span>
                        <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-gray-500'}`}>
                            Étape 2: Lieu et Date
                        </span>
                        <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-primary' : 'text-gray-500'}`}>
                            Étape 3: Détails
                        </span>
                    </div>
                    <div className="w-full bg-background-lighter rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(currentStep / 3) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Messages d'erreur */}
                {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Étape 1 : Rôle et Catégorie */}
                {currentStep === 1 && (
                    <div className="bg-background-paper rounded-lg shadow-md p-6 space-y-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-text-primary mb-4">Rôle et Catégorie</h2>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3">
                                Quel est votre rôle ? <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                                {['Organisateur', 'Chargé de promotion', 'Autre'].map((role) => (
                                    <label key={role} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-background-lighter transition-colors">
                                        <input
                                            type="radio"
                                            name="role"
                                            value={role}
                                            checked={formData.role === role}
                                            onChange={(e) => handleInputChange('role', e.target.value)}
                                            className="mr-3 accent-primary"
                                        />
                                        <span className="text-text-primary">{role}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3">
                                Type de manifestation <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                                {['Vide-greniers', 'Brocante', 'Bourse d\'objets', 'Bourse de collectionneurs'].map((type) => (
                                    <label key={type} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-background-lighter transition-colors">
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type.toLowerCase()}
                                            checked={formData.type === type.toLowerCase()}
                                            onChange={(e) => handleInputChange('type', e.target.value)}
                                            className="mr-3 accent-primary"
                                        />
                                        <span className="text-text-primary">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 2 : Lieu et Date */}
                {currentStep === 2 && (
                    <div className="bg-background-paper rounded-lg shadow-md p-6 space-y-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-text-primary mb-4">Lieu et Date</h2>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Adresse <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleAddressChange(e.target.value)}
                                placeholder="Ex: 123 Rue de la République"
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Ville <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    placeholder="Ex: Paris"
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Code postal <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.postalCode}
                                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                                    placeholder="Ex: 75001"
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                                />
                            </div>
                        </div>

                        {(formData.latitude && formData.longitude) && (
                            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                                <p className="text-green-400 text-sm">
                                    ✅ Coordonnées GPS détectées : {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Date de début <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.date_debut}
                                    onChange={(e) => handleInputChange('date_debut', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Date de fin
                                </label>
                                <input
                                    type="date"
                                    value={formData.date_fin}
                                    onChange={(e) => handleInputChange('date_fin', e.target.value)}
                                    min={formData.date_debut || new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Heure de début
                                </label>
                                <input
                                    type="time"
                                    value={formData.heure_debut}
                                    onChange={(e) => handleInputChange('heure_debut', e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Heure de fin
                                </label>
                                <input
                                    type="time"
                                    value={formData.heure_fin}
                                    onChange={(e) => handleInputChange('heure_fin', e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 3 : Détails */}
                {currentStep === 3 && (
                    <div className="bg-background-paper rounded-lg shadow-md p-6 space-y-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-text-primary mb-4">Détails de l'événement</h2>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Titre de l'événement <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Ex: Vide-grenier de Noël"
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Téléphone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.telephone}
                                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                                    placeholder="Ex: +33 6 12 34 56 78"
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="Ex: contact@example.com"
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Pays
                            </label>
                            <select
                                value={formData.pays}
                                onChange={(e) => handleInputChange('pays', e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                            >
                                <option value="France">France</option>
                                <option value="Belgique">Belgique</option>
                                <option value="Suisse">Suisse</option>
                                <option value="Espagne">Espagne</option>
                                <option value="Luxembourg">Luxembourg</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3">
                                Prix pour les visiteurs <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                                {['Gratuite', 'Payante'].map((prix) => (
                                    <label key={prix} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-background-lighter transition-colors">
                                        <input
                                            type="radio"
                                            name="prix_visiteur"
                                            value={prix}
                                            checked={formData.prix_visiteur === prix}
                                            onChange={(e) => handleInputChange('prix_visiteur', e.target.value)}
                                            className="mr-3 accent-primary"
                                        />
                                        <span className="text-text-primary">{prix}</span>
                                    </label>
                                ))}
                            </div>
                            {formData.prix_visiteur === 'Payante' && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Montant (€)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.prix_montant}
                                        onChange={(e) => handleInputChange('prix_montant', e.target.value)}
                                        placeholder="Ex: 2.50"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Informations visiteurs / Complémentaires
                            </label>
                            <textarea
                                value={formData.description_visiteurs}
                                onChange={(e) => handleInputChange('description_visiteurs', e.target.value)}
                                placeholder="Décrivez votre événement, les produits disponibles, les animations..."
                                rows={5}
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Modalités d'inscription / Horaires Exposants
                            </label>
                            <textarea
                                value={formData.description_exposants}
                                onChange={(e) => handleInputChange('description_exposants', e.target.value)}
                                placeholder="Tarifs pour les exposants, horaires d'installation, modalités d'inscription..."
                                rows={5}
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder-gray-500"
                            />
                        </div>
                    </div>
                )}

                {/* Boutons de navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 1}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${currentStep === 1
                            ? 'bg-background-lighter text-gray-500 cursor-not-allowed'
                            : 'bg-background-lighter text-text-primary hover:bg-gray-700'
                            }`}
                    >
                        Précédent
                    </button>

                    {currentStep < 3 ? (
                        <button
                            onClick={handleNext}
                            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors"
                        >
                            Suivant
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${loading
                                ? 'bg-gray-600 text-white cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

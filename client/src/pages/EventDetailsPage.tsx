import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchEventById } from '../services/api'
import type { Event } from '../types'
import Breadcrumbs from '../components/Breadcrumbs'

export default function EventDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [event, setEvent] = useState<Event | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const decodedId = decodeURIComponent(id)

        setLoading(true)
        fetchEventById(decodedId)
            .then(data => {
                setEvent(data)
                setLoading(false)
                // Update SEO title
                document.title = `${data.name} - GoChineur`
            })
            .catch(err => {
                console.error('Error loading event:', err)
                setError('Impossible de charger les détails de l\'événement.')
                setLoading(false)
            })
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Chargement...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-background py-12 px-4">
                <div className="container mx-auto max-w-2xl text-center">
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-red-400 mb-2">Erreur</h1>
                        <p className="text-red-300">{error || 'Événement non trouvé'}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-6 px-6 py-2 bg-background-lighter hover:bg-gray-700 text-text-primary rounded-lg transition-colors"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const breadcrumbsItems = [
        { label: 'Accueil', path: '/' },
        { label: event.city, path: `/brocantes/${event.city.toLowerCase().replace(/\s+/g, '-')}` }, // Approximate link
        { label: event.name }
    ]

    // Format date
    const dateObj = new Date(event.date_debut || event.date)
    const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header / Nav would go here if not in layout */}

            <div className="container mx-auto px-4 py-6">
                <Breadcrumbs items={breadcrumbsItems} />

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-background-paper rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                            <div className="p-6 md:p-8">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold">
                                        {event.type}
                                    </span>
                                    {event.prix_visiteur && (
                                        <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
                                            Entrée : {event.prix_visiteur}
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                                    {event.name}
                                </h1>

                                <div className="flex items-center gap-2 text-text-secondary mb-6">
                                    <span className="text-xl">📅</span>
                                    <span className="text-lg capitalize">{dateFormatted}</span>
                                </div>

                                <div className="flex items-start gap-2 text-text-secondary mb-8">
                                    <span className="text-xl mt-1">📍</span>
                                    <div>
                                        <p className="text-lg font-medium text-text-primary">{event.address}</p>
                                        <p>{event.postalCode} {event.city}</p>
                                    </div>
                                </div>

                                <div className="prose prose-invert max-w-none">
                                    <h3 className="text-xl font-semibold text-text-primary mb-3">Description</h3>
                                    <div className="whitespace-pre-line text-text-secondary leading-relaxed">
                                        {event.description || "Aucune description disponible."}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Contact Info */}
                    <div className="space-y-6">
                        {/* Contact Card */}
                        <div className="bg-background-paper rounded-xl shadow-lg border border-gray-700 p-6 sticky top-24">
                            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                                <span>📞</span> Contact & Réservation
                            </h3>

                            <div className="space-y-4">
                                {event.submitted_by_pseudo && (
                                    <div className="p-3 bg-background rounded-lg border border-gray-700">
                                        <p className="text-sm text-text-muted mb-1">Organisé par</p>
                                        <p className="font-semibold text-text-primary">{event.submitted_by_pseudo}</p>
                                    </div>
                                )}

                                {event.telephone ? (
                                    <a
                                        href={`tel:${event.telephone}`}
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-green-900/20"
                                    >
                                        <span>📞 Appeler l'organisateur</span>
                                    </a>
                                ) : (
                                    <div className="p-4 bg-gray-800/50 rounded-lg text-center text-text-muted italic">
                                        Aucun numéro de téléphone disponible
                                    </div>
                                )}

                                {event.prix_montant && (
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <p className="text-sm text-text-muted mb-1">Tarif exposant</p>
                                        <p className="text-xl font-bold text-primary">{event.prix_montant}€ <span className="text-sm font-normal text-text-secondary">/ mètre</span></p>
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-700">
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        <span>🗺️ Y aller (GPS)</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

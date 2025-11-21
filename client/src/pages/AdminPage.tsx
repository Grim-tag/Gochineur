import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { API } from '../config/constants'
import { getToken, removeToken } from '../services/auth'

interface User {
  id: string
  email: string
  name: string
  displayName: string | null
  role: string
  createdAt: string
  updatedAt: string
  validatedEventsCount?: number
  isExpert?: boolean
}

interface Event {
  id: string
  name: string
  type: string
  date_debut: string
  city: string
  address: string
  submitted_by_pseudo: string | null
  statut_validation: string
  user_id: string | null
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'events'>('events')
  const [activePeriod, setActivePeriod] = useState<'1' | '2' | '3' | 'all'>('1') // Onglet de période par défaut
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'published' | 'rejected'>('all')
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editForm, setEditForm] = useState<Partial<Event>>({})

  // Helper pour les headers d'authentification
  const getAuthHeaders = () => {
    const token = getToken()
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  useEffect(() => {
    // Vérifier l'authentification et le rôle
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }

    fetch(`${API.BASE_URL}/api/user/current`, {
      headers: getAuthHeaders()
    })
      .then(response => {
        if (response.status === 401) {
          removeToken()
          navigate('/login')
          throw new Error('Session expirée')
        }
        return response.json()
      })
      .then(data => {
        if (!data.authenticated || !data.user) {
          removeToken()
          navigate('/login')
          return
        }

        const userRole = data.user.role || 'user'
        if (userRole !== 'admin' && userRole !== 'moderator') {
          // Rediriger vers l'accueil si l'utilisateur n'a pas les droits
          navigate('/')
          return
        }

        setUser(data.user)
        setLoading(false)
        loadData()
      })
      .catch(err => {
        console.error('Erreur:', err)
        setError('Erreur de connexion au serveur')
        setLoading(false)
      })
  }, [navigate])

  const loadData = () => {
    setLoadingData(true)
    setError(null)

    if (activeTab === 'users') {
      fetch(`${API.BASE_URL}/api/admin/users`, {
        headers: getAuthHeaders()
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Erreur lors du chargement des utilisateurs')
          }
          return response.json()
        })
        .then(data => {
          setUsers(data.users || [])
          setLoadingData(false)
        })
        .catch(err => {
          setError(err.message)
          setLoadingData(false)
        })
    } else {
      // Construire l'URL avec le paramètre period si on est sur l'onglet événements
      const periodParam = activePeriod !== 'all' ? `?period=${activePeriod}` : ''
      fetch(`${API.BASE_URL}/api/admin/events${periodParam}`, {
        headers: getAuthHeaders()
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Erreur lors du chargement des événements')
          }
          return response.json()
        })
        .then(data => {
          setEvents(data.events || [])
          setLoadingData(false)
        })
        .catch(err => {
          setError(err.message)
          setLoadingData(false)
        })
    }
  }

  useEffect(() => {
    if (!loading && user) {
      loadData()
    }
  }, [activeTab, activePeriod, loading, user])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir changer le rôle de cet utilisateur en "${newRole}" ?`)) {
      return
    }

    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la modification du rôle')
      }

      // Recharger les utilisateurs
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modification du rôle')
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`⚠️ ATTENTION : Vous allez supprimer définitivement l'utilisateur "${userEmail}" (RGPD - Droit à l'oubli). Cette action est irréversible. Continuer ?`)) {
      return
    }

    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      // Recharger les utilisateurs
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression')
    }
  }

  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  // ... (keep existing handlers but modify them)

  const handleValidateEvent = async (eventId: string) => {
    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/events/${eventId}/validate`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })

      if (!response.ok) throw new Error('Erreur lors de la validation')

      // Mise à jour locale sans rechargement
      setEvents(events.map(e => e.id === eventId ? { ...e, statut_validation: 'published' } : e))
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation')
    }
  }

  const handleRejectEvent = async (eventId: string) => {
    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/events/${eventId}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })

      if (!response.ok) throw new Error('Erreur lors du refus')

      // Mise à jour locale sans rechargement
      setEvents(events.map(e => e.id === eventId ? { ...e, statut_validation: 'rejected' } : e))
    } catch (err: any) {
      alert(err.message || 'Erreur lors du refus')
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setEditForm({
      name: event.name,
      type: event.type,
      date_debut: event.date_debut,
      city: event.city,
      address: event.address
    })
  }

  const handleSaveEdit = async () => {
    if (!editingEvent) return

    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la modification')
      }

      // Recharger les événements
      setEditingEvent(null)
      setEditForm({})
      // Pour l'édition, on recharge tout car les données peuvent avoir changé de manière complexe
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modification')
    }
  }

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${eventName}" ?`)) {
      return
    }

    try {
      const response = await fetch(`${API.BASE_URL}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      // Mise à jour locale sans rechargement
      setEvents(events.filter(e => e.id !== eventId))
      setSelectedEvents(selectedEvents.filter(id => id !== eventId))
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression')
    }
  }

  const handleBulkValidate = async () => {
    if (!confirm(`Valider ${selectedEvents.length} événements ?`)) return

    try {
      await Promise.all(selectedEvents.map(id =>
        fetch(`${API.BASE_URL}/api/admin/events/${id}/validate`, {
          method: 'PUT',
          headers: getAuthHeaders()
        })
      ))

      // Mise à jour locale
      setEvents(events.map(e => selectedEvents.includes(e.id) ? { ...e, statut_validation: 'published' } : e))
      setSelectedEvents([])
    } catch (err) {
      alert('Erreur lors de la validation de masse')
    }
  }

  const handleBulkReject = async () => {
    if (!confirm(`Refuser ${selectedEvents.length} événements ?`)) return

    try {
      await Promise.all(selectedEvents.map(id =>
        fetch(`${API.BASE_URL}/api/admin/events/${id}/reject`, {
          method: 'PUT',
          headers: getAuthHeaders()
        })
      ))

      // Mise à jour locale
      setEvents(events.map(e => selectedEvents.includes(e.id) ? { ...e, statut_validation: 'rejected' } : e))
      setSelectedEvents([])
    } catch (err) {
      alert('Erreur lors du refus de masse')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer DÉFINITIVEMENT ${selectedEvents.length} événements ?`)) return

    try {
      await Promise.all(selectedEvents.map(id =>
        fetch(`${API.BASE_URL}/api/admin/events/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      ))

      // Mise à jour locale
      setEvents(events.filter(e => !selectedEvents.includes(e.id)))
      setSelectedEvents([])
    } catch (err) {
      alert('Erreur lors de la suppression de masse')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              🛍️ GoChineur - Administration
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Connecté en tant que <strong>{user?.displayName || user?.name}</strong> ({user?.role})
              </span>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Retour
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Actions globales */}
        <div className="flex justify-end mb-6">
          <button
            onClick={async () => {
              if (!confirm('Êtes-vous sûr de vouloir lancer l\'importation ? Cela peut prendre plusieurs minutes.')) return;

              try {
                setLoadingData(true);
                const response = await fetch(`${API.BASE_URL}/api/admin/import-data`, {
                  method: 'POST',
                  headers: getAuthHeaders()
                });
                const data = await response.json();
                alert(data.message);
                loadData();
              } catch (err: any) {
                alert('Erreur lors de l\'importation: ' + err.message);
                setLoadingData(false);
              }
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            📥 Lancer l'importation (6 mois)
          </button>
        </div>
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'events'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Événements ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'users'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Utilisateurs ({users.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'events' ? (
          <>
            {/* Onglets de période */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="flex border-b">
                <button
                  onClick={() => setActivePeriod('1')}
                  className={`flex-1 px-6 py-3 font-semibold transition-colors ${activePeriod === '1'
                    ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  2 Mois en Cours
                </button>
                <button
                  onClick={() => setActivePeriod('2')}
                  className={`flex-1 px-6 py-3 font-semibold transition-colors ${activePeriod === '2'
                    ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  Reste de l'Année 2025
                </button>
                <button
                  onClick={() => setActivePeriod('3')}
                  className={`flex-1 px-6 py-3 font-semibold transition-colors ${activePeriod === '3'
                    ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  Année Suivante 2026
                </button>
              </div>
            </div>


            {/* Filtres de statut */}
            <div className="bg-white rounded-lg shadow-md mb-6 p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Filtrer par statut</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${filterStatus === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                >
                  ⏳ En attente
                  {events.filter(e => ['pending_review', 'En attente', 'En Attente', undefined].includes(e.statut_validation)).length > 0 && (
                    <span className="bg-white text-yellow-600 text-xs px-2 py-0.5 rounded-full font-bold">
                      {events.filter(e => ['pending_review', 'En attente', 'En Attente', undefined].includes(e.statut_validation)).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFilterStatus('published')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'published'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                >
                  ✅ Publiés
                </button>
                <button
                  onClick={() => setFilterStatus('rejected')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                >
                  ❌ Refusés
                </button>
              </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedEvents.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-xl rounded-full px-6 py-3 flex items-center gap-4 border border-gray-200 z-50 animate-fade-in-up">
                <span className="font-semibold text-gray-700">{selectedEvents.length} sélectionné(s)</span>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                  onClick={handleBulkValidate}
                  className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                >
                  ✅ Valider
                </button>
                <button
                  onClick={handleBulkReject}
                  className="text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
                >
                  🚫 Refuser
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  🗑️ Supprimer
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                  onClick={() => setSelectedEvents([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const filteredEvents = events.filter(event => {
                                if (filterStatus === 'all') return true
                                if (filterStatus === 'pending') return ['pending_review', 'En attente', 'En Attente', undefined].includes(event.statut_validation)
                                if (filterStatus === 'published') return ['published', 'Validé'].includes(event.statut_validation)
                                if (filterStatus === 'rejected') return ['rejected', 'Refusé'].includes(event.statut_validation)
                                return true
                              })
                              setSelectedEvents(filteredEvents.map(e => e.id))
                            } else {
                              setSelectedEvents([])
                            }
                          }}
                          checked={selectedEvents.length > 0 && selectedEvents.length === events.filter(event => {
                            if (filterStatus === 'all') return true
                            if (filterStatus === 'pending') return ['pending_review', 'En attente', 'En Attente', undefined].includes(event.statut_validation)
                            if (filterStatus === 'published') return ['published', 'Validé'].includes(event.statut_validation)
                            if (filterStatus === 'rejected') return ['rejected', 'Refusé'].includes(event.statut_validation)
                            return true
                          }).length}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">Lieu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {events
                      .filter(event => {
                        if (filterStatus === 'all') return true
                        if (filterStatus === 'pending') return ['pending_review', 'En attente', 'En Attente', undefined].includes(event.statut_validation)
                        if (filterStatus === 'published') return ['published', 'Validé'].includes(event.statut_validation)
                        if (filterStatus === 'rejected') return ['rejected', 'Refusé'].includes(event.statut_validation)
                        return true
                      })
                      .map((event) => (
                        <tr key={event.id} className={`hover:bg-gray-50 ${selectedEvents.includes(event.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedEvents.includes(event.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEvents([...selectedEvents, event.id])
                                } else {
                                  setSelectedEvents(selectedEvents.filter(id => id !== event.id))
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-sm truncate max-w-[200px]" title={event.name}>{event.name}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{event.type}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(event.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-sm truncate max-w-[150px]" title={event.city}>{event.city}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${event.statut_validation === 'published' || event.statut_validation === 'Validé'
                              ? 'bg-green-100 text-green-800'
                              : event.statut_validation === 'rejected' || event.statut_validation === 'Refusé'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {event.statut_validation === 'published' || event.statut_validation === 'Validé'
                                ? 'Publié'
                                : event.statut_validation === 'pending_review' || event.statut_validation === 'En attente' || event.statut_validation === 'En Attente'
                                  ? 'Attente'
                                  : 'Refusé'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1">
                              {(event.statut_validation !== 'published' && event.statut_validation !== 'Validé') && (
                                <button
                                  onClick={() => handleValidateEvent(event.id)}
                                  className="text-green-600 hover:bg-green-50 p-1.5 rounded"
                                  title="Valider"
                                >
                                  ✅
                                </button>
                              )}
                              {(event.statut_validation !== 'rejected' && event.statut_validation !== 'Refusé') && (
                                <button
                                  onClick={() => handleRejectEvent(event.id)}
                                  className="text-orange-600 hover:bg-orange-50 p-1.5 rounded"
                                  title="Refuser"
                                >
                                  🚫
                                </button>
                              )}
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                                title="Éditer"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id, event.name)}
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                                title="Supprimer"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {events.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Aucun événement trouvé
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pseudo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{u.displayName || u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'moderator'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {u.role}
                        </span>
                        {/* @ts-ignore */}
                        {u.isExpert && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            🏆 Expert
                          </span>
                        )}
                        {/* @ts-ignore */}
                        {u.validatedEventsCount > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({u.validatedEventsCount} validés)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {user?.role === 'admin' && (
                            <>
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="user">user</option>
                                <option value="moderator">moderator</option>
                                <option value="admin">admin</option>
                              </select>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                Supprimer (RGPD)
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Aucun utilisateur trouvé
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {
        editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Éditer l'événement</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'événement
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Vide-Grenier">Vide-Grenier</option>
                    <option value="Brocante">Brocante</option>
                    <option value="Puces et Antiquités">Puces et Antiquités</option>
                    <option value="Bourse">Bourse</option>
                    <option value="Vide Maison">Vide Maison</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={editForm.date_debut ? editForm.date_debut.split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(null)
                    setEditForm({})
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}


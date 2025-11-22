import type { Event } from '../types'
import { Link } from 'react-router-dom'
import { generateEventSlug } from '../utils/appUtils'

interface EventCardProps {
  event: Event
  onAddToCircuit: (eventId: string | number) => void
  isInCircuit: boolean
}

export default function EventCard({ event, onAddToCircuit, isInCircuit }: EventCardProps) {
  const formattedDate = new Date(event.date_debut || event.date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const eventTypeClass =
    event.type.toLowerCase().includes('vide grenier') || event.type.toLowerCase().includes('vide-grenier')
      ? 'bg-green-100 text-green-800'
      : event.type.toLowerCase().includes('brocante') || event.type.toLowerCase().includes('puces')
        ? 'bg-blue-100 text-blue-800'
        : 'bg-purple-100 text-purple-800'

  return (
    <div className="bg-background-paper rounded-lg shadow-lg p-6 hover:shadow-xl transition-all border border-gray-700 hover:border-primary/50 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-primary transition-colors">{event.name}</h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${eventTypeClass}`}>
              {event.type}
            </span>
            <span className="text-text-secondary text-sm flex items-center gap-1">
              📍 {event.city} <span className="text-text-muted">({event.postalCode})</span>
            </span>
            {event.distance !== undefined && (
              <span className="text-primary text-sm font-medium">
                📏 {event.distance} km
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-text-primary font-medium mb-1 flex items-center gap-2">
          📅 {formattedDate}
        </p>
        <p className="text-text-muted text-sm mb-2">
          {event.address}
        </p>
        <p className="text-text-secondary text-sm line-clamp-2">
          {event.description}
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          to={generateEventSlug(event)}
          className="flex-1 py-2 px-4 bg-background-lighter text-text-primary hover:bg-gray-700 rounded-lg font-semibold transition-colors text-center border border-gray-600"
        >
          Voir détails
        </Link>
        <button
          onClick={() => onAddToCircuit(event.id)}
          disabled={isInCircuit}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${isInCircuit
            ? 'bg-background-lighter text-text-muted cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-orange-900/20'
            }`}
        >
          {isInCircuit ? 'Ajouté' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}

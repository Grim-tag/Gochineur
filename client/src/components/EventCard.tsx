import type { Event } from '../types'

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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{event.name}</h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${eventTypeClass}`}>
              {event.type}
            </span>
            <span className="text-gray-500 text-sm">
              📍 {event.city} ({event.postalCode})
            </span>
            {event.distance !== undefined && (
              <span className="text-gray-500 text-sm">
                📏 {event.distance} km
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-gray-600 font-medium mb-1">
          📅 {formattedDate}
        </p>
        <p className="text-gray-500 text-sm mb-2">
          {event.address}
        </p>
        <p className="text-gray-700 text-sm line-clamp-2">
          {event.description}
        </p>
      </div>

      <button
        onClick={() => onAddToCircuit(event.id)}
        disabled={isInCircuit}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
          isInCircuit
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isInCircuit ? 'Déjà dans le circuit' : 'Ajouter au circuit'}
      </button>
    </div>
  )
}






import Header from '../components/Header'
import ObjectForm from '../components/ObjectForm'
import CardsInProgress from '../components/CardsInProgress'

export default function AddObjectPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">Ajouter un objet</h1>
                    <p className="text-text-secondary">
                        Enregistrez une nouvelle trouvaille dans votre Pokédex du Collectionneur
                    </p>
                </div>

                <ObjectForm />

                <CardsInProgress />
            </div>
        </div>
    )
}

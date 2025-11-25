import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importCSV } from '../services/collectionApi'
import { getToken } from '../services/auth'

export default function CSVImportPage() {
    const navigate = useNavigate()
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [results, setResults] = useState<any | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
                setError('Le fichier doit être au format CSV ou Excel (.xlsx)')
                return
            }
            setFile(selectedFile)
            setError(null)
            setResults(null)
        }
    }

    const handleImport = async () => {
        if (!file) {
            setError('Veuillez sélectionner un fichier')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await importCSV(file)
            setResults(response.results)
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de l\'import')
        } finally {
            setLoading(false)
        }
    }

    const downloadTemplate = () => {
        // Download Excel template from backend
        const token = getToken();
        if (!token) {
            setError('Vous devez être connecté pour télécharger le modèle');
            return;
        }

        fetch('/api/collection/template', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) throw new Error('Route non trouvée (Redémarrez le serveur)');
                    if (response.status === 500) throw new Error('Erreur serveur (Vérifiez les logs)');
                    throw new Error(`Erreur ${response.status} lors du téléchargement`);
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template_collection_gochineur.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                console.error(err);
                setError(err.message || 'Impossible de télécharger le modèle');
            });
    }

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/mon-compte')}
                        className="text-primary hover:text-primary-hover flex items-center gap-2 mb-4"
                    >
                        ← Retour à Mon Compte
                    </button>
                    <h1 className="text-4xl font-bold text-text-primary mb-2">Import Excel / CSV</h1>
                    <p className="text-text-secondary">Importez plusieurs objets en une seule fois depuis un fichier Excel ou CSV</p>
                </div>

                {/* Instructions */}
                <div className="bg-background-paper p-6 rounded-lg shadow-lg border border-gray-700 mb-8">
                    <h2 className="text-xl font-semibold text-primary mb-4">📋 Format du fichier</h2>
                    <p className="text-text-secondary mb-4">
                        Téléchargez le modèle Excel ci-dessous. Il contient des <strong>menus déroulants</strong> pour vous aider à remplir les champs correctement (État, Statut, Public).
                    </p>

                    <h3 className="font-semibold text-text-primary mb-2">Colonnes principales :</h3>
                    <ul className="text-sm text-text-secondary space-y-1 mb-4">
                        <li>• <strong>Nom</strong> (Obligatoire)</li>
                        <li>• <strong>Catégorie</strong> / Sous-Catégorie</li>
                        <li>• <strong>État</strong> (Excellent, Bon, Correct, Mauvais) - <em>Menu déroulant</em></li>
                        <li>• <strong>Statut</strong> (Garder, Vendre, Echanger) - <em>Menu déroulant</em></li>
                        <li>• <strong>Images</strong> (URLs) - Téléchargement automatique</li>
                    </ul>

                    <div className="bg-blue-900/20 border border-blue-800 text-blue-300 p-3 rounded text-sm mb-4">
                        💡 <strong>Astuce</strong> : Vous pouvez aussi importer ce fichier Excel dans <strong>Google Sheets</strong>, les menus déroulants fonctionneront !
                    </div>

                    <button
                        onClick={downloadTemplate}
                        className="w-full px-6 py-3 bg-green-600/20 text-green-400 border border-green-800/50 rounded-lg hover:bg-green-600/30 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        📥 Télécharger le modèle Excel (.xlsx)
                    </button>
                </div>

                {/* Upload Section */}
                <div className="bg-background-paper p-6 rounded-lg shadow-lg border border-gray-700 mb-8">
                    <h2 className="text-xl font-semibold text-primary mb-4">📁 Sélectionner le fichier</h2>

                    <div className="mb-4">
                        <input
                            type="file"
                            accept=".csv, .xlsx"
                            onChange={handleFileChange}
                            className="block w-full text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                        />
                    </div>

                    {file && (
                        <div className="bg-background p-3 rounded-lg mb-4">
                            <p className="text-text-primary">
                                <strong>Fichier sélectionné :</strong> {file.name}
                            </p>
                            <p className="text-text-secondary text-sm">
                                Taille : {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className={`w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20 ${(!file || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Import en cours...' : 'Importer le CSV'}
                    </button>
                </div>

                {/* Results Section */}
                {results && (
                    <div className="bg-background-paper p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-semibold text-primary mb-4">✅ Résultats de l'import</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                                <p className="text-green-300 text-3xl font-bold">{results.success}</p>
                                <p className="text-green-400 text-sm">Objets importés</p>
                            </div>
                            <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg">
                                <p className="text-red-300 text-3xl font-bold">{results.errors.length}</p>
                                <p className="text-red-400 text-sm">Erreurs</p>
                            </div>
                        </div>

                        {results.imageWarnings && results.imageWarnings.length > 0 && (
                            <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg mb-4">
                                <h3 className="font-semibold text-yellow-300 mb-2">⚠️ Images non importées ({results.imageWarnings.length})</h3>
                                <p className="text-yellow-200 text-sm mb-2">
                                    Les objets ont été créés mais leurs images n'ont pas pu être téléchargées. Vous pouvez les ajouter manuellement en éditant chaque objet.
                                </p>
                                <div className="bg-background p-3 rounded-lg max-h-32 overflow-y-auto">
                                    {results.imageWarnings.slice(0, 5).map((warn: any, idx: number) => (
                                        <div key={idx} className="text-xs text-yellow-300 mb-1">
                                            • <strong>{warn.itemName}</strong> : {warn.message}
                                        </div>
                                    ))}
                                    {results.imageWarnings.length > 5 && (
                                        <div className="text-xs text-yellow-400 mt-2">
                                            ... et {results.imageWarnings.length - 5} autre(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {results.errors.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-text-primary mb-2">Détails des erreurs :</h3>
                                <div className="bg-background p-4 rounded-lg max-h-64 overflow-y-auto">
                                    {results.errors.map((err: any, idx: number) => (
                                        <div key={idx} className="text-sm text-red-400 mb-2">
                                            <strong>Ligne {err.row}:</strong> {err.error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={() => navigate('/mon-compte')}
                                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors"
                            >
                                Voir ma collection
                            </button>
                            <button
                                onClick={() => {
                                    setFile(null)
                                    setResults(null)
                                    setError(null)
                                }}
                                className="flex-1 px-6 py-3 border border-gray-600 text-text-primary rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Importer un autre CSV
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

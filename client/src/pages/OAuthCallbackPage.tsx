import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setToken } from '../services/auth';
import NoIndex from '../components/NoIndex';

/**
 * Page de callback OAuth
 * Récupère le token depuis l'URL, le stocke dans localStorage, et redirige
 */
export default function OAuthCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const destination = searchParams.get('destination') || '/';
        const error = searchParams.get('error');

        if (error) {
            console.error('Erreur OAuth:', error);
            navigate(`/login?error=${error}`);
            return;
        }

        if (!token) {
            console.error('Token manquant dans le callback OAuth');
            navigate('/login?error=missing_token');
            return;
        }

        // Stocker le token
        setToken(token);
        console.log('✅ Token JWT stocké avec succès');

        // Rediriger vers la destination
        navigate(destination);
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <NoIndex title="Connexion..." />
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Connexion en cours...</p>
            </div>
        </div>
    );
}

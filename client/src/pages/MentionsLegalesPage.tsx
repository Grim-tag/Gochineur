import Header from '../components/Header'
import Breadcrumbs from '../components/Breadcrumbs'
import { useEffect } from 'react'

export default function MentionsLegalesPage() {
    useEffect(() => {
        document.title = 'Mentions Légales - GoChineur'
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Mentions légales de GoChineur - Informations sur l\'éditeur, l\'hébergeur et les conditions d\'utilisation du site.')
        }
    }, [])

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Breadcrumbs items={[
                    { label: 'Accueil', path: '/' },
                    { label: 'Mentions Légales' }
                ]} />

                <div className="mt-6 bg-background-paper rounded-xl shadow-lg border border-gray-700 p-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-8">Mentions Légales</h1>

                    {/* Éditeur du site */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">1. Éditeur du site</h2>
                        <div className="text-text-secondary space-y-2">
                            <p><strong className="text-text-primary">Raison sociale :</strong> GoChineur</p>
                            <p><strong className="text-text-primary">Forme juridique :</strong> Entrepreneur Individuel</p>
                            <p><strong className="text-text-primary">Directeur de la publication :</strong> Charles RONCHAIN</p>
                            <p><strong className="text-text-primary">Siège social :</strong> Rue des Pyrénées, 40390 SAINT-MARTIN-DE-HINX, France</p>
                            <p><strong className="text-text-primary">Contact :</strong> <a href="mailto:contact@gochineur.fr" className="text-primary hover:text-primary-hover">contact@gochineur.fr</a></p>
                        </div>
                    </section>

                    {/* Hébergement */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">2. Hébergement</h2>
                        <div className="text-text-secondary space-y-2">
                            <p><strong className="text-text-primary">Hébergeur :</strong> Render Services, Inc.</p>
                            <p><strong className="text-text-primary">Adresse :</strong> 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis</p>
                            <p><strong className="text-text-primary">Site web :</strong> <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">https://render.com</a></p>
                        </div>
                    </section>

                    {/* Propriété intellectuelle */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">3. Propriété intellectuelle</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                L'ensemble du contenu présent sur le site GoChineur (textes, graphismes, logos, icônes, images, vidéos, sons, logiciels, bases de données)
                                est la propriété exclusive de GoChineur ou de ses partenaires, et est protégé par les lois françaises et internationales relatives à la
                                propriété intellectuelle.
                            </p>
                            <p>
                                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen
                                ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de GoChineur.
                            </p>
                            <p>
                                L'extraction, l'aspiration ou la réutilisation substantielle du contenu de la base de données du site est strictement interdite.
                            </p>
                        </div>
                    </section>

                    {/* Données personnelles */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">4. Données personnelles</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit
                                d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
                            </p>
                            <p>
                                Pour exercer ces droits, vous pouvez nous contacter à l'adresse : <a href="mailto:contact@gochineur.fr" className="text-primary hover:text-primary-hover">contact@gochineur.fr</a>
                            </p>
                            <p>
                                Les données collectées via la connexion Google (nom, email, photo de profil) sont utilisées uniquement pour la gestion de votre compte
                                et l'amélioration de nos services. Elles ne sont jamais vendues à des tiers.
                            </p>
                        </div>
                    </section>

                    {/* Cookies */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">5. Cookies</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Le site GoChineur utilise des cookies techniques nécessaires au bon fonctionnement du site, notamment pour la gestion de l'authentification
                                et la sauvegarde de vos préférences.
                            </p>
                            <p>
                                Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela pourrait limiter certaines fonctionnalités du site.
                            </p>
                        </div>
                    </section>

                    {/* Responsabilité */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">6. Limitation de responsabilité</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                GoChineur s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site, mais ne peut garantir l'exactitude,
                                la précision ou l'exhaustivité des informations mises à disposition.
                            </p>
                            <p>
                                GoChineur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'accès au site ou de l'utilisation du site,
                                y compris l'inaccessibilité, les pertes de données, détériorations, destructions ou virus.
                            </p>
                            <p>
                                Les annonces publiées par les utilisateurs relèvent de leur seule responsabilité. GoChineur agit en tant qu'hébergeur et n'est pas
                                responsable du contenu publié par les utilisateurs.
                            </p>
                        </div>
                    </section>

                    {/* Droit applicable */}
                    <section>
                        <h2 className="text-2xl font-semibold text-primary mb-4">7. Droit applicable</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut d'accord amiable, le litige sera porté
                                devant les tribunaux français compétents.
                            </p>
                        </div>
                    </section>

                    <div className="mt-8 pt-6 border-t border-gray-700 text-sm text-text-muted">
                        <p>Dernière mise à jour : 25 novembre 2025</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

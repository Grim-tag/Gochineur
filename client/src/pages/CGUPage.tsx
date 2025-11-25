import Header from '../components/Header'
import Breadcrumbs from '../components/Breadcrumbs'
import { useEffect } from 'react'

export default function CGUPage() {
    useEffect(() => {
        document.title = 'Conditions Générales d\'Utilisation - GoChineur'
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Conditions générales d\'utilisation de GoChineur - Règles d\'utilisation, droits et obligations des utilisateurs.')
        }
    }, [])

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Breadcrumbs items={[
                    { label: 'Accueil', path: '/' },
                    { label: 'CGU' }
                ]} />

                <div className="mt-6 bg-background-paper rounded-xl shadow-lg border border-gray-700 p-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-8">Conditions Générales d'Utilisation</h1>

                    {/* Préambule */}
                    <section className="mb-8">
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'accès et l'utilisation de la plateforme GoChineur,
                                éditée par Charles RONCHAIN, Entrepreneur Individuel, dont le siège social est situé Rue des Pyrénées, 40390 SAINT-MARTIN-DE-HINX.
                            </p>
                            <p>
                                GoChineur est une plateforme communautaire dédiée aux passionnés de chine, brocante et vide-greniers, permettant de découvrir
                                des événements, partager sa collection d'objets chinés et échanger avec d'autres chineurs.
                            </p>
                        </div>
                    </section>

                    {/* Définitions */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">1. Définitions</h2>
                        <div className="text-text-secondary space-y-3">
                            <p><strong className="text-text-primary">Plateforme :</strong> Désigne le site web GoChineur accessible à l'adresse gochineur.fr et l'ensemble de ses fonctionnalités.</p>
                            <p><strong className="text-text-primary">Utilisateur :</strong> Toute personne accédant à la Plateforme, qu'elle soit inscrite ou non.</p>
                            <p><strong className="text-text-primary">Membre :</strong> Utilisateur ayant créé un compte sur la Plateforme via l'authentification Google.</p>
                            <p><strong className="text-text-primary">Organisateur :</strong> Membre publiant une annonce d'événement (vide-grenier, brocante, marché aux puces, etc.).</p>
                            <p><strong className="text-text-primary">Collectionneur :</strong> Membre partageant sa collection d'objets chinés via sa vitrine personnelle.</p>
                            <p><strong className="text-text-primary">Objet :</strong> Tout article, antiquité, objet de collection ou trouvaille partagé par un Collectionneur sur sa vitrine.</p>
                            <p><strong className="text-text-primary">Contenu :</strong> Ensemble des informations, textes, images, vidéos, données publiés sur la Plateforme par les Utilisateurs ou par GoChineur.</p>
                        </div>
                    </section>

                    {/* Acceptation */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">2. Acceptation des CGU</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions,
                                vous ne devez pas utiliser la Plateforme.
                            </p>
                            <p>
                                L'inscription sur la Plateforme se fait exclusivement via <strong className="text-text-primary">l'authentification Google (SSO - Single Sign-On)</strong>.
                                En vous connectant avec votre compte Google, vous acceptez expressément les présentes CGU et vous engagez à les respecter.
                            </p>
                            <p>
                                GoChineur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication
                                sur la Plateforme. Il est de votre responsabilité de consulter régulièrement les CGU.
                            </p>
                        </div>
                    </section>

                    {/* Inscription et compte */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">3. Inscription et gestion du compte</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Pour devenir Membre et accéder aux fonctionnalités avancées (publication d'événements, création de vitrine, ajout au circuit),
                                vous devez créer un compte en vous connectant via Google.
                            </p>
                            <p>
                                Vous vous engagez à fournir des informations exactes et à les maintenir à jour. Vous êtes responsable de la confidentialité de
                                votre compte Google et de toutes les activités effectuées via votre compte.
                            </p>
                            <p>
                                Vous pouvez supprimer votre compte à tout moment depuis votre espace personnel. La suppression entraîne la perte définitive de
                                vos données personnelles, mais les événements et objets que vous avez publiés peuvent rester visibles sur la Plateforme.
                            </p>
                        </div>
                    </section>

                    {/* Règles de conduite */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">4. Règles de conduite et publication de contenu</h2>
                        <div className="text-text-secondary space-y-3">
                            <p className="font-semibold text-text-primary">4.1. Publication d'événements</p>
                            <p>
                                Les Organisateurs peuvent publier des annonces d'événements à caractère <strong className="text-text-primary">occasionnel et temporaire</strong>
                                uniquement, en lien avec la thématique des vide-greniers, brocantes, marchés aux puces, bourses d'échange et événements similaires.
                            </p>
                            <p>
                                Sont strictement interdites les annonces :
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>À caractère commercial permanent (boutiques, magasins)</li>
                                <li>Sans rapport avec la thématique de la chine et de la brocante</li>
                                <li>Contenant des informations fausses, trompeuses ou mensongères</li>
                                <li>Violant les droits de propriété intellectuelle de tiers</li>
                                <li>À caractère illégal, diffamatoire, injurieux, discriminatoire ou pornographique</li>
                            </ul>

                            <p className="font-semibold text-text-primary mt-4">4.2. Partage de collections</p>
                            <p>
                                Les Collectionneurs peuvent partager des photos de leurs objets chinés sur leur vitrine personnelle. Les photos doivent être :
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Prises par vous-même ou libres de droits</li>
                                <li>En lien avec des objets de collection, antiquités ou trouvailles de chine</li>
                                <li>Respectueuses des droits d'auteur et de la vie privée</li>
                            </ul>
                            <p>
                                <strong className="text-text-primary">Il est strictement interdit</strong> d'utiliser des photos protégées par le droit d'auteur
                                sans autorisation expresse du titulaire des droits.
                            </p>

                            <p className="font-semibold text-text-primary mt-4">4.3. Modération</p>
                            <p>
                                GoChineur se réserve le droit de modérer, modifier ou supprimer tout Contenu qui ne respecterait pas les présentes CGU, sans préavis
                                ni justification. Les Membres contrevenants s'exposent à la suspension ou à la suppression de leur compte.
                            </p>
                        </div>
                    </section>

                    {/* Propriété intellectuelle */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">5. Propriété intellectuelle et protection de la base de données</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                L'ensemble des éléments de la Plateforme (structure, design, code source, logos, graphismes, base de données) est la propriété
                                exclusive de GoChineur et est protégé par les lois sur la propriété intellectuelle.
                            </p>
                            <p className="font-semibold text-text-primary">5.1. Protection de la base de données</p>
                            <p>
                                La base de données d'événements et de collections de GoChineur constitue une création intellectuelle protégée.
                                <strong className="text-text-primary"> Il est formellement interdit :</strong>
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>D'extraire, aspirer, copier ou réutiliser de manière substantielle le contenu de la base de données</li>
                                <li>D'utiliser des robots, scrapers ou tout outil automatisé pour collecter des données</li>
                                <li>De réutiliser les données à des fins commerciales en dehors de GoChineur</li>
                                <li>De créer une base de données concurrente à partir des données de GoChineur</li>
                            </ul>
                            <p>
                                Toute violation de ces interdictions expose son auteur à des poursuites judiciaires.
                            </p>

                            <p className="font-semibold text-text-primary mt-4">5.2. Licence d'utilisation du Contenu Utilisateur</p>
                            <p>
                                En publiant du Contenu sur la Plateforme, vous accordez à GoChineur une licence mondiale, non exclusive, gratuite et transférable
                                pour utiliser, reproduire, distribuer et afficher ce Contenu dans le cadre de l'exploitation de la Plateforme.
                            </p>
                            <p>
                                Vous conservez l'entière propriété de votre Contenu et pouvez le supprimer à tout moment.
                            </p>
                        </div>
                    </section>

                    {/* Services payants */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">6. Services payants et abonnements futurs</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Actuellement, l'ensemble des fonctionnalités de GoChineur est accessible gratuitement. Toutefois,
                                <strong className="text-text-primary"> GoChineur se réserve le droit de proposer à l'avenir des services payants ou des formules d'abonnement</strong>
                                offrant des fonctionnalités supplémentaires ou premium.
                            </p>
                            <p>
                                Les Membres seront informés préalablement de la mise en place de tels services. L'utilisation des services payants sera soumise
                                à l'acceptation de conditions générales de vente spécifiques.
                            </p>
                            <p>
                                Les fonctionnalités de base de la Plateforme (consultation des événements, recherche) resteront accessibles gratuitement.
                            </p>
                        </div>
                    </section>

                    {/* Responsabilité */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">7. Limitation de responsabilité</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                GoChineur agit en tant qu'hébergeur du Contenu publié par les Utilisateurs et n'exerce aucun contrôle a priori sur ce Contenu.
                                La responsabilité du Contenu publié incombe exclusivement à son auteur.
                            </p>
                            <p>
                                GoChineur ne garantit pas l'exactitude, la fiabilité ou l'exhaustivité des informations publiées par les Utilisateurs
                                (dates d'événements, adresses, descriptions).
                            </p>
                            <p>
                                GoChineur ne saurait être tenu responsable :
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Des dommages directs ou indirects résultant de l'utilisation de la Plateforme</li>
                                <li>De l'annulation, du report ou de la modification d'un événement publié par un Organisateur</li>
                                <li>Des litiges entre Utilisateurs</li>
                                <li>De la perte de données ou de l'interruption temporaire du service</li>
                            </ul>
                        </div>
                    </section>

                    {/* Données personnelles */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">8. Protection des données personnelles</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                GoChineur s'engage à protéger vos données personnelles conformément au RGPD et à la loi Informatique et Libertés.
                            </p>
                            <p>
                                Les données collectées via Google (nom, email, photo de profil) sont utilisées uniquement pour :
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>La création et la gestion de votre compte</li>
                                <li>L'affichage de votre profil public (pseudo, photo)</li>
                                <li>L'amélioration de nos services</li>
                            </ul>
                            <p>
                                Vos données ne sont jamais vendues à des tiers. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données
                                en nous contactant à <a href="mailto:contact@gochineur.fr" className="text-primary hover:text-primary-hover">contact@gochineur.fr</a>.
                            </p>
                        </div>
                    </section>

                    {/* Résiliation */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">9. Résiliation</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                GoChineur se réserve le droit de suspendre ou de supprimer le compte de tout Membre qui ne respecterait pas les présentes CGU,
                                sans préavis ni indemnité.
                            </p>
                            <p>
                                Vous pouvez résilier votre compte à tout moment en supprimant votre compte depuis votre espace personnel.
                            </p>
                        </div>
                    </section>

                    {/* Droit applicable */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">10. Droit applicable et juridiction</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Les présentes CGU sont régies par le droit français. Tout litige relatif à l'interprétation ou à l'exécution des présentes
                                sera soumis aux tribunaux français compétents.
                            </p>
                        </div>
                    </section>

                    {/* Contact */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-primary mb-4">11. Contact</h2>
                        <div className="text-text-secondary space-y-3">
                            <p>
                                Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse :
                                <a href="mailto:contact@gochineur.fr" className="text-primary hover:text-primary-hover ml-1">contact@gochineur.fr</a>
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

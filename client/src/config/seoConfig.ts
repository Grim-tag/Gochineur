export const CATEGORY_CONFIG: Record<string, {
    eventType: string;
    h1: string;
    metaTitle: string;
    metaDescription: string;
    seoText: string;
}> = {
    'vide-grenier': {
        eventType: 'Vide-Grenier',
        h1: 'Vide-Greniers et Brocantes : L\'agenda autour de moi',
        metaTitle: 'Vide-Greniers autour de moi - Agenda complet - GoChineur',
        metaDescription: 'Trouvez tous les vide-greniers près de chez vous. Agenda complet et à jour des vide-greniers en France avec dates, horaires et localisation.',
        seoText: 'Bienvenue sur GoChineur, l\'agenda national des vide-greniers et vide-garages. Nous centralisons tous les événements pour vous permettre de trouver instantanément les meilleures affaires autour de vous. Que vous soyez en ville ou à la campagne, notre filtre de proximité vous affiche tous les vide-greniers ouverts ce week-end ou aujourd\'hui. Ne perdez plus votre temps à chercher : planifiez votre circuit de chine sur notre carte. Envie de monter en gamme ? Découvrez notre agenda des brocantes et des marchés aux puces.'
    },
    'brocante': {
        eventType: 'Brocante',
        h1: 'Brocantes et Antiquités : Où chiner autour de moi ?',
        metaTitle: 'Brocantes et Antiquités autour de moi - GoChineur',
        metaDescription: 'Découvrez toutes les brocantes et foires aux antiquités près de chez vous. Agenda complet des brocantes en France pour les passionnés de chine.',
        seoText: 'Pour les collectionneurs et les passionnés de belles pièces, GoChineur est le guide indispensable des brocantes et salons d\'antiquaires. Contrairement au vide-grenier de quartier, la brocante est l\'endroit idéal pour dénicher du mobilier ancien et des objets de valeur. Notre agenda vous permet de localiser les événements de qualité autour de moi et dans les grandes villes. Utilisez nos filtres pour trouver le prochain marché professionnel où vous ferez des trouvailles d\'exception. Vous cherchez une vente plus décontractée ? Consultez notre agenda vide-greniers.'
    },
    'puces': {
        eventType: 'Puces et Antiquités',
        h1: 'Marchés aux Puces : Trouvailles et Antiquités autour de moi',
        metaTitle: 'Marchés aux Puces autour de moi - Trouvailles - GoChineur',
        metaDescription: 'Agenda complet des marchés aux puces en France. Trouvez les meilleurs marchés aux puces et ventes d\'antiquités près de chez vous.',
        seoText: 'Le marché aux puces est l\'incontournable de la chine urbaine. GoChineur référence les grandes braderies et les marchés aux puces qui mélangent souvent professionnels et particuliers. Parfait pour une chine intensive et décontractée ! Notre agenda vous affiche tous les événements ouverts ce week-end. Trouvez facilement les puces près de chez vous pour dénicher des antiquités et des objets vintage. Notre outil de carte vous guide directement vers les meilleurs spots. Découvrez aussi nos bourses thématiques pour des recherches spécifiques.'
    },
    'bourse': {
        eventType: 'Bourse',
        h1: 'Bourses aux Collections : Événements autour de moi',
        metaTitle: 'Bourses aux Collections autour de moi - GoChineur',
        metaDescription: 'Trouvez toutes les bourses aux collections près de chez vous : bourses aux jouets, cartes postales, vinyles, BD et plus encore.',
        seoText: 'Spécialisé dans les bourses thématiques, GoChineur vous aide à trouver des articles spécifiques en excellent état. Consultez notre agenda pour les bourses aux jouets, les bourses aux vêtements, ou les ventes d\'articles de puériculture. Ces événements en salle sont parfaits pour les jeunes parents et les collectionneurs d\'articles ciblés. Localisez la bourse la plus proche autour de moi et consultez les horaires. Vous cherchez à vider une maison ? Découvrez notre agenda vide-maisons.'
    },
    'vide-maison': {
        eventType: 'Vide Maison',
        h1: 'Vide-Maisons et Ventes de Succession autour de moi',
        metaTitle: 'Vide-Maisons et Ventes de Succession - GoChineur',
        metaDescription: 'Agenda des vide-maisons et ventes de succession en France. Trouvez les meilleures opportunités d\'achat près de chez vous.',
        seoText: 'Le vide-maison est la chasse au trésor ultime, offrant une chance unique d\'acheter des objets du quotidien, du mobilier et des collections entières directement à la source. GoChineur référence les ventes de succession et les vide-maisons partout en France. Utilisez notre agenda pour trouver les vide-maisons autour de moi qui se déroulent ce week-end. Chaque vide-maison est éphémère : planifiez votre visite rapidement pour ne pas manquer les bonnes affaires. Explorez également nos événements troc et échange.'
    },
    'troc': {
        eventType: 'Troc',
        h1: 'Troc et Échange : Événements gratuits autour de moi',
        metaTitle: 'Troc et Échange gratuit autour de moi - GoChineur',
        metaDescription: 'Découvrez tous les événements de troc et d\'échange gratuit en France. Donnez une seconde vie à vos objets et faites des économies.',
        seoText: 'Participez à l\'économie circulaire avec l\'agenda des événements de troc et d\'échange de GoChineur. Trouvez facilement les bourses d\'échange, les foires au troc, ou les initiatives de réemploi près de chez vous. Ces événements sont idéaux pour donner une seconde vie à vos objets (vêtements, livres, matériel de sport) sans transaction financière. Notre plateforme vous guide vers les événements de troc autour de moi pour une journée conviviale et écologique. Si vous préférez vendre, consultez notre agenda vide-greniers.'
    },
    'vide-greniers-brocantes': {
        eventType: 'tous',
        h1: 'Vide-greniers, Brocantes et Bourses : L\'agenda complet',
        metaTitle: 'Agenda complet Vide-Greniers et Brocantes - GoChineur',
        metaDescription: 'Retrouvez tous les événements : vide-greniers, brocantes, bourses, vide-maisons et troc partout en France.',
        seoText: 'GoChineur est l\'agenda de référence pour tous les chineurs. Que vous cherchiez un vide-grenier, une brocante, un marché aux puces ou une bourse de collectionneurs, vous trouverez ici tous les événements référencés. Utilisez notre carte interactive pour localiser les manifestations autour de vous. Notre agenda complet regroupe toutes les dates pour ne manquer aucune occasion de chiner, que ce soit pour meubler votre intérieur, compléter une collection ou simplement flâner le week-end.'
    }
}

/**
 * Normalise le type d'événement pour uniformiser les variations
 * @param {string} type - Type d'événement à normaliser
 * @returns {string} - Type normalisé
 */
function normalizeEventType(type) {
  if (!type || typeof type !== 'string') {
    return 'Autre';
  }

  // Convertir en minuscules et supprimer les espaces multiples
  const normalized = type.toLowerCase().trim().replace(/\s+/g, ' ');

  // Variations de "Vide-Grenier"
  if (normalized.includes('vide-grenier') || normalized.includes('vide grenier') || normalized === 'videgrenier') {
    return 'Vide-Grenier';
  }

  // Variations de "Brocante"
  if (normalized.includes('brocante')) {
    return 'Brocante';
  }

  // Variations de "Puces et Antiquités"
  if (normalized.includes('puces') || normalized.includes('antiquités') || normalized.includes('antiquites') ||
    normalized.includes('antiquaire') || normalized.includes('marche aux puces') || normalized.includes('marché aux puces')) {
    return 'Puces et Antiquités';
  }

  // Variations de "Bourse"
  if (normalized.includes('bourse')) {
    return 'Bourse';
  }

  // Variations de "Vide Maison"
  if (normalized.includes('vide maison') || normalized.includes('vide-maison')) {
    return 'Vide Maison';
  }

  // Variations de "Troc"
  if (normalized.includes('troc')) {
    return 'Troc';
  }

  // Variations de "Braderie" (assimilée à Brocante)
  if (normalized.includes('braderie')) {
    return 'Brocante';
  }

  // Variations de "Antiquaire" (assimilée à Puces et Antiquités)
  if (normalized.includes('antiquaire')) {
    return 'Puces et Antiquités';
  }

  // Par défaut, retourner "Autre" (mais ces événements seront rejetés par le filtre strict)
  return 'Autre';
}

/**
 * Fonction de transformation des événements DATAtourisme depuis fichiers JSON locaux (format Apidae) vers GoChineur
 */
function transformDataTourismeEventFromFile(apidaeEvent) {
  // Extraction de l'identifiant Apidae (nettoyage pour URL propre)
  // Format original : https://data.datatourisme.fr/23/uuid
  // Nouveau format : DT_uuid
  let idApidae = apidaeEvent['@id'] || `DT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (idApidae.startsWith('https://data.datatourisme.fr/')) {
    const parts = idApidae.split('/');
    const uuid = parts[parts.length - 1];
    idApidae = `DT_${uuid}`;
  }

  // Nom : rdfs:label.fr[0]
  const name = apidaeEvent['rdfs:label']?.['fr']?.[0] ||
    apidaeEvent['rdfs:label']?.['fr'] ||
    'Événement sans nom';

  // Description : hasDescription[0].shortDescription.fr[0] ou rdfs:comment.fr[0]
  let description = '';
  if (apidaeEvent['hasDescription']?.[0]?.['shortDescription']?.['fr']?.[0]) {
    description = apidaeEvent['hasDescription'][0]['shortDescription']['fr'][0];
  } else if (apidaeEvent['rdfs:comment']?.['fr']?.[0]) {
    description = apidaeEvent['rdfs:comment']['fr'][0];
  }

  // Type d'événement - Détection depuis le nom et la description
  let type = 'autre';
  const searchText = `${name} ${description}`.toLowerCase();

  // Vérification des types dans @type
  const eventTypes = apidaeEvent['@type'] || [];
  const typeStr = Array.isArray(eventTypes) ? eventTypes.join(' ').toLowerCase() : String(eventTypes).toLowerCase();

  // Détection du type (avec ajout de troc, braderie, antiquaire)
  if (searchText.includes('vide-grenier') || searchText.includes('vide grenier') || typeStr.includes('vide-grenier')) {
    type = 'Vide-Grenier';
  } else if (searchText.includes('brocante') || typeStr.includes('brocante')) {
    type = 'Brocante';
  } else if (searchText.includes('braderie') || typeStr.includes('braderie')) {
    type = 'Brocante'; // Braderie = type de brocante
  } else if (searchText.includes('bourse') || typeStr.includes('bourse')) {
    type = 'Bourse';
  } else if (searchText.includes('vide-maison') || searchText.includes('vide maison') || typeStr.includes('vide maison')) {
    type = 'Vide Maison';
  } else if (searchText.includes('troc') || typeStr.includes('troc')) {
    type = 'Troc';
  } else if (searchText.includes('puces') || searchText.includes('antiquités') || searchText.includes('antiquites') ||
    searchText.includes('antiquaire') || typeStr.includes('puces') || typeStr.includes('antiquités') || typeStr.includes('antiquaire')) {
    type = 'Puces et Antiquités';
  } else if (searchText.includes('marché aux puces') || searchText.includes('marche aux puces')) {
    type = 'Puces et Antiquités';
  }

  // Normaliser le type détecté
  type = normalizeEventType(type);

  // FILTRE D'EXCLUSION : Rejeter immédiatement les événements hors-sujet
  // Liste des mots-clés à exclure (carrière, emploi, business, etc.)
  const excludeKeywords = [
    // Carrière / Emploi / Recrutement
    'career', 'carriere', 'carrière',
    'entrepreneurship', 'entrepreneur',
    'emploi', 'job', 'recrutement', 'recruitment',
    'salon de l\'emploi', 'forum emploi', 'job fair',
    'business', 'startup',
    // Événements culturels non pertinents
    'concert', 'spectacle', 'show',
    'conférence', 'conference', 'séminaire', 'seminar',
    'formation professionnelle', 'training',
    // Autres événements hors-sujet
    'exposition d\'art', 'art exhibition',
    'salon professionnel' // Sauf si contient aussi un mot-clé pertinent
  ];

  // Vérifier si l'événement contient un mot-clé d'exclusion
  const fullSearchTextForExclusion = `${searchText} ${typeStr}`;
  const hasExcludeKeyword = excludeKeywords.some(keyword => fullSearchTextForExclusion.includes(keyword));

  // Si un mot-clé d'exclusion est trouvé, rejeter immédiatement
  if (hasExcludeKeyword) {
    return null; // Événement hors-sujet, rejeter immédiatement
  }

  // Validation ULTRA-STRICTE : ignorer TOUS les événements qui ne sont PAS des événements de "chine"
  // Liste exhaustive des mots-clés pertinents (selon spécifications)
  const chineKeywords = [
    'vide-grenier', 'vide grenier', 'videgrenier',
    'brocante',
    'troc',
    'puces', 'antiquités', 'antiquites', 'antiquaire', 'marché aux puces', 'marche aux puces',
    'bourse',
    'vide-maison', 'vide maison', 'videmaison',
    'braderie',
    'foire à tout', 'foire a tout',
    'réderie', 'rederie',
    'bric-à-brac', 'bric a brac', 'bricabrac',
    'déballage', 'deballage',
    'vide-dressing', 'vide dressing',
    'vide-poussette', 'vide poussette'
  ];

  // Vérifier si l'événement contient au moins un mot-clé pertinent dans le titre, la description OU le type
  const fullSearchText = `${searchText} ${typeStr}`;
  const hasChineKeyword = chineKeywords.some(keyword => fullSearchText.includes(keyword));

  // REJETER TOUS les événements qui n'ont pas au moins un mot-clé pertinent
  // Peu importe le type détecté, si aucun mot-clé pertinent n'est trouvé, rejeter
  if (!hasChineKeyword) {
    return null; // Événement non pertinent, rejeter immédiatement
  }

  // Si le type est "Autre" mais qu'un mot-clé pertinent existe, le garder mais normaliser
  // (la normalisation se fera plus tard)

  // Coordonnées GPS : isLocatedAt[0].schema:geo.schema:latitude et schema:longitude
  // CRITIQUE: Convertir explicitement en nombres et valider
  let latitude = null;
  let longitude = null;

  if (apidaeEvent['isLocatedAt']?.[0]?.['schema:geo']) {
    const geo = apidaeEvent['isLocatedAt'][0]['schema:geo'];
    const latValue = parseFloat(geo['schema:latitude']);
    const lonValue = parseFloat(geo['schema:longitude']);

    // Validation stricte : doit être un nombre valide dans les plages acceptables
    if (!isNaN(latValue) && latValue >= -90 && latValue <= 90) {
      latitude = latValue;
    }
    if (!isNaN(lonValue) && lonValue >= -180 && lonValue <= 180) {
      longitude = lonValue;
    }
  }

  // Adresse : isLocatedAt[0].schema:address[0]
  let city = '';
  let postalCode = '';
  let address = '';

  if (apidaeEvent['isLocatedAt']?.[0]?.['schema:address']?.[0]) {
    const addr = apidaeEvent['isLocatedAt'][0]['schema:address'][0];
    city = addr['schema:addressLocality'] || '';
    postalCode = addr['schema:postalCode'] || '';
    const streetAddress = Array.isArray(addr['schema:streetAddress'])
      ? addr['schema:streetAddress'][0]
      : (addr['schema:streetAddress'] || '');
    address = streetAddress ? `${streetAddress}, ${postalCode} ${city}`.trim() : `${postalCode} ${city}`.trim();
  }

  // Dates : schema:startDate et schema:endDate (tableaux) ou takesPlaceAt[].startDate/endDate
  let date_debut = null;
  let date_fin = null;
  let date = null;
  let startTime = null;

  // Priorité : takesPlaceAt pour les dates avec heures
  if (apidaeEvent['takesPlaceAt'] && Array.isArray(apidaeEvent['takesPlaceAt']) && apidaeEvent['takesPlaceAt'].length > 0) {
    const firstPeriod = apidaeEvent['takesPlaceAt'][0];
    if (firstPeriod['startDate']) {
      date_debut = firstPeriod['startDate'];
      startTime = firstPeriod['startTime'] || null;
      date = date_debut;
    }
    if (firstPeriod['endDate']) {
      date_fin = firstPeriod['endDate'];
    }
  } else if (apidaeEvent['schema:startDate'] && Array.isArray(apidaeEvent['schema:startDate']) && apidaeEvent['schema:startDate'].length > 0) {
    date_debut = apidaeEvent['schema:startDate'][0];
    date = date_debut;
  }

  if (apidaeEvent['schema:endDate'] && Array.isArray(apidaeEvent['schema:endDate']) && apidaeEvent['schema:endDate'].length > 0) {
    date_fin = apidaeEvent['schema:endDate'][0];
  } else if (date_debut && !date_fin) {
    date_fin = date_debut;
  }

  // Correctif UTC : Si l'heure de début est minuit UTC (T00:00:00Z) ou manquante, mettre 6h00 locale
  if (date_debut) {
    try {
      let dateObj = new Date(date_debut + 'T00:00:00Z');

      if (startTime) {
        const [hours, minutes, seconds] = startTime.split(':');
        if (parseInt(hours) === 0 && parseInt(minutes) === 0 && (!seconds || parseInt(seconds) === 0)) {
          dateObj.setHours(6, 0, 0, 0);
        } else {
          dateObj.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, parseInt(seconds) || 0, 0);
        }
      } else {
        dateObj.setHours(6, 0, 0, 0);
      }

      date_debut = dateObj.toISOString();
      date = date_debut.split('T')[0];
    } catch (e) {
      console.warn(`Erreur de parsing de date pour l'événement ${idApidae}: ${date_debut}`, e.message);
    }
  }

  // Date de fin avec heure de fin si disponible
  if (date_fin) {
    try {
      let dateObj = new Date(date_fin);

      if (apidaeEvent['takesPlaceAt']?.[0]?.['endTime']) {
        const [hours, minutes, seconds] = apidaeEvent['takesPlaceAt'][0]['endTime'].split(':');
        dateObj.setHours(parseInt(hours) || 23, parseInt(minutes) || 59, parseInt(seconds) || 59, 999);
      } else {
        dateObj.setHours(23, 59, 59, 999);
      }

      date_fin = dateObj.toISOString();
    } catch (e) {
      console.warn(`Erreur de parsing de date de fin pour l'événement ${idApidae}: ${date_fin}`);
    }
  }

  // Validation des données essentielles
  if (!latitude || !longitude) {
    return null;
  }
  if (!date_debut) {
    return null;
  }
  if (!name || name === 'Événement sans nom') {
    return null;
  }

  // CRITIQUE: S'assurer que latitude et longitude sont des nombres (pas des chaînes)
  const latNumber = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  const lonNumber = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  // --- NOUVEAU : Extraction des données enrichies ---

  // Contact
  let telephone = '';
  let email = '';
  let website = '';

  if (apidaeEvent['hasContact'] && Array.isArray(apidaeEvent['hasContact'])) {
    const contact = apidaeEvent['hasContact'][0];
    if (contact['schema:telephone'] && Array.isArray(contact['schema:telephone'])) {
      telephone = contact['schema:telephone'][0];
    }
    if (contact['schema:email'] && Array.isArray(contact['schema:email'])) {
      email = contact['schema:email'][0];
    }
    if (contact['foaf:homepage'] && Array.isArray(contact['foaf:homepage'])) {
      website = contact['foaf:homepage'][0];
    }
  }

  // Prix / Offres
  let prix_visiteur = '';
  if (apidaeEvent['schema:offers'] && Array.isArray(apidaeEvent['schema:offers'])) {
    const offer = apidaeEvent['schema:offers'][0];
    if (offer['schema:price'] && offer['schema:priceCurrency']) {
      const price = parseFloat(offer['schema:price']);
      if (price === 0) {
        prix_visiteur = 'Gratuit';
      } else {
        prix_visiteur = `${price} ${offer['schema:priceCurrency']}`;
      }
    } else if (offer['schema:description'] && offer['schema:description']['fr']) {
      prix_visiteur = offer['schema:description']['fr'][0];
    }
  }

  // Audience (pour description exposants vs visiteurs)
  // DataTourisme ne sépare pas toujours clairement, mais on peut chercher dans 'hasAudience'
  // Pour l'instant on met tout dans description, mais on pourrait affiner si on trouve des champs spécifiques.

  return {
    id: idApidae,
    id_source: idApidae,
    source_name: 'DATAtourisme',
    name: name,
    type: type,
    date: date,
    date_debut: date_debut,
    date_fin: date_fin || date_debut,
    city: city,
    postalCode: postalCode,
    address: address,
    latitude: !isNaN(latNumber) ? latNumber : null,
    longitude: !isNaN(lonNumber) ? lonNumber : null,
    description: description,
    distance: 0,
    statut_validation: "pending_review",
    date_creation: new Date().toISOString(),
    // Nouveaux champs
    telephone: telephone,
    email: email,
    website: website,
    prix_visiteur: prix_visiteur
  };
}

/**
 * Fonction de calcul de distance (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Transforme un événement OED (GeoJSON Feature) vers le format GoChineur
 * @param {Object} oedFeature - Feature GeoJSON de l'OED
 * @returns {Object|null} - Événement GoChineur ou null si invalide
 */
function transformOEDEvent(oedFeature) {
  try {
    // Extraction des propriétés OED
    const properties = oedFeature.properties || {};
    const geometry = oedFeature.geometry || {};

    // Nom de l'événement
    const name = properties.name || properties.title || properties.what || 'Événement sans nom';

    // Description
    const description = properties.description || properties.text || '';

    // Coordonnées GPS depuis geometry.coordinates (GeoJSON: [longitude, latitude])
    // CRITIQUE: Convertir explicitement en nombres et valider
    let latitude = null;
    let longitude = null;
    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
      const lonValue = parseFloat(geometry.coordinates[0]);
      const latValue = parseFloat(geometry.coordinates[1]);

      // Validation stricte : doit être un nombre valide dans les plages acceptables
      if (!isNaN(latValue) && latValue >= -90 && latValue <= 90) {
        latitude = latValue;
      }
      if (!isNaN(lonValue) && lonValue >= -180 && lonValue <= 180) {
        longitude = lonValue;
      }
    }

    // Dates
    let date_debut = null;
    let date_fin = null;
    let date = null;

    if (properties.when) {
      // Format OED: "when" peut être une date ISO ou un objet avec start/stop
      if (typeof properties.when === 'string') {
        date_debut = properties.when;
        date = date_debut.split('T')[0];
      } else if (properties.when.start) {
        date_debut = properties.when.start;
        date = date_debut.split('T')[0];
      }

      if (properties.when.stop || properties.when.end) {
        date_fin = properties.when.stop || properties.when.end;
      } else if (date_debut) {
        date_fin = date_debut;
      }
    } else if (properties.start) {
      date_debut = properties.start;
      date = date_debut.split('T')[0];
      date_fin = properties.stop || properties.end || date_debut;
    }

    // Adresse et localisation
    let city = '';
    let postalCode = '';
    let address = '';

    if (properties.address) {
      if (typeof properties.address === 'string') {
        address = properties.address;
      } else {
        city = properties.address.city || properties.address.locality || properties.address.town || '';
        postalCode = properties.address.postal_code || properties.address.postcode || '';
        const street = properties.address.street || properties.address.street_address || '';
        address = street ? `${street}, ${postalCode} ${city}`.trim() : `${postalCode} ${city}`.trim();
      }
    }

    // Type d'événement depuis "what" (avec ajout de troc, braderie, antiquaire)
    let type = 'Autre';
    if (properties.what) {
      const whatLower = properties.what.toLowerCase();
      if (whatLower.includes('vide-grenier') || whatLower.includes('vide grenier')) {
        type = 'Vide-Grenier';
      } else if (whatLower.includes('brocante')) {
        type = 'Brocante';
      } else if (whatLower.includes('braderie')) {
        type = 'Brocante'; // Braderie = type de brocante
      } else if (whatLower.includes('bourse')) {
        type = 'Bourse';
      } else if (whatLower.includes('vide-maison') || whatLower.includes('vide maison')) {
        type = 'Vide Maison';
      } else if (whatLower.includes('troc')) {
        type = 'Troc';
      } else if (whatLower.includes('puces') || whatLower.includes('antiquités') || whatLower.includes('antiquites') || whatLower.includes('antiquaire')) {
        type = 'Puces et Antiquités';
      } else if (whatLower.includes('marché aux puces') || whatLower.includes('marche aux puces')) {
        type = 'Puces et Antiquités';
      }
    }

    // Normaliser le type
    type = normalizeEventType(type);

    // Validation ULTRA-STRICTE : ignorer TOUS les événements qui ne sont PAS des événements de "chine"
    const searchText = `${name} ${description} ${properties.what || ''}`.toLowerCase();

    // FILTRE D'EXCLUSION : Rejeter immédiatement les événements hors-sujet
    // Liste des mots-clés à exclure (carrière, emploi, business, etc.)
    const excludeKeywords = [
      // Carrière / Emploi / Recrutement
      'career', 'carriere', 'carrière',
      'entrepreneurship', 'entrepreneur',
      'emploi', 'job', 'recrutement', 'recruitment',
      'salon de l\'emploi', 'forum emploi', 'job fair',
      'business', 'startup',
      // Événements culturels non pertinents
      'concert', 'spectacle', 'show',
      'conférence', 'conference', 'séminaire', 'seminar',
      'formation professionnelle', 'training',
      // Autres événements hors-sujet
      'exposition d\'art', 'art exhibition',
      'salon professionnel'
    ];

    // Vérifier si l'événement contient un mot-clé d'exclusion
    const hasExcludeKeyword = excludeKeywords.some(keyword => searchText.includes(keyword));

    // Si un mot-clé d'exclusion est trouvé, rejeter immédiatement
    if (hasExcludeKeyword) {
      return null; // Événement hors-sujet, rejeter immédiatement
    }

    // REJET EXPLICITE des déchets OED connus (traffic, culture générique sans titre, etc.)
    if (name.startsWith('traffic.') || name.startsWith('culture.') ||
      (properties.what && (properties.what.startsWith('traffic.') || properties.what.startsWith('culture.')))) {
      // Sauf si le titre contient explicitement un mot-clé fort
      const strongKeywords = ['brocante', 'vide-grenier', 'vide grenier', 'puces', 'foire à tout'];
      const hasStrongKeyword = strongKeywords.some(k => name.toLowerCase().includes(k));
      if (!hasStrongKeyword) {
        return null;
      }
    }

    // Liste exhaustive des mots-clés pertinents (Mise à jour avec les termes régionaux)
    const chineKeywords = [
      'vide-grenier', 'vide grenier', 'videgrenier',
      'brocante',
      'troc',
      'puces', 'antiquités', 'antiquites', 'antiquaire', 'marché aux puces', 'marche aux puces',
      'bourse',
      'vide-maison', 'vide maison', 'videmaison',
      'braderie',
      'foire à tout', 'foire a tout',
      'réderie', 'rederie',
      'bric-à-brac', 'bric a brac', 'bricabrac',
      'déballage', 'deballage',
      'vide-dressing', 'vide dressing',
      'vide-poussette', 'vide poussette'
    ];

    // Vérifier si l'événement contient au moins un mot-clé pertinent dans le titre ou la description
    const hasChineKeyword = chineKeywords.some(keyword => searchText.includes(keyword));

    // REJETER TOUS les événements qui n'ont pas au moins un mot-clé pertinent
    if (!hasChineKeyword) {
      return null; // Événement non pertinent, rejeter immédiatement
    }

    // Validation des données essentielles
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return null;
    }
    if (!date_debut) {
      return null;
    }
    if (!name || name === 'Événement sans nom') {
      return null;
    }

    // Génération d'un ID unique pour l'OED
    const oedId = oedFeature.id || `OED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // CRITIQUE: S'assurer que latitude et longitude sont des nombres (pas des chaînes)
    const latNumber = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    const lonNumber = typeof longitude === 'number' ? longitude : parseFloat(longitude);

    return {
      id: oedId,
      id_source: oedId,
      source_name: 'Open Event Database',
      name: name.trim(),
      type: type,
      date: date,
      date_debut: date_debut,
      date_fin: date_fin || date_debut,
      city: city,
      postalCode: postalCode,
      address: address,
      latitude: !isNaN(latNumber) ? latNumber : null, // Garantir que c'est un nombre ou null
      longitude: !isNaN(lonNumber) ? lonNumber : null, // Garantir que c'est un nombre ou null
      description: description.trim(),
      distance: 0,
      statut_validation: 'pending_review', // Tous les événements importés nécessitent une validation manuelle
      date_creation: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Erreur lors de la transformation d\'un événement OED:', error.message);
    return null;
  }
}

module.exports = {
  transformDataTourismeEventFromFile,
  calculateDistance,
  normalizeEventType,
  transformOEDEvent
};


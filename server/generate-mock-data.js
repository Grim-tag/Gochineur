const fs = require('fs');
const path = require('path');

const events = [];
const cities = [
  'Bayonne', 'Anglet', 'Biarritz', 'Dax', 'Capbreton', 'Hossegor', 'Mimizan', 'Soustons', 
  'Seignosse', 'Labenne', 'Tarnos', 'Boucau', 'Bidart', 'Guéthary', 'Arcachon', 
  'La Teste-de-Buch', 'Biscarrosse', 'Parentis-en-Born', 'Ychoux', 'Lit-et-Mixe', 
  'Vieux-Boucau', 'Messanges', 'Léon', 'Moliets-et-Maa', 'Castets', 'Linxe', 
  'Saint-Vincent-de-Tyrosse', 'Saubion', 'Tosse', 'Ondres', 'Saint-Martin-de-Seignanx', 
  'Lahonce', 'Urt', 'Ustaritz', 'Cambo-les-Bains', 'Espelette', 'Itxassou', 'Larressore', 
  'Hasparren', 'Macaye', 'Mendionde', 'Ayherre', 'Bonloc', 'Briscous', 'Bardos', 
  'Guiche', 'Sames', 'Hendaye', 'Urrugne', 'Ciboure'
];

const types = ['Vide-Grenier', 'Brocante', 'Vide Maison', 'Puces et Antiquités'];

const coords = {
  'Bayonne': [43.4929, -1.4748],
  'Anglet': [43.4853, -1.5186],
  'Biarritz': [43.4832, -1.5596],
  'Dax': [43.7077, -1.0536],
  'Capbreton': [43.6419, -1.4281],
  'Hossegor': [43.6533, -1.3972],
  'Mimizan': [44.2044, -1.2289],
  'Soustons': [43.7528, -1.3278],
  'Seignosse': [43.6889, -1.3700],
  'Labenne': [43.5944, -1.4250],
  'Tarnos': [43.5417, -1.4611],
  'Boucau': [43.5250, -1.4861],
  'Bidart': [43.4375, -1.5917],
  'Guéthary': [43.4250, -1.6028],
  'Arcachon': [44.6583, -1.1681],
  'La Teste-de-Buch': [44.6306, -1.1444],
  'Biscarrosse': [44.3944, -1.1639],
  'Parentis-en-Born': [44.3528, -1.0750],
  'Ychoux': [44.3306, -0.9556],
  'Lit-et-Mixe': [44.0333, -1.2639],
  'Vieux-Boucau': [43.7861, -1.4000],
  'Messanges': [43.8167, -1.3833],
  'Léon': [43.8778, -1.3000],
  'Moliets-et-Maa': [43.8500, -1.3667],
  'Castets': [43.8833, -1.1500],
  'Linxe': [43.9167, -1.2500],
  'Saint-Vincent-de-Tyrosse': [43.6667, -1.3000],
  'Saubion': [43.6667, -1.3500],
  'Tosse': [43.6833, -1.3333],
  'Ondres': [43.5667, -1.4667],
  'Saint-Martin-de-Seignanx': [43.5417, -1.3833],
  'Lahonce': [43.4833, -1.3833],
  'Urt': [43.5000, -1.3000],
  'Ustaritz': [43.4000, -1.4500],
  'Cambo-les-Bains': [43.3583, -1.4000],
  'Espelette': [43.3417, -1.4500],
  'Itxassou': [43.3250, -1.4000],
  'Larressore': [43.3083, -1.4500],
  'Hasparren': [43.3833, -1.3000],
  'Macaye': [43.3417, -1.3167],
  'Mendionde': [43.3250, -1.2833],
  'Ayherre': [43.3083, -1.2500],
  'Bonloc': [43.2917, -1.2667],
  'Briscous': [43.2750, -1.2333],
  'Bardos': [43.2583, -1.2000],
  'Guiche': [43.2417, -1.2167],
  'Sames': [43.2250, -1.1833],
  'Hendaye': [43.3583, -1.7750],
  'Urrugne': [43.3667, -1.7000],
  'Ciboure': [43.3833, -1.6750]
};

const baseDate = new Date('2025-11-15');

for (let i = 0; i < 50; i++) {
  const city = cities[i % cities.length];
  const [lat, lon] = coords[city] || [43.5716, -1.2780];
  const eventDate = new Date(baseDate);
  eventDate.setDate(baseDate.getDate() + Math.floor(i / 2));
  
  const dateStr = eventDate.toISOString().split('T')[0];
  const hours = 8 + (i % 3);
  const endHours = hours + 10;
  
  events.push({
    id_source: `OD_${i + 1}`,
    source_name: i % 2 === 0 ? 'DATAtourisme' : 'OpenData Paris',
    type_evenement: types[i % types.length],
    nom_manifestation: `${types[i % types.length]} de ${city}`,
    description_courte: `Grand ${types[i % types.length].toLowerCase()} dans ${city}. Plus de ${100 + i * 5} exposants.`,
    date_debut: `${dateStr}T${String(hours).padStart(2, '0')}:00:00+01:00`,
    date_fin: `${dateStr}T${String(endHours).padStart(2, '0')}:00:00+01:00`,
    lieu: {
      adresse: `Place principale, ${city}`,
      code_postal: String(64000 + i),
      ville: city,
      coordonnees: { lat, lon }
    }
  });
}

const outputPath = path.join(__dirname, 'opendata_source_mock.json');
fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
console.log(`✅ Fichier créé avec ${events.length} événements`);
console.log(`📅 Dates de ${events[0].date_debut.split('T')[0]} à ${events[events.length - 1].date_debut.split('T')[0]}`);






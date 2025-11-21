const express = require('express');
const router = express.Router();
const geoData = require('../config/geo-data.json');

module.exports = function () {
    router.get('/sitemap.xml', (req, res) => {
        try {
            const baseUrl = 'https://gochineur.fr';
            const today = new Date().toISOString().split('T')[0];

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

            // Pages statiques
            const staticPages = [
                xml += '  </url>\n';
        });

    // Pages Villes
    geoData.cities.forEach(city => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/brocantes/${city.slug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
} catch (error) {
    console.error('Erreur génération sitemap:', error);
    res.status(500).send('Erreur génération sitemap');
}
    });

return router;
};

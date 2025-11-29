const express = require('express');
const router = express.Router();
const geoData = require('../config/geo-data.json');
const logger = require('../config/logger');

module.exports = function () {
    router.get('/sitemap.xml', (req, res) => {
        try {
            const baseUrl = 'https://gochineur.fr';
            const today = new Date().toISOString().split('T')[0];

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

            const staticPages = [
                { url: '/', priority: '1.0' },
                { url: '/vide-grenier', priority: '0.95' },
                { url: '/brocante', priority: '0.95' },
                { url: '/puces', priority: '0.95' },
                { url: '/bourse', priority: '0.95' },
                { url: '/vide-maison', priority: '0.95' },
                { url: '/troc', priority: '0.95' },
                { url: '/login', priority: '0.5' },
                { url: '/soumettre', priority: '0.8' },
                { url: '/mentions-legales', priority: '0.6' },
                { url: '/cgu', priority: '0.6' }
            ];

            staticPages.forEach(page => {
                xml += '  <url>\n';
                xml += '    <loc>' + baseUrl + page.url + '</loc>\n';
                xml += '    <lastmod>' + today + '</lastmod>\n';
                xml += '    <changefreq>daily</changefreq>\n';
                xml += '    <priority>' + page.priority + '</priority>\n';
                xml += '  </url>\n';
            });

            geoData.regions.forEach(region => {
                xml += '  <url>\n';
                xml += '    <loc>' + baseUrl + '/vide-grenier/region/' + region.slug + '</loc>\n';
                xml += '    <lastmod>' + today + '</lastmod>\n';
                xml += '    <changefreq>daily</changefreq>\n';
                xml += '    <priority>0.9</priority>\n';
                xml += '  </url>\n';
            });

            geoData.departments.forEach(dept => {
                xml += '  <url>\n';
                xml += '    <loc>' + baseUrl + '/vide-grenier/' + dept.code + '</loc>\n';
                xml += '    <lastmod>' + today + '</lastmod>\n';
                xml += '    <changefreq>daily</changefreq>\n';
                xml += '    <priority>0.8</priority>\n';
                xml += '  </url>\n';
            });

            geoData.cities.forEach(city => {
                const dept = geoData.departments.find(d => d.code === city.department);
                if (dept) {
                    const deptSlug = dept.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    xml += '  <url>\n';
                    xml += '    <loc>' + baseUrl + '/brocantes/' + deptSlug + '/' + city.slug + '</loc>\n';
                    xml += '    <lastmod>' + today + '</lastmod>\n';
                    xml += '    <changefreq>daily</changefreq>\n';
                    xml += '    <priority>0.9</priority>\n';
                    xml += '  </url>\n';
                }
            });

            xml += '</urlset>';

            res.header('Content-Type', 'application/xml');
            res.send(xml);
        } catch (error) {
            logger.error('Erreur generation sitemap:', error);
            res.status(500).send('Erreur generation sitemap');
        }
    });

    return router;
};

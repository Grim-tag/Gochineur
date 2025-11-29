// Helper function to clean product titles
// Removes site names, URLs, and unnecessary text
const cleanTitle = (title) => {
    if (!title) return '';

    // List of site names and patterns to remove
    const sitePatternsToRemove = [
        /Amazon\.com:\s*/gi,
        /Amazon\.fr:\s*/gi,
        /eBay:\s*/gi,
        /GameStop\s*\|\s*/gi,
        /\|\s*GameStop/gi,
        /Walmart:\s*/gi,
        /Best Buy:\s*/gi,
        /Target:\s*/gi,
        /Fnac:\s*/gi,
        /Cdiscount:\s*/gi,
        /Rakuten:\s*/gi,
        /AliExpress:\s*/gi,
        /\bhttps?:\/\/[^\s]+/gi, // Remove URLs
        /www\.[^\s]+/gi, // Remove www domains
        /\.\w{2,3}$/gi, // Remove domain extensions at end (.com, .fr, etc.)
    ];

    let cleaned = title;

    // Remove all site patterns
    sitePatternsToRemove.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Remove extra whitespace and pipes
    cleaned = cleaned
        .replace(/\s*\|\s*/g, ' ') // Replace pipes with space
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .trim();

    // Remove trailing/leading special characters
    cleaned = cleaned.replace(/^[^\w\d]+|[^\w\d]+$/g, '');

    return cleaned;
};

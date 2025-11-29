require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

console.log('--- JWT Debug Script ---');
console.log('Current Working Directory:', process.cwd());
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) {
    console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
    console.log('JWT_SECRET first 3 chars:', process.env.JWT_SECRET.substring(0, 3));
}

const payload = { id: 'test_user', role: 'admin' };
console.log('\nGenerating token...');
try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Token generated successfully.');
    console.log('Token:', token);

    console.log('\nVerifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully.');
    console.log('Decoded:', decoded);
} catch (error) {
    console.error('❌ Error:', error.message);
}
console.log('------------------------');

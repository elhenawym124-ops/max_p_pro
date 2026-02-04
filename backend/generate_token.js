const jwt = require('jsonwebtoken');
const fs = require('fs');

const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const user = {
    userId: 'cmem8azlv004eufakbko0wmn1',
    email: 'ali@ali.com',
    role: 'COMPANY_ADMIN',
    companyId: 'cmem8ayyr004cufakqkcsyn97' // The correct one from DB
};

const token = jwt.sign(user, secret, { expiresIn: '100y' }); // Long expiry for dev

console.log('Generated Token:', token);
fs.writeFileSync('token_utf8.txt', token, { encoding: 'utf8' });
console.log('Token written to token_utf8.txt');

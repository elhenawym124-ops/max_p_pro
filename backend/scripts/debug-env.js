require('dotenv').config();

console.log('--- Environment Debug ---');
console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL);
console.log('Current Working Directory:', process.cwd());
console.log('__dirname:', __dirname);

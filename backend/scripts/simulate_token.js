const jwt = require('jsonwebtoken');
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
    const email = 'mokhtar@mokhtar.com';
    console.log(`🔍 Simulating login for: ${email}`);

    try {
        await initializeSharedDatabase();

        const user = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.findUnique({
                where: { email: email.toLowerCase() },
            });
        });

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('✅ Generated Token Payload:');
        console.log(JSON.stringify(tokenPayload, null, 2));

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('✅ Decoded Token:');
        console.log(JSON.stringify(decoded, null, 2));

    } catch (error) {
        console.error('❌ Error during simulation:', error);
    }
}

main();

const axios = require('axios');

async function verifyAPI() {
    try {
        const response = await axios.get('https://maxp-ai.pro/api/v1/orders-new/simple', {
            params: { limit: 5 },
            headers: {
                // I need a token here, but I can't easily get one without login.
                // However, I can check the backend logs or use a simplified script that mocks the request.
            }
        });
        console.log(JSON.stringify(response.data.data[0], null, 2));
    } catch (error) {
        console.error('API call failed (expected if no auth):', error.message);
    }
}

// Instead of calling the API over network (which needs auth),
// I'll just run a node script that calls the route logic if possible,
// OR I'll just rely on the browser tool to see the results.

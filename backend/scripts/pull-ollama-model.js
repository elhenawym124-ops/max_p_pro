const axios = require('axios');

// Helper to pull a model using Ollama API
async function pullModel(modelName) {
    const url = 'https://ollama.maxp.online/api/pull';
    console.log(`⬇️ Requesting Ollama to pull/install: ${modelName}`);
    console.log(`📡 URL: ${url}`);

    try {
        const response = await axios.post(url, {
            name: modelName,
            stream: true // Stream is essential for long downloads
        }, {
            responseType: 'stream'
        });

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.status === 'success') {
                        console.log('\n✅ Download & Verify Complete!');
                    } else if (json.completed && json.total) {
                        const pct = Math.round((json.completed / json.total) * 100);
                        process.stdout.write(`\r⏳ ${json.status}: ${pct}%`);
                    } else {
                        process.stdout.write(`\rℹ️ Status: ${json.status}`);
                    }
                } catch (e) {
                    // Ignore parsing errors for partial chunks
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n🏁 Stream ended.');
        });

    } catch (error) {
        console.error('\n❌ Pull Failed:', error.message);
        if (error.response) {
            console.error('📄 Details:', error.response.data);
        }
    }
}

const modelToPull = process.argv[2] || 'deepscaler:1.5b';
pullModel(modelToPull);

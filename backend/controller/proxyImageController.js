const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const proxyImage = async(req, res) => {
    try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL - only allow specific domains for security
    const allowedDomains = [
      'https://www.maxp-ai.pro',
      'https://scontent.xx.fbcdn.net',  // Facebook CDN
      'https://platform-lookaside.fbsbx.com',  // Facebook platform images
      'https://files.easy-orders.net'  // Easy Orders files
    ];
    
    const isDomainAllowed = allowedDomains.some(domain => url.startsWith(domain));
    
    if (!isDomainAllowed) {
      return res.status(400).json({ error: 'Domain not allowed' });
    }

    //console.log('🖼️ [IMAGE-PROXY] Proxying image:', url);

    // Fetch the image
    const response = await fetch(url);

    if (!response.ok) {
      console.error('❌ [IMAGE-PROXY] Failed to fetch image:', response.status);
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    // Set appropriate headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Pipe the image data
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('❌ [IMAGE-PROXY] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { proxyImage };

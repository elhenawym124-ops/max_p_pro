const express = require('express');
const router = express.Router();

// Test Socket.IO connection and events
router.get('/test-socket', (req, res) => {
  try {
    const socketService = require('../services/socketService');
    const io = socketService.getIO();
    
    if (!io) {
      return res.status(500).json({
        success: false,
        message: 'Socket.IO not initialized'
      });
    }
    
    // Test emit to all connected clients
    io.emit('test_message', {
      message: 'Socket.IO test message',
      timestamp: new Date().toISOString()
    });
    
    // Get connection stats
    const connectedSockets = io.engine.clientsCount;
    
    res.json({
      success: true,
      message: 'Socket.IO test completed',
      stats: {
        connectedClients: connectedSockets,
        testEmitted: true
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Socket.IO test failed',
      error: error.message
    });
  }
});

// Test company-specific emit
router.post('/test-company-emit', (req, res) => {
  try {
    const { companyId, message } = req.body;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID required'
      });
    }
    
    const socketService = require('../services/socketService');
    socketService.emitToCompany(companyId, 'test_company_message', {
      message: message || 'Test company message',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: `Test message sent to company ${companyId}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Company emit test failed',
      error: error.message
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const debugController = require('../controller/debugController');

router.get('/message-queues', debugController.getDebugInfo);
router.get('/ai-errors', debugController.getDebugAiErrors);
router.post('/ai-errors/reset', debugController.postResetAiErrors);
router.get('/env-check', debugController.getDebugEnv);
router.post('/database', debugController.getDebugDataBase);
router.get('/archive-db-check', debugController.getArchiveDbCheck);

module.exports = router;
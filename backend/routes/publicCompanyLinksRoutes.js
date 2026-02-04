const express = require('express');
const router = express.Router();

const companyLinksController = require('../controller/companyLinksController');

// Public: access company links by share token (no auth)
router.get('/company-links/:token', companyLinksController.getPublicCompanyLinksByToken);

module.exports = router;

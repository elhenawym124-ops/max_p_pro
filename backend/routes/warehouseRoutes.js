const express = require('express');
const router = express.Router();
const warehouseController = require('../controller/warehouseController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.get('/', warehouseController.getWarehouses);
router.post('/', warehouseController.createWarehouse);
router.put('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

module.exports = router;

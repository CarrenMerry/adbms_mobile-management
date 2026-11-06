const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventoryList);
router.get('/summary', inventoryController.getInventorySummary);
router.post('/restock', inventoryController.restockProduct);

module.exports = router;

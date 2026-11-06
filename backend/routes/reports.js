const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/sales', reportController.getSalesReport);
router.get('/products', reportController.getProductsReport);
router.get('/customers', reportController.getCustomersReport);
router.get('/employees', reportController.getEmployeesReport);
router.get('/payments', reportController.getPaymentsReport);

module.exports = router;

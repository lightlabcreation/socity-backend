const express = require('express');
const router = express.Router();
const PlatformInvoiceController = require('../controllers/PlatformInvoice.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware.js');

router.get('/', authenticate, authorize(['SUPER_ADMIN']), PlatformInvoiceController.listInvoices);
router.post('/', authenticate, authorize(['SUPER_ADMIN']), PlatformInvoiceController.createInvoice);
router.post('/generate', authenticate, authorize(['SUPER_ADMIN']), PlatformInvoiceController.bulkCreateInvoices);
router.get('/stats', authenticate, authorize(['SUPER_ADMIN']), PlatformInvoiceController.getStats);
router.patch('/:id/status', authenticate, authorize(['SUPER_ADMIN']), PlatformInvoiceController.updateStatus);

module.exports = router;

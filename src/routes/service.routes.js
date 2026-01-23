const express = require('express');
const router = express.Router();
const ServiceCategoryController = require('../controllers/ServiceCategory.controller');
const ServiceInquiryController = require('../controllers/ServiceInquiry.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware.js');

router.get('/categories', authenticate, ServiceCategoryController.listCategories);
router.post('/categories', authenticate, authorize(['SUPER_ADMIN']), ServiceCategoryController.createCategory);
router.put('/categories/:id', authenticate, authorize(['SUPER_ADMIN']), ServiceCategoryController.updateCategory);
router.delete('/categories/:id', authenticate, authorize(['SUPER_ADMIN']), ServiceCategoryController.deleteCategory);

router.get('/inquiries', authenticate, ServiceInquiryController.listInquiries);
router.post('/inquiries', authenticate, ServiceInquiryController.createInquiry);
router.put('/inquiries/:id/assign', authenticate, authorize(['SUPER_ADMIN']), ServiceInquiryController.assignVendor);
router.patch('/inquiries/:id/assign', authenticate, authorize(['SUPER_ADMIN']), ServiceInquiryController.assignVendor);

module.exports = router;

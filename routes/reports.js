const express = require('express');
const router = express.Router();
const { ReportController } = require('../controllers/otherControllers');
const { authMiddleware, checkPermission } = require('../middleware/auth');

const reportController = new ReportController();

router.use(authMiddleware);

router.get('/', reportController.getAll.bind(reportController));
router.post('/', reportController.generate.bind(reportController));

module.exports = router;
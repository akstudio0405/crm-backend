const express = require('express');
const router = express.Router();
const { PipelineController, ReportController, SettingsController } = require('../controllers/otherControllers');
const { authMiddleware, checkPermission } = require('../middleware/auth');

const pipelineController = new PipelineController();
const reportController = new ReportController();
const settingsController = new SettingsController();

router.use(authMiddleware);

// Pipelines
router.get('/', pipelineController.getAll.bind(pipelineController));
router.post('/', checkPermission('manage_settings'), pipelineController.create.bind(pipelineController));
router.put('/:id', checkPermission('manage_settings'), pipelineController.update.bind(pipelineController));
router.post('/:id/stages', checkPermission('manage_settings'), pipelineController.addStage.bind(pipelineController));

// Reports
router.get('/reports', reportController.getAll.bind(reportController));
router.post('/reports', reportController.generate.bind(reportController));

// Settings
router.get('/settings', settingsController.getAll.bind(settingsController));
router.post('/settings', checkPermission('manage_settings'), settingsController.create.bind(settingsController));
router.put('/settings', checkPermission('manage_settings'), settingsController.update.bind(settingsController));

module.exports = router;
const express = require('express');
const router = express.Router();
const { SettingsController } = require('../controllers/otherControllers');
const { authMiddleware, checkPermission } = require('../middleware/auth');

const settingsController = new SettingsController();

router.use(authMiddleware);

router.get('/', settingsController.getAll.bind(settingsController));
router.post('/', checkPermission('manage_settings'), settingsController.create.bind(settingsController));
router.put('/', checkPermission('manage_settings'), settingsController.update.bind(settingsController));

module.exports = router;
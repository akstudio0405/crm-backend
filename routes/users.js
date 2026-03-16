const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, checkPermission } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', userController.getAll);
router.get('/roles', userController.getRoles);
router.get('/permissions', userController.getPermissions);
router.get('/:id', userController.getById);
router.post('/', checkPermission('manage_users'), userController.create);
router.put('/:id', checkPermission('manage_users'), userController.update);
router.delete('/:id', checkPermission('manage_users'), userController.delete);

module.exports = router;

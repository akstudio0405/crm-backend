const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', dealController.getAll);
router.get('/:id', dealController.getById);
router.post('/', dealController.create);
router.put('/:id', dealController.update);
router.delete('/:id', dealController.delete);

module.exports = router;

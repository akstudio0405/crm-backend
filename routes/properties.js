const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', propertyController.getAll);
router.get('/:id', propertyController.getById);
router.post('/', propertyController.create);
router.put('/:id', propertyController.update);
router.delete('/:id', propertyController.delete);

module.exports = router;

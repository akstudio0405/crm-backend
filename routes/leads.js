const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', leadController.getAll);
router.get('/sources', leadController.getSources);
router.get('/stages', leadController.getStages);
router.get('/:id', leadController.getById);
router.post('/', leadController.create);
router.put('/:id', leadController.update);
router.delete('/:id', leadController.delete);
router.post('/:id/convert', leadController.convertToCustomer);

module.exports = router;

const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followupController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', followupController.getAll);
router.get('/upcoming', followupController.getUpcoming);
router.post('/', followupController.create);
router.put('/:id', followupController.update);
router.delete('/:id', followupController.delete);

module.exports = router;

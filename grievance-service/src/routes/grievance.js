const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/grievanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', ctrl.createComplaint);
router.get('/', ctrl.getComplaints);
router.get('/trending', ctrl.getTrending);
router.get('/:id', ctrl.getComplaint);
router.put('/:id/status', authorize('advocate', 'verifier'), ctrl.updateStatus);
router.post('/:id/upvote', ctrl.upvoteComplaint);
router.delete('/:id', ctrl.deleteComplaint);

module.exports = router;

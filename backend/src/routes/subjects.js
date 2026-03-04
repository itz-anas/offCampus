const express = require('express');
const router = express.Router();
const { getAllSubjects, getSubjectById, getSubjectTree, enrollInSubject } = require('../controllers/subjectController');
const { authenticate } = require('../middleware/auth');

// Optional auth - adds user info if token present
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { verifyAccessToken } = require('../utils/jwt');
      req.user = verifyAccessToken(token);
    } catch (e) {
      // Ignore - user just won't have auth context
    }
  }
  next();
}

router.get('/', optionalAuth, getAllSubjects);
router.get('/:id', optionalAuth, getSubjectById);
router.get('/:id/tree', optionalAuth, getSubjectTree);
router.post('/:id/enroll', authenticate, enrollInSubject);

module.exports = router;

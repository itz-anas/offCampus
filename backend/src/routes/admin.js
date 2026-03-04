const express = require('express');
const router = express.Router();
const { upload, importExcel, deleteSubject, togglePublish, getAllSubjectsAdmin } = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/subjects', getAllSubjectsAdmin);
router.post('/import-excel', upload.single('file'), importExcel);
router.delete('/subjects/:id', deleteSubject);
router.patch('/subjects/:id/publish', togglePublish);

module.exports = router;

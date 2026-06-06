const express = require('express');
const router = express.Router();
const { linkRepo, listRepos } = require('../controllers/repoController');

router.post('/link', linkRepo);
router.get('/list', listRepos);

module.exports = router;

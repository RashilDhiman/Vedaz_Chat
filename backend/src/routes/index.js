const express = require('express');
const { loginUser } = require('../controllers/authController');
const { getHistory, sendMessage, getOnlineUsers } = require('../controllers/messageController');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vedaz-chat-server' });
});

router.post('/auth/login', loginUser);

router.get('/messages', requireAuth, getHistory);
router.post('/messages', requireAuth, sendMessage);
router.get('/users/online', requireAuth, getOnlineUsers);

module.exports = router;

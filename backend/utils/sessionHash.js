const crypto = require('crypto');

const createSessionHash = (userId, ip, userAgent) =>
  crypto.createHash('sha256').update(`${userId}:${ip}:${userAgent}`).digest('hex');

module.exports = { createSessionHash };

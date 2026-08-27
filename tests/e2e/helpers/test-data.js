const crypto = require('crypto');

const generateTestUser = () => ({
  name: `Test User ${crypto.randomBytes(4).toString('hex')}`,
  email: `test-${crypto.randomBytes(4).toString('hex')}@example.com`,
  password: 'Password123!',
});

module.exports = {
  generateTestUser,
};

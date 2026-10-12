// Environment for integration tests. Imported before anything that reads config.
process.env.JWT_SECRET = 'integration-test-secret-1234567890';
process.env.MONGODB_URI = 'mongodb://placeholder'; // real URI comes from mongodb-memory-server
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = '';
// Effectively disable spike flagging so it doesn't interfere with payout tests.
process.env.SPIKE_MIN_GAIN = '1000000000';

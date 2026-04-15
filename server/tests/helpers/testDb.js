const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let mongoMemoryServer = null;

function testMongoUri() {
  const base = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/asd-management-system';
  if (base.includes('?')) {
    const [head, query] = base.split('?');
    return `${head}-jest?${query}`;
  }
  return `${base}-jest`;
}

async function connectTestDb() {
  if (mongoose.connection.readyState !== 0) return mongoose.connection.name;

  const explicitUri = process.env.MONGO_URI;
  if (explicitUri) {
    const uri = testMongoUri();
    await mongoose.connect(uri);
    return uri;
  }

  // Default to an in-memory MongoDB for local + CI reliability
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoMemoryServer = await MongoMemoryServer.create();
  const uri = mongoMemoryServer.getUri();
  await mongoose.connect(uri);
  return uri;
}

async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}

module.exports = {
  connectTestDb,
  disconnectTestDb,
};

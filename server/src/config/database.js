const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log('Congrats! MongoDB connected');
  } catch (error) {
    console.log('MongoDB connection Failed!', error);
    process.exit(1);
  }
};

module.exports = connectDB;

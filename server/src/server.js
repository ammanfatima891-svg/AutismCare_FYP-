require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", require("./routes/auth.routes"));

const startServer = async () => {
  try {
    await connectDB();

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log('Server is running on port: ' + port);
    });
  } catch (error) {
    console.log('Error:', error);
  }
};

startServer();

const mongoose = require('mongoose');

const connectDB = async (retryCount = 5) => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
  };

  const attemptConnection = async (attempt) => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, options);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt < retryCount) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptConnection(attempt + 1);
      }
      return false;
    }
  };

  const success = await attemptConnection(1);
  if (!success) {
    console.error('All MongoDB connection attempts failed. Exiting...');
    process.exit(1);
  }

  // Handle connection events
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Retrying connection...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error during MongoDB closure:', err);
      process.exit(1);
    }
  });
};

module.exports = connectDB;

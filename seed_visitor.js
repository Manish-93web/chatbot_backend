const mongoose = require('mongoose');
require('dotenv').config();
const Visitor = require('./src/models/Visitor');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB via', process.env.MONGODB_URI);
    
    try {
        const count = await Visitor.countDocuments();
        console.log(`Current visitor count: ${count}`);

        if (count === 0) {
            console.log('Creating test visitor...');
            await Visitor.create({
                sessionId: 'test-session-' + Date.now(),
                name: 'Test Visitor',
                email: 'test@example.com',
                online: true,
                ipAddress: '127.0.0.1',
                browser: 'Chrome',
                os: 'Windows 10',
                country: 'Localhost',
                city: 'Test City',
                currentPage: '/pricing',
                lastVisit: new Date()
            });
            console.log('Test visitor created.');
        } else {
            const visitors = await Visitor.find().limit(5);
            console.log('Existing visitors:', JSON.stringify(visitors, null, 2));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });

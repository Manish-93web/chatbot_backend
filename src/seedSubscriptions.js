const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
require('dotenv').config();

const seedSubscriptions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding subscriptions');

        const tiers = [
            {
                name: 'Free',
                price: 0,
                priorityLevel: 1,
                features: {
                    maxAgents: 1,
                    historyDays: 7,
                    analytics: false,
                    prioritySupport: false,
                    fileSharing: true
                }
            },
            {
                name: 'Silver',
                price: 29,
                priorityLevel: 2,
                features: {
                    maxAgents: 3,
                    historyDays: 30,
                    analytics: true,
                    prioritySupport: false,
                    fileSharing: true
                }
            },
            {
                name: 'Gold',
                price: 99,
                priorityLevel: 5,
                features: {
                    maxAgents: 10,
                    historyDays: 365,
                    analytics: true,
                    prioritySupport: true,
                    fileSharing: true
                }
            },
            {
                name: 'Platinum',
                price: 299,
                priorityLevel: 10,
                features: {
                    maxAgents: -1, // Unlimited
                    historyDays: -1, // Forever
                    analytics: true,
                    prioritySupport: true,
                    fileSharing: true
                }
            }
        ];

        for (const tier of tiers) {
            await Subscription.findOneAndUpdate(
                { name: tier.name },
                tier,
                { upsert: true, new: true }
            );
        }

        console.log('Subscriptions seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding subscriptions:', error);
        process.exit(1);
    }
};

seedSubscriptions();

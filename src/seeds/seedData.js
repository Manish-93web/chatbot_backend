require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Agent = require('../models/Agent');
const Role = require('../models/Role');
const Department = require('../models/Department');
const WidgetConfig = require('../models/WidgetConfig');

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Agent.deleteMany({});
    await Role.deleteMany({});
    await Department.deleteMany({});
    await WidgetConfig.deleteMany({});

    console.log('Creating roles...');
    const adminRole = await Role.create({
      name: 'Admin',
      permissions: {
        canViewAllChats: true,
        canManageAgents: true,
        canManageSettings: true,
        canViewAnalytics: true,
        canExportData: true,
      },
    });

    const agentRole = await Role.create({
      name: 'Agent',
      permissions: {
        canViewAllChats: false,
        canManageAgents: false,
        canManageSettings: false,
        canViewAnalytics: false,
        canExportData: false,
      },
    });

    console.log('Creating departments...');
    const salesDept = await Department.create({
      name: 'Sales',
      description: 'Sales team',
    });

    const supportDept = await Department.create({
      name: 'Support',
      description: 'Customer support team',
    });

    console.log('Creating agents...');
    await Agent.create({
      name: 'John Smith',
      displayName: 'John',
      email: 'john@company.com',
      password: 'password123',
      roleId: adminRole._id,
      departmentId: salesDept._id,
      avatar: 'https://i.pravatar.cc/150?img=1',
      tagline: 'Senior Sales Representative',
      skills: ['Sales', 'Customer Service'],
      chatLimit: 5,
      enabled: true,
    });

    await Agent.create({
      name: 'Sarah Johnson',
      displayName: 'Sarah',
      email: 'sarah@company.com',
      password: 'password123',
      roleId: agentRole._id,
      departmentId: supportDept._id,
      avatar: 'https://i.pravatar.cc/150?img=5',
      tagline: 'Support Specialist',
      skills: ['Technical Support', 'Troubleshooting'],
      chatLimit: 5,
      enabled: true,
    });

    await Agent.create({
      name: 'Mike Wilson',
      displayName: 'Mike',
      email: 'mike@company.com',
      password: 'password123',
      roleId: agentRole._id,
      departmentId: salesDept._id,
      avatar: 'https://i.pravatar.cc/150?img=3',
      tagline: 'Sales Agent',
      skills: ['Sales', 'Product Knowledge'],
      chatLimit: 5,
      enabled: true,
    });

    console.log('Creating widget config...');
    await WidgetConfig.create({
      primaryColor: '#0ea5e9',
      position: 'right',
      welcomeMessage: 'Welcome! How can we help you today?',
      offlineMessage: 'We are currently offline. Please leave a message.',
      showAgentPhotos: true,
      requireEmail: false,
      requireName: false,
      enableFileUpload: true,
      enableSoundNotifications: true,
    });

    console.log('✅ Database seeded successfully!');
    console.log('\nDemo Accounts:');
    console.log('Admin: john@company.com / password123');
    console.log('Agent: sarah@company.com / password123');
    console.log('Agent: mike@company.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

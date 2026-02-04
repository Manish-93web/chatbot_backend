require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Role = require('../models/Role');
const Department = require('../models/Department');

const seedEssentials = async () => {
  try {
    // Connect to Database
    await connectDB();
    console.log('Connected to DB...');

    // 1. Ensure Roles exist
    const roles = ['Admin', 'Agent'];
    for (const roleName of roles) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        console.log(`Creating missing role: ${roleName}`);
        await Role.create({
          name: roleName,
          permissions: {
            canViewAllChats: roleName === 'Admin',
            canManageAgents: roleName === 'Admin',
            canManageSettings: roleName === 'Admin',
            canViewAnalytics: roleName === 'Admin',
            canExportData: roleName === 'Admin',
          }
        });
      } else {
        console.log(`Role exists: ${roleName}`);
      }
    }

    // 2. Ensure Departments exist
    const departments = ['Sales', 'Support', 'General'];
    for (const deptName of departments) {
      let dept = await Department.findOne({ name: deptName });
      if (!dept) {
        console.log(`Creating missing department: ${deptName}`);
        await Department.create({
          name: deptName,
          description: `${deptName} Department`
        });
      } else {
        console.log(`Department exists: ${deptName}`);
      }
    }

    console.log('✅ Essentials seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding essentials:', error);
    process.exit(1);
  }
};

seedEssentials();

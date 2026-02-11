/**
 * Lab Data Seeder
 * Run: node src/seeders/labSeeder.js
 *
 * Creates sample lab test requests for testing the Lab Dashboard.
 * Requires at least one clinician, one parent, and one lab user in the DB.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');
const { User } = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/asd-management-system';

const TEST_TYPES = ['EEG', 'Genetic', 'Behavioral', 'Blood', 'Urine', 'Imaging'];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find or create lab technician user
        let labTech = await User.findOne({ role: 'lab' });
        if (!labTech) {
            console.log('No lab technician found. Creating one...');
            // NOTE: Do NOT pre-hash the password — the UserSchema pre-save hook does it automatically.
            labTech = await User.create({
                firstName: 'Lab',
                lastName: 'Technician',
                email: 'lab@autismcare.com',
                password: 'Lab@123456',
                role: 'lab',
                phoneNumber: '+1234567890',
                isEmailVerified: true,
                labName: 'AutismCare Central Lab',
                accreditation: 'CAP-2024'
            });
            console.log('✅ Created lab technician user: lab@autismcare.com / Lab@123456');
        }

        // Find required users
        const clinician = await User.findOne({ role: 'clinician' });
        const parent = await User.findOne({ role: 'parent' });

        if (!clinician) {
            console.error('No clinician user found. Please create one first.');
            process.exit(1);
        }
        if (!parent) {
            console.error('No parent user found. Please create one first.');
            process.exit(1);
        }

        // Check if a child exists under the parent
        const parentDoc = await User.findById(parent._id);
        let childId, childName, childAge;

        if (parentDoc.children && parentDoc.children.length > 0) {
            const child = parentDoc.children[0];
            childId = child._id;
            childName = `${child.firstName} ${child.lastName}`;
            // Calculate age from dateOfBirth
            const now = new Date();
            const dob = new Date(child.dateOfBirth);
            childAge = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
        } else {
            // Use dummy child data
            childId = new mongoose.Types.ObjectId();
            childName = 'Test Child';
            childAge = 4;
        }

        console.log(`Using clinician: ${clinician.firstName} ${clinician.lastName}`);
        console.log(`Using parent: ${parent.firstName} ${parent.lastName}`);
        console.log(`Using child: ${childName} (age ${childAge})`);

        // Clear existing lab test requests (optional)
        await LabTestRequest.deleteMany({});
        console.log('Cleared existing lab test requests');

        // Create sample requests
        const requests = [];
        for (let i = 0; i < 10; i++) {
            const statusOptions = ['PENDING', 'PENDING', 'PENDING', 'UPLOADED', 'RELEASED'];
            requests.push({
                childId,
                childName,
                childAge,
                parentId: parent._id,
                clinicianId: clinician._id,
                testType: TEST_TYPES[i % TEST_TYPES.length],
                notes: `Sample lab test request #${i + 1} — Routine ${TEST_TYPES[i % TEST_TYPES.length]} screening`,
                status: statusOptions[i % statusOptions.length],
                releasedToParent: false,
                createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Spread over last 10 days
            });
        }

        const created = await LabTestRequest.insertMany(requests);
        console.log(`✅ Created ${created.length} lab test requests`);

        // Create dummy reports for UPLOADED or RELEASED requests
        await LabReport.deleteMany({});
        console.log('Cleared existing lab reports');

        const reportsToCreate = [];
        for (const req of created) {
            if (['UPLOADED', 'RELEASED'].includes(req.status)) {
                reportsToCreate.push({
                    testRequestId: req._id,
                    childId: req.childId,
                    clinicianId: req.clinicianId,
                    labTechnicianId: labTech._id, // Using the lab technician we created/found
                    fileUrl: '/uploads/lab-reports/dummy-report.pdf',
                    fileType: 'application/pdf',
                    fileName: `Report-${req.testType}-${req.childName.replace(/\s+/g, '-')}.pdf`,
                    fileSize: 1024 * 1024 * 1.5, // 1.5MB
                    uploadedAt: new Date(req.createdAt.getTime() + 1000 * 60 * 60), // 1 hour after request
                    releasedAt: req.status === 'RELEASED' ? new Date(req.createdAt.getTime() + 1000 * 60 * 60 * 24) : null
                });
            }
        }

        if (reportsToCreate.length > 0) {
            const createdReports = await LabReport.insertMany(reportsToCreate);
            console.log(`✅ Created ${createdReports.length} lab reports`);
        }

        await mongoose.disconnect();
        console.log('Done!');
    } catch (err) {
        console.error('Seeder error:', err);
        process.exit(1);
    }
}

seed();

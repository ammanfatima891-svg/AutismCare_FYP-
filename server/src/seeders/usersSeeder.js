const mongoose = require('mongoose');
const User = require('../models/User');

const seedUsers = async () => {
  const users = [
    {
      fullName: "Parent One",
      email: "parent1@example.com",
      phone: "+923001112233",
      password: "Password123",
      roles: ["parent"],
      primaryRole: "parent"
    },
    {
      fullName: "Dr. Ali",
      email: "doctor1@example.com",
      phone: "+923001112244",
      password: "Password123",
      roles: ["doctor"],
      primaryRole: "doctor",
      organization: "AutismCare Hospital",
      licenseNumber: "DOC12345",
      specialty: "Pediatrics",
      experienceYears: 5,
      qualification: "MBBS"
    },
    {
      fullName: "Therapist Sara",
      email: "therapist1@example.com",
      phone: "+923001112255",
      password: "Password123",
      roles: ["therapist"],
      primaryRole: "therapist",
      organization: "AutismCare Clinic",
      licenseNumber: "TH12345",
      specialty: "ABA",
      therapyType: "ABA"
    },
    {
      fullName: "Lab A",
      email: "lab1@example.com",
      phone: "+923001112266",
      password: "Password123",
      roles: ["laboratory"],
      primaryRole: "laboratory",
      organization: "AutismCare Lab",
      licenseNumber: "LAB123",
      labAddress: "123 Lab Street",
      labType: "general"
    },
    {
      fullName: "Admin One",
      email: "admin1@example.com",
      phone: "+923001112277",
      password: "Password123",
      roles: ["admin"],
      primaryRole: "admin",
      permissions: ["manageUsers", "viewReports", "manageTherapies"]
    }
  ];

  await User.insertMany(users);
  console.log("Users seeded.");
};

module.exports = seedUsers;

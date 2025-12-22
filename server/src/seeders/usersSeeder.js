const mongoose = require('mongoose');
const { User } = require('../models/User.js');

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
      firstName: "Ali",
      lastName: "Khan",
      email: "clinician1@example.com",
      phoneNumber: "+923001112244",
      password: "Password123",
      role: "clinician",
      specialization: "Pediatrics",
      licenseNumber: "DOC12345",
      approvalStatus: "active"
    },
    {
      firstName: "Sara",
      lastName: "Ahmed",
      email: "therapist1@example.com",
      phoneNumber: "+923001112255",
      password: "Password123",
      role: "therapist",
      specialization: "ABA Therapy",
      licenseNumber: "TH12345",
      approvalStatus: "active"
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

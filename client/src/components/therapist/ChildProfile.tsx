import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

export function ChildProfile() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Dummy data (future backend ready)
  const child = {
    firstName: 'Rabia',
    lastName: 'Babar',
    dob: '2020-05-12',
    pretermWeeks: 2,
    gender: 'Female',

    medicalHistory: 'Delayed speech development',
    allergies: 'None',
    medication: 'Vitamin D',

    parentName: 'Mrs. Babar',
    parentPhone: '+92 300 1234567',
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Child Profile</h2>
        
      </div>

      {/* Personal Information */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>First Name:</strong> {child.firstName}</p>
            <p><strong>Last Name:</strong> {child.lastName}</p>
            <p><strong>Date of Birth:</strong> {child.dob}</p>
            <p><strong>Preterm Weeks:</strong> {child.pretermWeeks}</p>
            <p><strong>Gender:</strong> {child.gender}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Medical Information */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Medical History:</strong> {child.medicalHistory}</p>
            <p><strong>Allergies:</strong> {child.allergies}</p>
            <p><strong>Current Medication:</strong> {child.medication}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parent Information */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Parent Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p><strong>Parent Name:</strong> {child.parentName}</p>
          <p><strong>Phone Number:</strong> {child.parentPhone}</p>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}

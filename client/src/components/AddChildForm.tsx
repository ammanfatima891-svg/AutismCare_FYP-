import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { UserPlus, Loader2, Calendar, Heart, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import API from '../api';

interface ChildFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface AddChildFormProps {
  onSuccess?: (child: any) => void;
  onCancel?: () => void;
}

const validationSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .required('Last name is required'),
  dateOfBirth: Yup.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .required('Date of birth is required'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other'], 'Invalid gender')
    .required('Gender is required'),
  medicalHistory: Yup.string()
    .max(500, 'Medical history must be less than 500 characters'),
  allergies: Yup.string()
    .max(300, 'Allergies must be less than 300 characters'),
  currentMedications: Yup.string()
    .max(300, 'Current medications must be less than 300 characters'),
  emergencyContact: Yup.string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Emergency contact name must be less than 100 characters')
    .required('Emergency contact is required'),
  emergencyPhone: Yup.string()
    .matches(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
    .required('Emergency phone is required'),
});

export default function AddChildForm({ onSuccess, onCancel }: AddChildFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: ChildFormData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    emergencyContact: '',
    emergencyPhone: '',
  };

  const handleSubmit = async (values: ChildFormData) => {
    setIsSubmitting(true);
    try {
      const response = await API.post('/child', values);
      toast.success('Child profile created successfully!');
      onSuccess?.(response.data.data);
    } catch (error: any) {
      console.error('Error creating child:', error);
      toast.error(error.response?.data?.message || 'Failed to create child profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl backdrop-blur-sm">
        <CardHeader className="ds-card-header-strip border-0">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="rounded-full bg-secondary p-3">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Add Child Profile</CardTitle>
              <p className="text-sm text-muted-foreground">Create a new child profile for screening</p>
            </div>
          </motion.div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched }) => (
              <Form className="space-y-6">
                {/* Basic Information */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Basic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                        First Name *
                      </Label>
                      <Field
                        as={Input}
                        id="firstName"
                        name="firstName"
                        placeholder="Enter first name"
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.firstName && touched.firstName ? 'border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="firstName" component="p" className="text-xs text-destructive mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                        Last Name *
                      </Label>
                      <Field
                        as={Input}
                        id="lastName"
                        name="lastName"
                        placeholder="Enter last name"
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.lastName && touched.lastName ? 'border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="lastName" component="p" className="text-xs text-destructive mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                        Date of Birth *
                      </Label>
                      <div className="relative">
                        <Field
                          as={Input}
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.dateOfBirth && touched.dateOfBirth ? 'border-red-500' : ''
                          }`}
                        />
                        <Calendar className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <ErrorMessage name="dateOfBirth" component="p" className="text-xs text-destructive mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="gender" className="text-sm font-medium text-foreground">
                        Gender *
                      </Label>
                      <Select
                        value={values.gender}
                        onValueChange={(value) => setFieldValue('gender', value)}
                      >
                        <SelectTrigger className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.gender && touched.gender ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <ErrorMessage name="gender" component="p" className="text-xs text-destructive mt-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Medical Information */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Medical Information</h3>
                  </div>

                  <div>
                    <Label htmlFor="medicalHistory" className="text-sm font-medium text-foreground">
                      Medical History
                    </Label>
                    <Field
                      as={Textarea}
                      id="medicalHistory"
                      name="medicalHistory"
                      placeholder="Enter any relevant medical history..."
                      rows={3}
                      className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.medicalHistory && touched.medicalHistory ? 'border-red-500' : ''
                      }`}
                    />
                    <ErrorMessage name="medicalHistory" component="p" className="text-xs text-destructive mt-1" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="allergies" className="text-sm font-medium text-foreground">
                        Allergies
                      </Label>
                      <Field
                        as={Textarea}
                        id="allergies"
                        name="allergies"
                        placeholder="List any allergies..."
                        rows={2}
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.allergies && touched.allergies ? 'border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="allergies" component="p" className="text-xs text-destructive mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="currentMedications" className="text-sm font-medium text-foreground">
                        Current Medications
                      </Label>
                      <Field
                        as={Textarea}
                        id="currentMedications"
                        name="currentMedications"
                        placeholder="List current medications..."
                        rows={2}
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.currentMedications && touched.currentMedications ? 'border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="currentMedications" component="p" className="text-xs text-destructive mt-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Emergency Contact */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Emergency Contact</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContact" className="text-sm font-medium text-foreground">
                        Emergency Contact Name *
                      </Label>
                      <Field
                        as={Input}
                        id="emergencyContact"
                        name="emergencyContact"
                        placeholder="Enter emergency contact name"
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.emergencyContact && touched.emergencyContact ? 'border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="emergencyContact" component="p" className="text-xs text-destructive mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="emergencyPhone" className="text-sm font-medium text-foreground">
                        Emergency Phone *
                      </Label>
                      <div className="relative">
                        <Field
                          as={Input}
                          id="emergencyPhone"
                          name="emergencyPhone"
                          placeholder="Enter emergency phone number"
                          className={`mt-1 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.emergencyPhone && touched.emergencyPhone ? 'border-red-500' : ''
                          }`}
                        />
                        <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <ErrorMessage name="emergencyPhone" component="p" className="text-xs text-destructive mt-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Submit Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-4 pt-6 border-t"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Child Profile
                      </>
                    )}
                  </Button>
                </motion.div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </motion.div>
  );
}

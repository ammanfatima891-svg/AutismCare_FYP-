import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Textarea } from '../../ui/textarea';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { CalendarIcon, Baby } from 'lucide-react';
import { toast } from 'sonner';
import { childAPI } from '../../../api';

interface AddChildFormProps {
  onSuccess: () => void;
}

interface ChildFormData {
  firstName: string;
  lastName: string;
  gender: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  emergencyContact: string;
  emergencyPhone: string;
  pretermWeeks: number;
}

export function AddChildForm({ onSuccess }: AddChildFormProps) {
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gender, setGender] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChildFormData>();

  const onSubmit = async (data: ChildFormData) => {
    if (!dateOfBirth) {
      toast.error('Please select date of birth');
      return;
    }

    if (!gender) {
      toast.error('Please select gender');
      return;
    }

    setIsSubmitting(true);

    try {
      const childData = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: dateOfBirth.toISOString(),
        gender,
        pretermWeeks: data.pretermWeeks || 0,
        medicalHistory: data.medicalHistory,
        allergies: data.allergies,
        currentMedications: data.currentMedications,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
      };

      await childAPI.createChild(childData);
      toast.success('Child profile created successfully! 🎉');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating child:', error);
      toast.error(error.response?.data?.message || 'Failed to create child profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Baby className="w-6 h-6" />
            Add New Child Profile
          </CardTitle>
          <CardDescription>
            Fill in your child's information to get started with personalized care
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-primary pb-2 border-b border">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    {...register('firstName', { required: true })}
                    className="mt-1"
                  />
                  {errors.firstName && (
                    <p className="text-destructive text-sm mt-1">First name is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    {...register('lastName', { required: true })}
                    className="mt-1"
                  />
                  {errors.lastName && (
                    <p className="text-destructive text-sm mt-1">Last name is required</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setDateOfBirth(date);
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="pretermWeeks">Preterm Weeks</Label>
                  <Input
                    id="pretermWeeks"
                    type="number"
                    placeholder="0"
                    min="0"
                    max="12"
                    {...register('pretermWeeks', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">Weeks born before due date (for ASQ-3 calculations)</p>
                </div>

                <div>
                  <Label>Gender *</Label>
                  <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="cursor-pointer">Other</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-primary pb-2 border-b border">Medical Information</h3>

              <div>
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea
                  id="medicalHistory"
                  placeholder="Any relevant medical history, diagnoses, or conditions..."
                  rows={3}
                  {...register('medicalHistory')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  placeholder="Food allergies, medication allergies, etc."
                  {...register('allergies')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="currentMedications">Current Medications</Label>
                <Textarea
                  id="currentMedications"
                  placeholder="List any medications your child is currently taking..."
                  rows={2}
                  {...register('currentMedications')}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-primary pb-2 border-b border">Emergency Contact</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">Contact Name *</Label>
                  <Input
                    id="emergencyContact"
                    placeholder="Emergency contact name"
                    {...register('emergencyContact', { required: true })}
                    className="mt-1"
                  />
                  {errors.emergencyContact && (
                    <p className="text-destructive text-sm mt-1">Emergency contact is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    {...register('emergencyPhone', { required: true })}
                    className="mt-1"
                  />
                  {errors.emergencyPhone && (
                    <p className="text-destructive text-sm mt-1">Emergency phone is required</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Baby className="w-4 h-4 mr-2" />
                    Create Profile
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onSuccess}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

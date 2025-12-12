// client/src/components/SignUpForm.tsx
import React, { useState, useContext } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { UserPlus, User, Users, Stethoscope, FlaskConical, Shield } from "lucide-react";
import { toast } from "sonner";


type UserRole = "parent" | "doctor" | "therapist" | "laboratory" | "admin";

interface SignUpFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  organization?: string;
  licenseNumber?: string;
  agreeToTerms: boolean;
}

const roleConfig = {
  parent: { icon: User, label: "Parent/Guardian", fields: ["fullName", "email", "phone", "password"] },
  doctor: { icon: Stethoscope, label: "Doctor", fields: ["fullName", "email", "phone", "organization", "licenseNumber", "password"] },
  therapist: { icon: Users, label: "Therapist", fields: ["fullName", "email", "phone", "organization", "licenseNumber", "password"] },
  laboratory: { icon: FlaskConical, label: "Laboratory", fields: ["fullName", "email", "phone", "organization", "licenseNumber", "password"] },
  admin: { icon: Shield, label: "Administrator", fields: ["fullName", "email", "phone", "password"] }
};

export function SignUpForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("parent");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignUpFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "parent",
      organization: "",
      licenseNumber: "",
      agreeToTerms: false
    }
  });

  const password = watch("password");

  const requiresCredentials = ["doctor", "therapist", "laboratory"].includes(selectedRole);

  const onSubmit = async (data: SignUpFormData) => {
    // final checks (should be validated already)
    if (!data.agreeToTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: selectedRole
      };

      if (requiresCredentials) {
        payload.organization = data.organization;
        payload.licenseNumber = data.licenseNumber;
      }

      // NOTE: axiosInstance baseURL should be import.meta.env.VITE_API_URL = "http://localhost:4000/api"
      const res = await axios.post("/auth/register", payload);

      if (res?.data?.token && res?.data?.user) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        if (login) login({ user: res.data.user, token: res.data.token });

        toast.success("Account created successfully!");

        const roleValue = res.data.user.primaryRole || res.data.user.role || selectedRole;
        if (roleValue === "parent") window.location.href = "/parent/dashboard";
        else if (roleValue === "doctor") window.location.href = "/clinician/dashboard";
        else if (roleValue === "therapist") window.location.href = "/therapist/dashboard";
        else if (roleValue === "laboratory") window.location.href = "/lab/dashboard";
        else window.location.href = "/";
      } else {
        toast.error("Registration failed");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const msg = err?.response?.data?.message || err.message || "Server error";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2">Create your account</h2>
        <p className="text-gray-600">Join AutismCare to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Role Selection (controlled) */}
        <div>
          <Label className="mb-3 block">I am a...</Label>
          <RadioGroup value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)} className="grid grid-cols-2 gap-3">
            {Object.entries(roleConfig).map(([role, cfg]) => {
              const Icon = (cfg as any).icon;
              return (
                <Label key={role} htmlFor={role} className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedRole === role ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                  <RadioGroupItem value={role} id={role} className="sr-only" />
                  <Icon className={`w-6 h-6 ${selectedRole === role ? "text-blue-600" : "text-gray-600"}`} />
                  <span className={selectedRole === role ? "text-blue-600" : "text-gray-700"}>{(cfg as any).label}</span>
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Full Name */}
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Controller
            name="fullName"
            control={control}
            rules={{ required: "Full name is required" }}
            render={({ field }) => <Input id="fullName" placeholder="Enter your full name" {...field} className="mt-1" />}
          />
          {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Controller
            name="email"
            control={control}
            rules={{
              required: "Email is required",
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Enter a valid email" }
            }}
            render={({ field }) => <Input id="email" type="email" placeholder="you@example.com" {...field} className="mt-1" />}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Controller
            name="phone"
            control={control}
            rules={{
              required: "Phone is required",
              pattern: { value: /^\+?[0-9]{7,15}$/, message: "Enter a valid phone" }
            }}
            render={({ field }) => <Input id="phone" placeholder="+1 (555) 000-0000" {...field} className="mt-1" />}
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
        </div>

        {/* Professional fields */}
        {requiresCredentials && (
          <>
            <div>
              <Label htmlFor="organization">Organization/Clinic Name *</Label>
              <Controller name="organization" control={control} rules={{ required: requiresCredentials ? "Organization is required" : false }} render={({ field }) => <Input id="organization" {...field} className="mt-1" />} />
              {errors.organization && <p className="text-red-600 text-sm mt-1">{errors.organization.message}</p>}
            </div>

            <div>
              <Label htmlFor="licenseNumber">{selectedRole === "laboratory" ? "Lab License Number *" : "Professional License Number *"}</Label>
              <Controller name="licenseNumber" control={control} rules={{ required: requiresCredentials ? "License number is required" : false }} render={({ field }) => <Input id="licenseNumber" {...field} className="mt-1" />} />
              {errors.licenseNumber && <p className="text-red-600 text-sm mt-1">{errors.licenseNumber.message}</p>}
            </div>
          </>
        )}

        {/* Password */}
        <div>
          <Label htmlFor="password">Password *</Label>
          <Controller name="password" control={control} rules={{ required: "Password required", minLength: { value: 8, message: "Password must be at least 8 characters" } }} render={({ field }) => <Input id="password" type="password" {...field} className="mt-1" />} />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Controller name="confirmPassword" control={control} rules={{ required: "Confirm password required", validate: (val) => val === password || "Passwords must match" }} render={({ field }) => <Input id="confirmPassword" type="password" {...field} className="mt-1" />} />
          {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <Controller
            name="agreeToTerms"
            control={control}
            rules={{ validate: (v) => v === true || "You must accept terms" }}
            render={({ field }) => <Checkbox id="terms" checked={field.value} onCheckedChange={(c) => field.onChange(Boolean(c))} />}
          />
          <Label htmlFor="terms" className="cursor-pointer leading-snug">
            I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </Label>
        </div>
        {errors.agreeToTerms && <p className="text-red-600 text-sm mt-1">{errors.agreeToTerms.message}</p>}

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default SignUpForm;

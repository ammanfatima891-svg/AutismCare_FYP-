import { useState, useContext, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "./ui/card";
import {
  UserPlus,
  User,
  Users,
  Stethoscope,
  FlaskConical,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  AlertCircle,
  Mail,
  Shield,
  Building2,
  Heart,
  Microscope,
  Brain
} from "lucide-react";
import { toast } from "sonner";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type Role = "PARENT" | "CLINICIAN" | "THERAPIST" | "LAB";

const roleConfig: Record<Role, { icon: any; label: string; description: string }> = {
  PARENT: { icon: User, label: "Parent", description: "Manage your child's care" },
  CLINICIAN: { icon: Stethoscope, label: "Clinician", description: "Healthcare professional" },
  THERAPIST: { icon: Heart, label: "Therapist", description: "Specialized therapy services" },
  LAB: { icon: Microscope, label: "Laboratory", description: "Diagnostic testing" }
};

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role>("PARENT");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [inlineMessage, setInlineMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  const { login } = useContext(AuthContext);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      specialization: "",
      licenseNumber: "",
      labName: "",
      accreditation: "",
      agreeToTerms: false,
      rememberMe: false
    }
  });

  const password = watch("password");

  useEffect(() => {
    reset();
    setSelectedRole("PARENT");
  }, [isLogin, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    setInlineMessage({ type: null, text: '' });
    try {
      if (isLogin) {
        // LOGIN
        await login(data.email, data.password, data.rememberMe);
        setInlineMessage({ type: 'success', text: 'Logged in successfully!' });
      } else {
        // REGISTER
        const { confirmPassword, agreeToTerms, ...payload } = data;

        if ((selectedRole === "CLINICIAN" || selectedRole === "THERAPIST") && uploadedFiles.length > 0) {
          // Use FormData for file uploads
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            formData.append(key, payload[key]);
          });
          formData.append("role", selectedRole.toLowerCase());

          uploadedFiles.forEach((file: File, index: number) => {
            formData.append("documents", file);
          });

          const res = await API.post("/auth/register", formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          setInlineMessage({ type: 'success', text: res.data.message || "Account created! Verify your email." });
        } else {
          // Regular JSON request
          const res = await API.post("/auth/register", {
            ...payload,
            role: selectedRole.toLowerCase() // backend expects lowercase
          });

          setInlineMessage({ type: 'success', text: res.data.message || "Account created! Verify your email." });
        }

        // Switch to login
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error(err);
      setInlineMessage({ type: 'error', text: err.response?.data?.message || "Request failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-teal-500/10 to-cyan-500/10 pb-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mb-4"
            >
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
                <Brain size={32} className="text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-teal-800 text-2xl font-light">{isLogin ? "Welcome Back!" : "Let's Get Started"}</CardTitle>
            <CardDescription className="text-teal-600 text-lg">
              {isLogin ? "We're glad to see you again" : "Create your account to begin"}
            </CardDescription>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-teal-500 mt-2 space-y-1"
            >
              <p>Your information is safe and secure • You can stop anytime</p>
              <p className="text-xs">This is not a diagnosis • Take your time • We're here to help</p>
            </motion.div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {/* LOGIN / SIGNUP TOGGLE */}
            <motion.div
              className="grid grid-cols-2 bg-slate-100 rounded-xl mb-6 p-1 shadow-inner"
              layout
            >
              <motion.button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
                  isLogin
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-200"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogIn size={16} />
                Login
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
                  !isLogin
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-200"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserPlus size={16} />
                Sign Up
              </motion.button>
            </motion.div>

            {/* INLINE MESSAGE */}
            <AnimatePresence>
              {inlineMessage.type && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`p-4 rounded-lg border flex items-center gap-3 ${
                    inlineMessage.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {inlineMessage.type === 'success' ? (
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{inlineMessage.text}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* REGISTER FIELDS */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Label className="text-xs font-bold text-slate-500 mb-3 block">SELECT YOUR ROLE</Label>
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {Object.entries(roleConfig).map(([role, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                          <motion.button
                            type="button"
                            key={role}
                            onClick={() => setSelectedRole(role as Role)}
                            className={`border-2 rounded-xl p-4 flex items-center gap-4 transition-all duration-200 ${
                              selectedRole === role
                                ? "border-teal-600 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 shadow-lg ring-2 ring-teal-200"
                                : "border-slate-200 hover:border-teal-300 hover:bg-slate-50 hover:shadow-md"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className={`p-2 rounded-lg ${
                              selectedRole === role
                                ? "bg-teal-100 text-teal-600"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              <Icon size={20} />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-semibold block">{cfg.label}</span>
                              <span className="text-xs text-slate-500">{cfg.description}</span>
                            </div>
                            {selectedRole === role && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto"
                              >
                                <CheckCircle size={20} className="text-teal-600" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-2 gap-4 mb-4"
                    >
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">First Name</Label>
                        <Input {...register("firstName", { required: "First name is required" })} className="focus:ring-teal-500 focus:border-teal-500 h-10" />
                        {errors.firstName && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1 mt-1"
                          >
                            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-500">{errors.firstName.message as string}</p>
                          </motion.div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Last Name</Label>
                        <Input {...register("lastName", { required: "Last name is required" })} className="focus:ring-teal-500 focus:border-teal-500 h-10" />
                        {errors.lastName && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1 mt-1"
                          >
                            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-500">{errors.lastName.message as string}</p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {(selectedRole === "CLINICIAN" || selectedRole === "THERAPIST") && (
                        <>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-2 gap-4 mb-4"
                          >
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700">Specialization</Label>
                              <Input
                                {...register("specialization", { required: "Specialization is required" })}
                                className="focus:ring-teal-500 focus:border-teal-500 h-10"
                              />
                              {errors.specialization && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-1 mt-1"
                                >
                                  <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                  <p className="text-xs text-red-500">{errors.specialization.message as string}</p>
                                </motion.div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700">License Number</Label>
                              <Input
                                {...register("licenseNumber", { required: "License number is required" })}
                                className="focus:ring-teal-500 focus:border-teal-500 h-10"
                              />
                              {errors.licenseNumber && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-1 mt-1"
                                >
                                  <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                  <p className="text-xs text-red-500">{errors.licenseNumber.message as string}</p>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2 mb-4"
                          >
                            <Label className="text-sm font-medium text-slate-700">Upload Documents</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors">
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <p className="text-sm text-slate-600 mb-2">Upload your license, certifications, or other documents</p>
                              <p className="text-xs text-slate-500 mb-3">Supported formats: JPEG, PNG, PDF, DOC, DOCX (Max 5MB each)</p>
                              <input
                                type="file"
                                multiple
                                accept=".jpeg,.jpg,.png,.pdf,.doc,.docx"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setUploadedFiles(files);
                                }}
                                className="hidden"
                                id="document-upload"
                              />
                              <label
                                htmlFor="document-upload"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 cursor-pointer transition-colors"
                              >
                                <FileText size={16} />
                                Choose Files
                              </label>
                            </div>
                            {uploadedFiles.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {uploadedFiles.map((file: File, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <FileText size={14} />
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {selectedRole === "LAB" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-2 gap-4 mb-4"
                        >
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Lab Name</Label>
                            <Input
                              {...register("labName", { required: "Lab name is required" })}
                              className="focus:ring-teal-500 focus:border-teal-500 h-10"
                            />
                            {errors.labName && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-1 mt-1"
                              >
                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-500">{errors.labName.message as string}</p>
                              </motion.div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Accreditation</Label>
                            <Input
                              {...register("accreditation", { required: "Accreditation is required" })}
                              className="focus:ring-teal-500 focus:border-teal-500 h-10"
                            />
                            {errors.accreditation && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-1 mt-1"
                              >
                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-500">{errors.accreditation.message as string}</p>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* EMAIL */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  {...register("email", { required: "Email address is required" })}
                  className="focus:ring-teal-500 focus:border-teal-500 h-10"
                />
                {errors.email && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-1"
                  >
                    <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-500">{errors.email.message as string}</p>
                  </motion.div>
                )}
              </motion.div>

              {/* PASSWORD */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: isLogin ? 1 : 8,
                        message: "Password must be at least 8 characters"
                      }
                    })}
                    className="focus:ring-teal-500 focus:border-teal-500 pr-10 h-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-1"
                  >
                    <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-500">{errors.password.message as string}</p>
                  </motion.div>
                )}
              </motion.div>

              {/* REMEMBER ME - ONLY FOR LOGIN */}
              {isLogin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center space-x-2"
                >
                  <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }: any) => (
                      <Checkbox
                        id="rememberMe"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal">
                    Remember me
                  </Label>
                </motion.div>
              )}

              {/* CONFIRM + TERMS */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Confirm Password</Label>
                      <Input
                        type="password"
                        {...register("confirmPassword", {
                          validate: (v: string) => v === password || "Passwords do not match"
                        })}
                        className="focus:ring-teal-500 focus:border-teal-500 h-10"
                      />
                      {errors.confirmPassword && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1 mt-1"
                        >
                          <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-500">{errors.confirmPassword.message as string}</p>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex gap-3 items-start">
                      <Controller
                        name="agreeToTerms"
                        control={control}
                        rules={{ required: "You must agree to the terms and conditions" }}
                        render={({ field }: any) => (
                          <Checkbox
                            id="terms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I agree to the Terms & Privacy Policy
                        </label>
                        {errors.agreeToTerms && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1 mt-1"
                          >
                            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-500">{errors.agreeToTerms.message as string}</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SUBMIT BUTTON */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : isLogin ? (
                    <LogIn className="w-4 h-4 mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {isLogin ? "Login" : "Create Account"}
                </motion.button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

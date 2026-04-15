import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { ThemeToggleButton } from "../components/ui/ThemeToggleButton";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-app-shell relative">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggleButton />
      </div>
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <CardHeader className="ds-card-header-strip space-y-2">
          <CardTitle className="text-2xl font-bold text-foreground">Forgot password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the email you registered with. We will send reset instructions if an account exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}
          <Button variant="ghost" asChild className="w-full">
            <Link to="/login" className="inline-flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

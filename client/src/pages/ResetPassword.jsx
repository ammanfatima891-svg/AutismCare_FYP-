import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { ThemeToggleButton } from "../components/ui/ThemeToggleButton";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const { data } = await API.post(`/auth/reset-password/${token}`, { password });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 2000);
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-center text-2xl font-bold text-foreground">Set a new password</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Choose a strong password you have not used elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Reset password"}
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

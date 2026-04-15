import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ThemeToggleButton } from '../components/ui/ThemeToggleButton';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying your email...');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const { data } = await API.get(`/auth/verify-email/${token}`);
        setMessage(data.message);
        setIsVerified(true);
        toast.success('Email verified successfully!');
      } catch (err) {
        setMessage(err.response?.data?.message || 'Verification failed');
        toast.error('Verification failed');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <div className="ds-app-shell relative">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggleButton />
      </div>
      <Card className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-0 shadow-xl">
        <CardHeader className="ds-card-header-strip">
          <CardTitle className="text-center text-2xl font-bold text-foreground">
            Email verification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2 text-center">
          <p className="mb-4 text-muted-foreground">{message}</p>
          {isVerified && (
            <Button variant="default" onClick={() => navigate('/login')} className="w-full">
              Go to login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

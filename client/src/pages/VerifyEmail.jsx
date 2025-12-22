import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
    <Card className="max-w-md mx-auto p-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="mb-4">{message}</p>
        {isVerified && (
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

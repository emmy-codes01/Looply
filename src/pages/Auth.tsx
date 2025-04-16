
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/hooks/use-auth";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);
  
  const handleSuccess = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gray-50">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Corner Chat</h1>
        <p className="text-gray-600">Join our community today</p>
      </div>
      
      <AuthForm onSuccess={handleSuccess} />
      
      <p className="mt-8 text-xs text-gray-500 text-center max-w-md">
        By signing up, you agree to our Terms of Service and Privacy Policy.
        We'll never share your information without permission.
      </p>
    </div>
  );
};

export default Auth;

"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "@/components/services/firebaseService";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { 
  Card, 
  Button, 
  Input, 
  LoadingSpinner, 
  Typography, 
  Container 
} from "@/components/common";

const CREDENTIALS_STORAGE_KEY = 'rememberMe_credentials';

const SignIn: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPage, setShowPage] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials and Remember Me state if available
  useEffect(() => {
    const savedData = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (savedData) {
      try {
        const { email: savedEmail, password: savedPassword } = JSON.parse(savedData);
        setEmail(savedEmail || "");
        setPassword(savedPassword || "");
        setRememberMe(true);
      } catch (e) {
        console.error("Error loading saved credentials:", e);
      }
    }
    setShowPage(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Always use local persistence for authentication
      await setPersistence(auth, browserLocalPersistence);
      
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Signed in successfully:", userCredential.user);
      
      // Save or clear credentials based on rememberMe
      if (rememberMe) {
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign in error:", err);
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Professional background */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900"></div>
        
        {/* Abstract geometric shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NiIgaGVpZ2h0PSIxMDAiPgo8cmVjdCB3aWR0aD0iNTYiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjFmNWY5Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0yOCA2NkwwIDUwTDAgMTZMMjggMEw1NiAxNkw1NiA1MEwyOCA2NkwyOCAxMDBMNTYgMTAwTDU2IDgzTDI4IDY2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8cGF0aCBkPSJNMjggMEwyOCAzNEw1NiA1MEw1NiAxNkwyOCAwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')]"></div>
        </div>
        
        {/* Light particles/dots overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMC41IiBmaWxsPSJ3aGl0ZSI+PC9jaXJjbGU+Cjwvc3ZnPg==')]"></div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] bg-indigo-500 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] bg-purple-500 rounded-full opacity-5 blur-2xl"></div>
      <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-cyan-400 rounded-full opacity-5 blur-xl"></div>
      
      {isLoading && <LoadingSpinner fullScreen size="xl" color="white" />}
      
      <Container maxWidth="sm" className="z-10">
        <div 
          className={`transform transition-all duration-500 ${
            showPage 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          } hover:translate-y-[-5px]`}
        >
          <Card 
            className="p-6 shadow-2xl border border-gray-200/20 rounded-xl backdrop-blur-sm bg-white/95"
            shadow="lg"
            rounded="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Centered Logo - Using regular img tag to prevent optimization */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20"></div>
                  <img 
                    src="/DWV2.png" 
                    alt="Logo"
                    className="h-24 w-auto relative z-10" 
                  />
                </div>
              </div>
              
              <div className="space-y-2 text-center">
                <Typography 
                  variant="h2" 
                  align="center" 
                  className="text-2xl font-bold text-gray-800 tracking-tight"
                >
                  Welcome Back
                </Typography>
                <p className="text-gray-500 text-sm">Sign in to access your account</p>
              </div>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-in fade-in duration-300">
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                </div>
              )}
              
              <div className="space-y-4 pt-2">
                <div className="w-full">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Your email address"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-h-[42px] py-2.5 px-3"
                  />
                </div>
                
                <div className="w-full">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Your password"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-h-[42px] py-2.5 px-3 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 text-gray-600 hover:text-gray-800 transition-colors z-10"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me checkbox */}
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember credentials
                  </label>
                </div>
              </div>
              
              <Button 
                type="submit" 
                fullWidth 
                isLoading={isLoading} 
                variant="primary" 
                className="mt-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all animate-in fade-in duration-500"
                icon={<LockClosedIcon className="h-4 w-4" />}
              >
                Sign In
              </Button>
              
              <div className="pt-3 text-center text-sm text-gray-500 flex items-center justify-center gap-1">
                <LockClosedIcon className="h-3.5 w-3.5" />
                <span>Secure access to your account</span>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default SignIn;

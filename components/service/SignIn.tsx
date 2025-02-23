"use client";
import React, { useState, useRef, FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseService";
import { useRouter } from "next/navigation";
import HashLoader from "react-spinners/HashLoader";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const SignIn: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Signed in successfully:", userCredential.user);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      {isLoading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <HashLoader color="white" loading={isLoading} size={100} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-96 relative z-10">
        {/* Centered Logo */}
        <div className="flex justify-center mb-4">
          <img src="/DWV2.png" alt="Logo" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl mb-4 font-semibold text-center">Sign In</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded w-full mb-3"
        />
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border p-2 rounded w-full"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-2 flex items-center"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">
          Sign In
        </button>
      </form>
    </div>
  );
};

export default SignIn;

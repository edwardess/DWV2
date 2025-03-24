"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth"; 
import { auth } from "@/components/services/firebaseService";
import { LoadingSpinner } from "@/components/common";
import Link from "next/link";
import { Typography, Container, Card, Button } from "@/components/common";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to dashboard
        router.push("/dashboard");
      } else {
        // No user is signed in, redirect to signin page
        router.push("/signin");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  // Show loading spinner while checking auth state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="xl" />
    </div>
  );
}

// Put the components/service/SignUp.tsx code here "use client";
import React, { useState, useRef, FormEvent } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/components/services/firebaseService";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import HashLoader from "react-spinners/HashLoader";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface SignUpProps {
  onRouteChange?: React.Dispatch<React.SetStateAction<"signin" | "signup" | "dashboard">>;
}

const SignUp: React.FC<SignUpProps> = ({ onRouteChange }) => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // For profile photo upload:
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload function for profile photo
  const uploadFile = async (file: File): Promise<string> => {
    const storage = getStorage();
    const fileRef = ref(storage, `profilePhotos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => resolve(downloadURL))
            .catch(reject);
        }
      );
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setProfilePhoto(files[0]);
      setPreviewURL(URL.createObjectURL(files[0]));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setProfilePhoto(e.dataTransfer.files[0]);
      setPreviewURL(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let photoURL = "";
      if (profilePhoto) {
        photoURL = await uploadFile(profilePhoto);
      } else {
        // Use default profile photo if none uploaded
        photoURL = "/prof.webp";
      }

      // Update user profile with full name and photo URL
      await updateProfile(user, {
        displayName: fullName,
        photoURL: photoURL,
      });

      // Create a new document in the "users" collection with the user's info
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: fullName,
        photoURL: photoURL,
        createdAt: serverTimestamp(),
      });

      console.log("Signed up successfully:", user);
      onRouteChange && onRouteChange("dashboard");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
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
        <h2 className="text-2xl mb-4 font-semibold text-center">Sign Up</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border p-2 rounded w-full mb-3"
        />
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
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-dashed border-2 border-gray-300 p-4 rounded mb-4 text-center cursor-pointer"
        >
          {previewURL ? (
            <img
              src={previewURL}
              alt="Profile Preview"
              className="mx-auto h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <p className="text-sm text-gray-500">
              Drag & drop profile photo here or click to select
            </p>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default SignUp;

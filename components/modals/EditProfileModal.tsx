"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, updateProfile, updateEmail, updatePassword, sendEmailVerification, verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/components/services/firebaseService";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { UserIcon, XMarkIcon, CheckIcon, CameraIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CameraIcon as CameraSolidIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/common/modals/Modal";
import HashLoader from "react-spinners/HashLoader";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  user,
  onSuccess,
  onError
}) => {
  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState("");
  const [previewURL, setPreviewURL] = useState<string>("");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [showEmailVerificationSent, setShowEmailVerificationSent] = useState(false);
  
  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setPhotoURL(user.photoURL || "");
    }
  }, [user, visible]);

  // Handle file selection for profile photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setProfilePhoto(files[0]);
      setPreviewURL(URL.createObjectURL(files[0]));
    }
  };

  // Handle drag and drop for profile photo
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

  // Upload profile photo to Firebase Storage
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    const storage = getStorage();
    const fileRef = ref(storage, `profilePhotos/${user?.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress monitoring if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  // Send email verification
  const handleSendVerification = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      setShowEmailVerificationSent(true);
      onSuccess("Verification email sent. Please check your inbox.");
    } catch (error: any) {
      onError(`Error sending verification email: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Track what changed for user feedback
      const changes: string[] = [];
      
      // Update profile photo if changed
      if (profilePhoto) {
        const newPhotoURL = await uploadProfilePhoto(profilePhoto);
        await updateProfile(user, { photoURL: newPhotoURL });
        setPhotoURL(newPhotoURL);
        changes.push("profile photo");
      }
      
      // Update display name if changed
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        changes.push("display name");
      }
      
      // Email editing is no longer supported
      // Removed code for email updates
      
      // Update password if provided
      if (newPassword && confirmPassword && newPassword === confirmPassword) {
        await updatePassword(user, newPassword);
        changes.push("password");
        setNewPassword("");
        setConfirmPassword("");
      } else if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      // Update user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        photoURL: profilePhoto ? photoURL : user.photoURL,
        // phoneNumber is managed by Firebase Auth, not Firestore directly
      });
      
      if (changes.length > 0) {
        onSuccess(`Profile updated successfully! Changed: ${changes.join(", ")}`);
      } else {
        onSuccess("Profile reviewed, no changes detected");
      }
      
      onClose();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      onError(`Error updating profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "profile"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile Information
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "security"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("security")}
          >
            Security & Email
          </button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50 rounded-lg">
            <HashLoader color="#3B82F6" loading={isLoading} size={50} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "profile" && (
            <>
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="relative w-24 h-24 mb-2 group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    {previewURL || photoURL ? (
                      <img
                        src={previewURL || photoURL}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <UserIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CameraSolidIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <p className="text-sm text-gray-500">
                  Click or drag and drop to change your profile photo
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {activeTab === "security" && (
            <>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address (Read-Only)
                </label>
                <div className="flex items-center">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md cursor-not-allowed"
                    disabled={true}
                    readOnly
                  />
                  {user?.emailVerified ? (
                    <span className="ml-2 text-green-600 flex items-center">
                      <CheckIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Verified</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Verify
                    </button>
                  )}
                </div>
                {showEmailVerificationSent && (
                  <p className="text-xs text-green-600 mt-1">
                    Verification email sent. Please check your inbox.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Email address cannot be changed through this form.
                </p>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password (leave blank to keep current)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      newPassword && newPassword !== confirmPassword
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {newPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Account Information */}
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Account Information</h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Account created: {user?.metadata.creationTime}</p>
                  <p>Last sign in: {user?.metadata.lastSignInTime}</p>
                  <p>User ID: {user?.uid}</p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditProfileModal; 
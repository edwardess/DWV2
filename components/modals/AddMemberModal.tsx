// Put the components/AddMemberModal.tsx code here 

"use client";
import React, { useState, FormEvent } from "react";
import Modal from "@/components/common/modals/Modal";
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import { useAuth } from "@/components/services/AuthProvider";
import { serverTimestamp } from "firebase/firestore";

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  currentMembers: User[];
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ visible, onClose, projectId, currentMembers }) => {
  const { user } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", searchEmail));
      const querySnapshot = await getDocs(q);
      const results: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL || "",
        });
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching user:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (member: User) => {
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        members: arrayUnion(member),
        memberIds: arrayUnion(member.uid),
        updatedAt: serverTimestamp(),
      });
      // Optionally remove the added member from search results.
      setSearchResults((prev) => prev.filter((res) => res.uid !== member.uid));
      alert(`Member ${member.email} added successfully.`);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member.");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white p-4 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Member</h2>
        <form onSubmit={handleSearch} className="mb-4">
          <input
            type="email"
            placeholder="Search by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            required
            className="border p-2 rounded w-full mb-2 text-sm"
          />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full text-sm">
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
        {searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div key={result.uid} className="flex items-center justify-between border p-2 rounded">
                <div className="flex items-center gap-2">
                  {result.photoURL ? (
                    <img src={result.photoURL} alt="Profile" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                      {result.displayName.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm">{result.email}</span>
                </div>
                <button
                  onClick={() => handleAddMember(result)}
                  className="bg-green-500 text-white text-sm p-1 rounded"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No results</p>
        )}
        <button onClick={onClose} className="mt-4 bg-gray-200 text-gray-800 p-2 rounded w-full text-sm">
          Close
        </button>
      </div>
    </Modal>
  );
};

export default AddMemberModal;

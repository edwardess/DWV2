// Put the components/DemoWrapper.tsx code here 

// DemoWrapper.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import HashLoader from "react-spinners/HashLoader";
import { useSnack } from "@/components/common/feedback/Snackbar";
import { ContinuousCalendar } from "@/components/pages/Calendar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { db } from "@/components/services/firebaseService";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import ContentPool from "@/components/common/media/ContentPool";
import EditImageModal from "@/components/modals/EditImageModal";
import DetailsModal from "@/components/modals/DetailsModal";
import UploadModal from "@/components/modals/UploadModal";
import { Attachment } from "@/components/common/media/AttachmentDropZone";
import { useAuth } from "@/components/services/AuthProvider";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface ImageMeta {
  url: string;
  title: string;
  description: string;
  caption?: string;
  label: string;
  comment: string;
  videoEmbed: string;
  contentType: string;
  location: string;
  lastMoved: Date;
  attachments?: Attachment[];
  comments?: any[]; // Ensure comments is always an array.
}

interface DemoWrapperProps {
  projectId: string; // Must be non-empty when a project is selected
  projectName?: string;
}

async function uploadFile(file: File): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  // Set cache-control to allow caching for 1 year (adjust as needed)
  const metadata = { cacheControl: "public, max-age=31536000" };
  const uploadTask = uploadBytesResumable(fileRef, file, metadata);
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            console.log("File uploaded successfully:", downloadURL);
            resolve(downloadURL);
          })
          .catch((err) => {
            console.error("Download URL error:", err);
            reject(err);
          });
      }
    );
  });
}

let processAttachmentFiles: (
  files: File[],
  setAttachmentFn: (files: Attachment[]) => void
) => Promise<void>;

export default function DemoWrapper({ projectId, projectName }: DemoWrapperProps) {
  const { createSnack } = useSnack();
  const { user } = useAuth();

  // New: selectedProjectId state, initialized from props or localStorage
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return projectId || localStorage.getItem("selectedProjectId") || "";
  });

  // When projectId prop changes, update selectedProjectId
  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, selectedProjectId]);

  // Persist selectedProjectId in localStorage
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("selectedProjectId", selectedProjectId);
    }
  }, [selectedProjectId]);

  const [activeTab, setActiveTab] = useState<"FBA CARE MAIN" | "Learning Hub" | "Podcast">("FBA CARE MAIN");
  const [activeInstance, setActiveInstance] = useState<"fbig" | "tiktok">("fbig");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [poolViewMode, setPoolViewMode] = useState<"full" | "list">("full");
  const [imageMetadata, setImageMetadata] = useState<{ [id: string]: ImageMeta }>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string>("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [currentDetailsId, setCurrentDetailsId] = useState<string>("");
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [detailsEditAttachments, setDetailsEditAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Log activity to the "activities" subcollection of the project.
  async function logActivity(message: string) {
    if (!selectedProjectId || !user) return;
    try {
      const activitiesCollection = collection(db, "projects", selectedProjectId, "activities");
      await addDoc(activitiesCollection, {
        message,
        timestamp: serverTimestamp(),
        user: {
          uid: user.uid,
          displayName: user.displayName || user.email,
        },
      });
      console.log("Activity logged:", message);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Process file attachments.
  processAttachmentFiles = async (files, setAttachmentFn) => {
    const remaining =
      5 - (setAttachmentFn === setEditAttachments ? editAttachments.length : detailsEditAttachments.length);
    const filesArray = Array.from(files).slice(0, remaining);
    setIsLoading(true);
    try {
      const uploads = filesArray.map(async (file) => {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          createSnack("Only images and videos are allowed.", "error");
          return null;
        }
        if (file.size > 300 * 1024 * 1024) {
          createSnack("File size exceeds 300MB limit.", "error");
          return null;
        }
        const downloadURL = await uploadFile(file);
        return { url: downloadURL, name: file.name };
      });
      const results = await Promise.all(uploads);
      const validResults = results.filter((res) => res !== null) as Attachment[];
      setAttachmentFn((prev) => [...prev, ...validResults]);
    } catch (error) {
      console.error("Attachment upload error:", error);
      createSnack("Failed to upload attachment.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for changes to the selected project document and update imageMetadata.
  useEffect(() => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    const docRef = doc(db, "projects", selectedProjectId);
    const unsub = onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        let instanceData = data.imageMetadata ? data.imageMetadata[activeInstance] || {} : {};
        const normalizedData: { [id: string]: ImageMeta } = {};
        Object.entries(instanceData).forEach(([id, meta]) => {
          normalizedData[id] = {
            ...meta,
            comments: (meta as any).comments || [],
            // Include carouselArrangement if it exists; otherwise default to an empty array.
            carouselArrangement: (meta as any).carouselArrangement || [],
            lastMoved:
              meta.lastMoved && typeof meta.lastMoved.toDate === "function"
                ? meta.lastMoved.toDate()
                : meta.lastMoved,
          };
        });
        console.log("Image metadata updated from Firestore:", normalizedData);
        setImageMetadata(normalizedData);
      } else {
        setImageMetadata({});
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [selectedProjectId, activeInstance]);

  // Update the project's imageMetadata field in Firestore.
  const updateImageMetadata = async (updatedInstanceData: { [id: string]: ImageMeta }) => {
    if (!selectedProjectId) {
      console.error("Project ID is not provided");
      return;
    }
    try {
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const projectDoc = await getDoc(projectDocRef);
      const projectData = projectDoc.exists() ? projectDoc.data() : {};
      const currentImageMetadata = projectData.imageMetadata || { fbig: {}, tiktok: {} };
      // Ensure each image metadata has a comments array.
      Object.entries(updatedInstanceData).forEach(([id, meta]) => {
        if (!meta.comments) {
          meta.comments = [];
        }
      });
      const newAllMeta = { ...currentImageMetadata, [activeInstance]: updatedInstanceData };
      await setDoc(projectDocRef, { imageMetadata: newAllMeta }, { merge: true });
      console.log("Firestore imageMetadata updated:", newAllMeta);
    } catch (error) {
      console.error("Error saving image metadata", error);
    }
  };

  const poolImages = useMemo(() => {
    return Object.entries(imageMetadata)
      .filter(([_, meta]) => meta.location === "pool")
      .sort(([, a], [, b]) => b.lastMoved.getTime() - a.lastMoved.getTime())
      .map(([id, meta]) => ({ id, url: meta.url }));
  }, [imageMetadata]);

  // Group dropped images by cell key (date).
  const groupedDroppedImages = useMemo(() => {
    const obj: { [date: string]: Array<{ id: string; url: string }> } = {};
    Object.entries(imageMetadata).forEach(([id, meta]) => {
      if (meta.location !== "pool") {
        if (!obj[meta.location]) {
          obj[meta.location] = [];
        }
        obj[meta.location].push({ id, url: meta.url });
      }
    });
    return obj;
  }, [imageMetadata]);

  // Handler for dropping an image onto a calendar cell.
  const handleDayDrop = async (day: number, month: number, year: number, imageId: string) => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    const targetKey = `${year}-${month}-${day}`;
    if (!imageMetadata[imageId]) {
      createSnack("Image not found in metadata.", "error");
      return;
    }
    if (imageMetadata[imageId].location === targetKey) return;
    const updatedImage = { ...imageMetadata[imageId], location: targetKey, lastMoved: new Date() };
    const updatedInstance = { ...imageMetadata, [imageId]: updatedImage };
    setImageMetadata(updatedInstance);
    try {
      await updateImageMetadata(updatedInstance);
    } catch (error) {
      console.error("Error updating image metadata", error);
      createSnack("Failed to update image metadata.", "error");
      return;
    }
    createSnack(`Dropped image on ${monthNames[month]} ${day}, ${year}`, "success");
    logActivity(`${user?.displayName} dropped '${imageMetadata[imageId].title}' on ${monthNames[month]} ${day}, ${year}`);
  };

  // Handler for dropping an image back to pool.
  const handlePoolDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    const imageId = e.dataTransfer.getData("imageId");
    if (!imageMetadata[imageId]) return;
    const updatedInstance = {
      ...imageMetadata,
      [imageId]: { ...imageMetadata[imageId], location: "pool", lastMoved: new Date() },
    };
    setImageMetadata(updatedInstance);
    await updateImageMetadata(updatedInstance);
    createSnack("Image moved back to pool.", "success");
    logActivity(`${user?.displayName} moved '${imageMetadata[imageId].title}' back to pool`);
  };

  const handleTabChange = (tab: "FBA CARE MAIN" | "Learning Hub" | "Podcast") => {
    setActiveTab(tab);
    setActiveInstance("fbig");
  };

  const openEditModal = (id: string) => {
    setCurrentEditId(id);
    setEditModalOpen(true);
    setEditAttachments(imageMetadata[id]?.attachments || []);
  };

  const saveMetadataHandler = async (newMeta: ImageMeta) => {
    if (!currentEditId || !imageMetadata[currentEditId]) {
      createSnack("No image selected for editing.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const updatedMeta: ImageMeta = { ...newMeta, attachments: editAttachments };
      const updatedInstance = { ...imageMetadata, [currentEditId]: updatedMeta };
      setImageMetadata(updatedInstance);
      await updateImageMetadata(updatedInstance);
      createSnack("Image updated successfully.", "success");
      setEditModalOpen(false);
      setCurrentEditId("");
      setEditAttachments([]);
      logActivity(`${user?.displayName} made changes to '${imageMetadata[currentEditId].title}'`);
    } catch (error) {
      console.error("Error updating image:", error);
      createSnack("Failed to update image.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onSeeDetails = (id: string) => {
    setCurrentDetailsId(id);
    setDetailsModalOpen(true);
    setDetailsEditMode(false);
    setDetailsEditAttachments(imageMetadata[id]?.attachments || []);
  };

  const handleUploadContent = async (formData: FormData, file: File): Promise<void> => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const label = formData.get("label") as string;
      const contentType = formData.get("contentType") as string;
      const videoEmbed = formData.get("videoEmbed") as string;
      if (!title.trim() || !label || !contentType || !file) {
        createSnack("Please fill in all required fields and drop a file.", "error");
        setIsLoading(false);
        return;
      }
      const downloadURL = await uploadFile(file);
      const id = crypto.randomUUID();
      const newMeta: ImageMeta = {
        url: downloadURL,
        title,
        description,
        label,
        comment: "",
        videoEmbed,
        contentType,
        location: "pool",
        lastMoved: new Date(),
        attachments: [],
        comments: [], // initialize empty comments array
      };
      const updatedInstance = { ...imageMetadata, [id]: newMeta };
      setImageMetadata(updatedInstance);
      await updateImageMetadata(updatedInstance);
      createSnack("Content uploaded successfully.", "success");
      setUploadModalOpen(false);
      setDroppedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      logActivity(`${user?.displayName} uploaded a new content: ${title}`);
    } catch (error) {
      console.error("Error during upload:", error);
      createSnack("An error occurred while uploading content.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this snippet inside your DemoWrapper component, after your other function definitions
  const handleCarouselArrangementSave = async (arrangement: { id: string; url: string }[]) => {
    if (!currentDetailsId) return; // Ensure a card is selected
    setIsLoading(true);
    try {
      // Process each image: if the URL is a blob, upload it to Firebase Storage.
      const processedArrangement = await Promise.all(arrangement.map(async (img) => {
        if (img.url.startsWith("blob:")) {
          // Fetch the blob from the blob URL
          const response = await fetch(img.url);
          const blobData = await response.blob();
          // Create a File from the blob data; adjust filename as needed.
          const file = new File([blobData], `${Date.now()}_carousel.jpg`, { type: blobData.type });
          // Upload the file using your existing uploadFile function
          const downloadURL = await uploadFile(file);
          return { id: img.id, url: downloadURL };
        }
        return img;
      }));
      // Get the project document reference.
      const projectDocRef = doc(db, "projects", selectedProjectId);
      // Fetch the current project data.
      const currentDoc = await getDoc(projectDocRef);
      const projectData = currentDoc.exists() ? currentDoc.data() : {};
      const currentImageMetadata = projectData.imageMetadata || { fbig: {}, tiktok: {} };
      // Update only the carouselArrangement field of the selected card.
      const updatedCard = {
        ...imageMetadata[currentDetailsId],
        carouselArrangement: processedArrangement,
      };
      const updatedInstance = { ...imageMetadata, [currentDetailsId]: updatedCard };
      const newAllMeta = { ...currentImageMetadata, [activeInstance]: updatedInstance };
      // Save the updated metadata back to Firestore.
      await setDoc(projectDocRef, { imageMetadata: newAllMeta }, { merge: true });
      setImageMetadata(updatedInstance);
    } catch (error) {
      console.error("Error saving carousel arrangement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <HashLoader color="white" loading={isLoading} size={150} />
        </div>
      )}
      <div className={`flex flex-1 flex-col ${activeInstance === "tiktok" ? "bg-gradient-to-b from-[#000000] via-[#00f2ea] to-[#ff0050] text-white" : ""}`}>
        <div className="px-5 pt-4 sm:px-8 sm:pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeInstance === "tiktok" ? "/logos/tiktok.png" : "/logos/fbig.png"}
                alt="Instance Logo"
                className="h-10 w-auto"
                loading="lazy"
              />
              <h2 className={`text-2xl font-bold ${activeInstance === "tiktok" ? "text-white" : ""}`}>
                Content Calendar for {activeInstance === "fbig" ? "FB & IG" : "TikTok"} {projectName ? `- ${projectName}` : ""}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveInstance("fbig")}
                className={`px-4 py-2 rounded font-semibold ${activeInstance === "fbig" ? "bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] text-white" : "bg-gray-200 text-gray-800"}`}
              >
                FB & IG
              </button>
              <button
                onClick={() => setActiveInstance("tiktok")}
                className={`px-4 py-2 rounded font-semibold ${activeInstance === "tiktok" ? "bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] text-white" : "bg-gray-200 text-gray-800"}`}
              >
                TikTok
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-row w-full h-full gap-4">
          <div className="relative h-full overflow-auto mt-4 flex-1 ml-4">
            <ContinuousCalendar
              onClick={(day, month, year) => {
                const msg = `Clicked on ${monthNames[month]} ${day}, ${year}`;
                createSnack(msg, "success");
              }}
              onImageDrop={(day, month, year, imageId) => handleDayDrop(day, month, year, imageId)}
              droppedImages={groupedDroppedImages}
              imageMetadata={imageMetadata}
              onSeeDetails={onSeeDetails}
            />
          </div>
          <ContentPool
            poolViewMode={poolViewMode}
            setPoolViewMode={setPoolViewMode}
            onUpload={() => setUploadModalOpen(true)}
            renderPoolImages={() =>
              poolViewMode === "full"
                ? poolImages.map(({ id, url }) => (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("imageId", id);
                        e.dataTransfer.setData("sourceKey", "pool");
                      }}
                      className="relative rounded-lg shadow-xl p-4 bg-gray-100 border border-[#047AC0] mb-4 cursor-move"
                    >
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`text-xs font-semibold text-white px-1 rounded ${
                              (() => {
                                const lbl = imageMetadata[id]?.label;
                                switch (lbl) {
                                  case "Approved":
                                    return "bg-green-500";
                                  case "Needs Revision":
                                    return "bg-orange-500";
                                  case "Ready for Approval":
                                    return "bg-purple-500";
                                  case "Scheduled":
                                    return "bg-blue-500";
                                  default:
                                    return "bg-gray-500";
                                }
                              })()
                            }`}
                          >
                            {imageMetadata[id]?.label}
                          </div>
                          <button onClick={() => openEditModal(id)} className="p-1" title="Edit">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-gray-600 hover:text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 17l-4 1 1-4 9.5-9.5z"
                              />
                            </svg>
                          </button>
                        </div>
                        <img src={url} alt="Pool Content" className="w-full h-auto object-cover rounded" loading="lazy"  />
                      </div>
                    </div>
                  ))
                : poolImages.map(({ id, url }) => (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("imageId", id);
                        e.dataTransfer.setData("sourceKey", "pool");
                      }}
                      className="flex items-center gap-2 p-2 shadow-lg rounded bg-white border-b border-gray-300 cursor-move mb-2"
                    >
                      <img src={url} alt="Pool Content" className="w-12 h-12 object-cover rounded border border-[#047AC0]" loading="lazy"  />
                      <div className="flex-1 ml-2 flex flex-col">
                        <div
                          className={`text-xs font-semibold text-white px-1 rounded mb-1 ${
                            (() => {
                              const lbl = imageMetadata[id]?.label;
                              switch (lbl) {
                                case "Approved":
                                  return "bg-green-500";
                                case "Needs Revision":
                                  return "bg-orange-500";
                                case "Ready for Approval":
                                  return "bg-purple-500";
                                case "Scheduled":
                                  return "bg-blue-500";
                                default:
                                  return "bg-gray-500";
                              }
                            })()
                          }`}
                        >
                          {(() => {
                            const lbl = imageMetadata[id]?.label;
                            if (lbl === "Needs Revision") return "Revision";
                            if (lbl === "Ready for Approval") return "For Approval";
                            return lbl;
                          })()}
                        </div>
                        <p className="text-xs font-medium">{imageMetadata[id]?.title}</p>
                      </div>
                      <button onClick={() => openEditModal(id)} className="p-1" title="Edit">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-600 hover:text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 17l-4 1 1-4 9.5-9.5z"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
            }
            onDragOver={(e) => e.preventDefault()}
            onDrop={handlePoolDrop}
          />
        </div>
        <UploadModal
          visible={uploadModalOpen}
          droppedFile={droppedFile}
          onClose={() => setUploadModalOpen(false)}
          onFileSelect={(file) => setDroppedFile(file)}
          onUpload={handleUploadContent}
        />
        <EditImageModal
          visible={editModalOpen}
          image={currentEditId ? imageMetadata[currentEditId] : null}
          onClose={() => {
            setEditModalOpen(false);
            setCurrentEditId("");
            setEditAttachments([]);
          }}
          onSave={saveMetadataHandler}
          processFiles={processAttachmentFiles}
          attachments={editAttachments}
          setAttachments={setEditAttachments}
        />
        <DetailsModal
          visible={detailsModalOpen}
          image={currentDetailsId ? imageMetadata[currentDetailsId] : null}
          editing={detailsEditMode}
          onToggleEdit={setDetailsEditMode}
          onClose={() => {
            setDetailsModalOpen(false);
            setDetailsEditMode(false);
            setCurrentDetailsId("");
          }}
          onSave={async (newMeta) => {
            setIsLoading(true);
            const currentDoc = await getDoc(doc(db, "projects", selectedProjectId));
            const projectData = currentDoc.exists() ? currentDoc.data() : {};
            const currentImageMetadata = projectData.imageMetadata || { fbig: {}, tiktok: {} };
            const updatedInstance = { ...imageMetadata, [currentDetailsId]: newMeta };
            const newAllMeta = { ...currentImageMetadata, [activeInstance]: updatedInstance };
            await setDoc(doc(db, "projects", selectedProjectId), { imageMetadata: newAllMeta }, { merge: true });
            setImageMetadata(updatedInstance);
            setIsLoading(false);
          }}
          processFiles={processAttachmentFiles}
          attachments={detailsEditAttachments}
          setAttachments={setDetailsEditAttachments}
          onCarouselArrangementSave={handleCarouselArrangementSave}
        />
      </div>
    </div>
  );
}

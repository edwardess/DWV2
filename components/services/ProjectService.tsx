// Put the components/service/ProjectService.tsx code here // components/service/projectService.ts
import { db } from "@/components/services/firebaseService";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export interface Project {
  projectName: string;
  owner: {
    uid: string;
    email: string;
    displayName: string;
  };
  members: {
    uid: string;
    email: string;
    displayName: string;
  }[];
  createdAt: any;
  imageMetadata: {
    fbig: { [key: string]: any };
    tiktok: { [key: string]: any };
  };
  droppedImages: {
    fbig: { [key: string]: any };
    tiktok: { [key: string]: any };
  };
}

export async function createProject(
  projectId: string,
  projectData: Omit<Project, "createdAt" | "imageMetadata" | "droppedImages">
): Promise<void> {
  const projectDoc: Project = {
    ...projectData,
    createdAt: serverTimestamp(),
    imageMetadata: { fbig: {}, tiktok: {} },
    droppedImages: { fbig: {}, tiktok: {} },
  };

  await setDoc(doc(db, "projects", projectId), projectDoc);
}

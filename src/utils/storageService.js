import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Uploads a file to Firebase Storage
 * @param {File} file - File object to upload
 * @param {string} path - Storage path (e.g., 'users/UID/attachments/filename')
 * @returns {Promise<string>} - Download URL
 */
export const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Deletes a file from Firebase Storage
 * @param {string} pathOrUrl - Storage path or Download URL
 */
export const deleteFile = async (pathOrUrl) => {
  // If it's a URL, we need to extract the path or just use the reference from URL
  // deleteObject can take a reference created from a URL
  try {
    const storageRef = ref(storage, pathOrUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file from storage:", error);
    // If it's not in storage (legacy), just ignore
  }
};

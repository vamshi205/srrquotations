import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Uploads a file to Firebase Storage with progress tracking
 * @param {File} file - File object to upload
 * @param {string} path - Storage path
 * @param {Function} onProgress - Optional callback for progress percentage (0-100)
 * @returns {Promise<string>} - Download URL
 */
export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      (error) => {
        reject(error);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
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

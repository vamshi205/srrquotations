import { storage, db } from '../firebase';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Uploads a file to Firebase Storage and saves its metadata to Firestore.
 */
export const uploadFile = async (file, folder = 'documents', onProgress = null) => {
  try {
    const fileId = Date.now().toString() + '_' + file.name;
    const path = `${folder}/${fileId}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Firebase Upload Error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            success: true,
            fileId: fileId,
            path: path,
            url: downloadURL
          });
        }
      );
    });
  } catch (err) {
    console.error('Upload Process Error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Deletes a file from Firebase Storage.
 */
export const deleteFile = async (fullPath) => {
  try {
    if (!fullPath) return true;
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.error('Firebase Delete Error:', err);
    return false;
  }
};

/**
 * Saves file metadata to Firestore.
 */
export const saveFileMetadata = async (collectionName, fileMetadata) => {
  try {
    const docRef = doc(db, collectionName, fileMetadata.id);
    await setDoc(docRef, fileMetadata);
    return true;
  } catch (err) {
    console.error('Firestore Metadata Save Error:', err);
    return false;
  }
};

/**
 * Deletes file metadata from Firestore.
 */
export const deleteFileMetadata = async (collectionName, fileId) => {
  try {
    const docRef = doc(db, collectionName, fileId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Firestore Metadata Delete Error:', err);
    return false;
  }
};

// Legacy support
export const getFileData = async (fileId) => {
  // In Firebase, we just use the public URL directly
  return null;
};

import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';

/**
 * Saves company metadata to a single Firestore document.
 */
export const saveCompanyData = async (data) => {
  try {
    const docRef = doc(db, 'settings', 'company');
    await setDoc(docRef, data);
    return true;
  } catch (err) {
    console.error('Firestore Save Error (Company):', err);
    return false;
  }
};

/**
 * Saves a template to the 'templates' collection.
 */
export const saveTemplate = async (template) => {
  try {
    const docRef = doc(db, 'templates', template.id);
    await setDoc(docRef, template);
    return true;
  } catch (err) {
    console.error('Firestore Save Error (Template):', err);
    return false;
  }
};

/**
 * Deletes a template from the 'templates' collection.
 */
export const deleteTemplate = async (templateId) => {
  try {
    const docRef = doc(db, 'templates', templateId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Firestore Delete Error (Template):', err);
    return false;
  }
};

/**
 * Saves a quotation history item to the 'history' collection.
 */
export const saveHistoryItem = async (item) => {
  try {
    const docRef = doc(db, 'history', item.id);
    await setDoc(docRef, item);
    return true;
  } catch (err) {
    console.error('Firestore Save Error (History):', err);
    return false;
  }
};

/**
 * Loads all data from Firestore collections.
 */
export const loadDatabase = async () => {
  try {
    // Load Company Data
    const companyRef = doc(db, 'settings', 'company');
    const companySnap = await getDoc(companyRef);
    const companyData = companySnap.exists() ? companySnap.data() : null;

    // Load Templates
    const templatesSnap = await getDocs(collection(db, 'templates'));
    const templates = templatesSnap.docs.map(doc => doc.data());

    // Load History (Limited to recent 100 for performance)
    const historyQuery = query(collection(db, 'history'), orderBy('id', 'desc'), limit(100));
    const historySnap = await getDocs(historyQuery);
    const history = historySnap.docs.map(doc => doc.data());

    // Load Price Lists
    const plSnap = await getDocs(collection(db, 'priceLists'));
    const priceLists = plSnap.docs.map(doc => doc.data());

    // Load Drive Files
    const dfSnap = await getDocs(collection(db, 'driveFiles'));
    const driveFilesData = dfSnap.docs.map(doc => doc.data());
    
    // Reconstruct driveFiles structure (srr/vendor)
    const srr = driveFilesData.filter(f => f.type === 'drive_srr');
    const vendorMap = {};
    driveFilesData.filter(f => f.type === 'drive_vendor_files').forEach(file => {
      if (!vendorMap[file.folderId]) vendorMap[file.folderId] = [];
      vendorMap[file.folderId].push(file);
    });

    const foldersSnap = await getDocs(collection(db, 'driveFolders'));
    const vendorFolders = foldersSnap.docs.map(doc => {
      const folder = doc.data();
      return { ...folder, files: vendorMap[folder.id] || [] };
    });

    return {
      companyData,
      templates,
      history,
      priceLists,
      driveFiles: { srr, vendor: vendorFolders }
    };
  } catch (err) {
    console.error('Firestore Load Error:', err);
    return null;
  }
};

// Legacy support
export const saveDatabase = async (data) => {
  return true; 
};

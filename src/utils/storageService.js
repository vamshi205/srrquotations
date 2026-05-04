/**
 * Converts a File object to a Base64 string
 * @param {File} file 
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the prefix (e.g., "data:application/pdf;base64,")
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Uploads a file to Google Drive via Google Apps Script
 * @param {File} file - File object to upload
 * @param {string} path - Ignored (kept for compatibility)
 * @param {Function} onProgress - Optional callback
 * @returns {Promise<object>} - { url, fileId, name, success }
 */
export const uploadFile = async (file, path, onProgress) => {
  const scriptUrl = import.meta.env.VITE_GMAIL_SCRIPT_URL;
  const token = import.meta.env.VITE_GMAIL_TOKEN;

  if (!scriptUrl) throw new Error("Google Apps Script URL not configured.");

  if (onProgress) onProgress(10);
  const base64 = await fileToBase64(file);
  if (onProgress) onProgress(40);

  const payload = {
    action: 'upload',
    token: token,
    fileName: file.name,
    fileType: file.type,
    base64: base64
  };

  try {
    // IMPORTANT: To get a response from GAS, we must use 'cors' mode.
    // We send as 'text/plain' to avoid the 'OPTIONS' preflight check which GAS doesn't support.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'cors', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Google Script returned status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result || result.error || !result.success) {
      throw new Error(result?.error || "Google Drive rejected the upload. Check script permissions.");
    }

    if (onProgress) onProgress(100);
    return result; // This now contains the REAL fileId and URL
  } catch (error) {
    console.error("Confirmed Upload Error:", error);
    // If it's a CORS error, it usually means the Script URL is wrong or the deployment is not set to 'Anyone'.
    if (error.message.includes('Failed to fetch')) {
      throw new Error("Connection to Google Script blocked. Please ensure the Script is deployed as 'Anyone'.");
    }
    throw error;
  }
};

/**
 * Deletes a file from Google Drive via Google Apps Script
 * @param {string} fileId - The Google Drive File ID
 */
export const deleteFile = async (fileId) => {
  if (!fileId || fileId.startsWith('http')) {
    console.warn("Cannot delete file without a valid File ID.");
    return;
  }

  const scriptUrl = import.meta.env.VITE_GMAIL_SCRIPT_URL;
  const token = import.meta.env.VITE_GMAIL_TOKEN;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'delete',
        token: token,
        fileId: fileId
      })
    });
  } catch (error) {
    console.error("Error deleting file from Google Drive:", error);
  }
};

/**
 * Crypto utilities for URL encryption/decryption
 * Note: This is a simplified client-side implementation
 * Real encryption/decryption happens on the server
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Encrypt ID for URL usage (calls backend)
 * @param {string} id - ID to encrypt
 * @returns {Promise<string>} - Encrypted URL-safe string
 */
export async function encryptId(id) {
  try {
    const response = await fetch(`${API}/crypto/encrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id })
    });
    
    if (!response.ok) {
      throw new Error('Encryption failed');
    }
    
    const data = await response.json();
    return data.encrypted;
  } catch (error) {
    console.error('Client-side encryption error:', error);
    // Fallback: base64 encode for development
    return btoa(id).replace(/[+/=]/g, (match) => {
      return { '+': '-', '/': '_', '=': '' }[match];
    });
  }
}

/**
 * Decrypt ID from URL (calls backend)
 * @param {string} encrypted - Encrypted string from URL
 * @returns {Promise<string>} - Original ID
 */
export async function decryptId(encrypted) {
  try {
    const response = await fetch(`${API}/crypto/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ encrypted })
    });
    
    if (!response.ok) {
      throw new Error('Decryption failed');
    }
    
    const data = await response.json();
    return data.decrypted;
  } catch (error) {
    console.error('Client-side decryption error:', error);
    // Fallback: base64 decode for development
    try {
      const base64 = encrypted.replace(/[-_]/g, (match) => {
        return { '-': '+', '_': '/' }[match];
      });
      const padding = '='.repeat((4 - base64.length % 4) % 4);
      return atob(base64 + padding);
    } catch (e) {
      throw new Error('Invalid encrypted ID');
    }
  }
}

/**
 * Build encrypted URL for individual routes
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID  
 * @param {string} path - Route path (e.g., 'dashboard', 'secim')
 * @returns {Promise<string>} - Encrypted URL
 */
export async function buildIndividualUrl(companyId, userId, path) {
  try {
    const [encCompanyId, encUserId] = await Promise.all([
      encryptId(companyId),
      encryptId(userId)
    ]);
    
    return `/${encCompanyId}/${encUserId}/${path}`;
  } catch (error) {
    console.error('Build URL error:', error);
    return `/${companyId}/${userId}/${path}`;
  }
}

/**
 * Parse encrypted URL parameters
 * @param {object} params - URL parameters from router
 * @returns {Promise<object>} - Decrypted parameters
 */
export async function parseEncryptedParams(params) {
  try {
    const { encCompanyId, encUserId } = params;
    
    if (!encCompanyId || !encUserId) {
      throw new Error('Missing encrypted parameters');
    }
    
    const [companyId, userId] = await Promise.all([
      decryptId(encCompanyId),
      decryptId(encUserId)
    ]);
    
    return { companyId, userId };
  } catch (error) {
    console.error('Parse encrypted params error:', error);
    throw new Error('Invalid encrypted URL parameters');
  }
}

/**
 * Verify session matches URL parameters (security check)
 * @param {string} companyId - Decrypted company ID
 * @param {string} userId - Decrypted user ID
 * @returns {Promise<boolean>} - True if session is valid
 */
export async function verifySession(companyId, userId) {
  try {
    const response = await fetch(`${API}/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId, userId })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Session verification error:', error);
    return false;
  }
}
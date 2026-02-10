const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// AES-256-GCM encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment or generate a warning
 * Key should be 32 bytes (256 bits) for AES-256
 */
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        console.warn('WARNING: ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)');
        // Default key for development only - MUST be replaced in production
        return crypto.scryptSync('default-dev-key', 'salt', 32);
    }
    // Derive a 32-byte key from the environment variable
    return crypto.scryptSync(key, 'autism-care-salt', 32);
};

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer} data - Data to encrypt
 * @returns {Buffer} - Encrypted data with IV and auth tag prepended
 */
const encrypt = (data) => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
};

/**
 * Decrypt data using AES-256-GCM
 * @param {Buffer} encryptedData - Encrypted data with IV and auth tag
 * @returns {Buffer} - Decrypted data
 */
const decrypt = (encryptedData) => {
    const key = getEncryptionKey();

    // Extract IV, auth tag, and encrypted content
    const iv = encryptedData.slice(0, IV_LENGTH);
    const authTag = encryptedData.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedData.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

/**
 * Encrypt a file and save it
 * @param {string} inputPath - Path to the file to encrypt
 * @param {string} outputPath - Path to save the encrypted file
 */
const encryptFile = async (inputPath, outputPath = null) => {
    try {
        const data = await fs.readFile(inputPath);
        const encryptedData = encrypt(data);

        const targetPath = outputPath || inputPath + '.enc';
        await fs.writeFile(targetPath, encryptedData);

        return targetPath;
    } catch (error) {
        console.error('Error encrypting file:', error);
        throw error;
    }
};

/**
 * Decrypt a file and return the data
 * @param {string} filePath - Path to the encrypted file
 * @returns {Buffer} - Decrypted file data
 */
const decryptFile = async (filePath) => {
    try {
        const encryptedData = await fs.readFile(filePath);
        return decrypt(encryptedData);
    } catch (error) {
        console.error('Error decrypting file:', error);
        throw error;
    }
};

/**
 * Encrypt a file in place (replace original with encrypted version)
 * @param {string} filePath - Path to the file
 */
const encryptFileInPlace = async (filePath) => {
    try {
        const data = await fs.readFile(filePath);
        const encryptedData = encrypt(data);
        await fs.writeFile(filePath, encryptedData);
        return true;
    } catch (error) {
        console.error('Error encrypting file in place:', error);
        throw error;
    }
};

/**
 * Check if encryption is properly configured
 */
const isEncryptionConfigured = () => {
    return !!process.env.ENCRYPTION_KEY;
};

module.exports = {
    encrypt,
    decrypt,
    encryptFile,
    decryptFile,
    encryptFileInPlace,
    isEncryptionConfigured
};

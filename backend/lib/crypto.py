"""
AES-256-GCM Encryption helpers for secure URL encoding
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
import json
from typing import Union, Dict, Any

class EncryptionError(Exception):
    """Custom encryption error"""
    pass

class CryptoHelper:
    def __init__(self):
        # Get encryption key from environment (32 bytes for AES-256)
        key_b64 = os.environ.get('ENCRYPTION_KEY')
        if not key_b64:
            raise ValueError("ENCRYPTION_KEY environment variable not set")
        
        try:
            self.key = base64.b64decode(key_b64)
            if len(self.key) != 32:
                raise ValueError("ENCRYPTION_KEY must be 32 bytes (base64 encoded)")
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {e}")
        
        self.aesgcm = AESGCM(self.key)

    def encrypt_id(self, id_value: str) -> str:
        """
        Encrypt a single ID value for URL usage
        Returns URL-safe base64 encoded string containing nonce + ciphertext + auth_tag
        """
        try:
            # Convert to bytes
            plaintext = id_value.encode('utf-8')
            
            # Generate random nonce (96 bits / 12 bytes recommended for GCM)
            nonce = os.urandom(12)
            
            # Encrypt and authenticate
            ciphertext = self.aesgcm.encrypt(nonce, plaintext, None)
            
            # Combine nonce + ciphertext (auth tag is included in ciphertext)
            combined = nonce + ciphertext
            
            # Return URL-safe base64 encoded
            return base64.urlsafe_b64encode(combined).decode('ascii').rstrip('=')
            
        except Exception as e:
            raise EncryptionError(f"Failed to encrypt ID: {e}")

    def decrypt_id(self, encrypted_value: str) -> str:
        """
        Decrypt an encrypted ID value from URL
        Returns the original ID string
        """
        try:
            # Add padding if needed and decode from URL-safe base64
            padding_needed = 4 - (len(encrypted_value) % 4)
            if padding_needed != 4:
                encrypted_value += '=' * padding_needed
            
            combined = base64.urlsafe_b64decode(encrypted_value.encode('ascii'))
            
            # Extract nonce and ciphertext
            if len(combined) < 12:
                raise ValueError("Invalid encrypted data length")
            
            nonce = combined[:12]
            ciphertext = combined[12:]
            
            # Decrypt and verify
            plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
            
            return plaintext.decode('utf-8')
            
        except InvalidTag:
            raise EncryptionError("Authentication failed - data may be tampered")
        except Exception as e:
            raise EncryptionError(f"Failed to decrypt ID: {e}")

    def encrypt_data(self, data: Dict[str, Any]) -> str:
        """
        Encrypt complex data structure for URL usage
        """
        try:
            # Convert to JSON string
            json_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
            plaintext = json_str.encode('utf-8')
            
            # Generate nonce
            nonce = os.urandom(12)
            
            # Encrypt
            ciphertext = self.aesgcm.encrypt(nonce, plaintext, None)
            
            # Combine and encode
            combined = nonce + ciphertext
            return base64.urlsafe_b64encode(combined).decode('ascii').rstrip('=')
            
        except Exception as e:
            raise EncryptionError(f"Failed to encrypt data: {e}")

    def decrypt_data(self, encrypted_value: str) -> Dict[str, Any]:
        """
        Decrypt complex data structure from URL
        """
        try:
            # Decode
            padding_needed = 4 - (len(encrypted_value) % 4)
            if padding_needed != 4:
                encrypted_value += '=' * padding_needed
            
            combined = base64.urlsafe_b64decode(encrypted_value.encode('ascii'))
            
            # Extract parts
            if len(combined) < 12:
                raise ValueError("Invalid encrypted data length")
            
            nonce = combined[:12]
            ciphertext = combined[12:]
            
            # Decrypt
            plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
            
            # Parse JSON
            return json.loads(plaintext.decode('utf-8'))
            
        except InvalidTag:
            raise EncryptionError("Authentication failed - data may be tampered")
        except json.JSONDecodeError:
            raise EncryptionError("Invalid data format")
        except Exception as e:
            raise EncryptionError(f"Failed to decrypt data: {e}")

# Global instance
_crypto_helper = None

def get_crypto_helper() -> CryptoHelper:
    """Get singleton crypto helper instance"""
    global _crypto_helper
    if _crypto_helper is None:
        _crypto_helper = CryptoHelper()
    return _crypto_helper

# Convenience functions
def encrypt_id(id_value: str) -> str:
    """Encrypt a single ID for URL usage"""
    return get_crypto_helper().encrypt_id(id_value)

def decrypt_id(encrypted_value: str) -> str:
    """Decrypt a single ID from URL"""
    return get_crypto_helper().decrypt_id(encrypted_value)

def encrypt_data(data: Dict[str, Any]) -> str:
    """Encrypt complex data for URL usage"""
    return get_crypto_helper().encrypt_data(data)

def decrypt_data(encrypted_value: str) -> Dict[str, Any]:
    """Decrypt complex data from URL"""
    return get_crypto_helper().decrypt_data(encrypted_value)
// lib/fingerprint-webauthn.js
// SIMPLE FINGERPRINT - NO SDK NEEDED!
// Works with Windows Hello and your Microsoft Fingerprint Reader 4200

class WebAuthnFingerprint {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 
                       window.PublicKeyCredential !== undefined;
  }

  /**
   * Check if fingerprint is available
   */
  async isAvailable() {
    if (!this.isSupported) {
      return {
        available: false,
        error: 'WebAuthn not supported in this browser'
      };
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        available: available,
        error: available ? null : 'No fingerprint reader detected'
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Initialize - just checks if ready
   */
  async initialize() {
    console.log('🔧 Checking fingerprint availability...');
    
    const check = await this.isAvailable();
    
    if (!check.available) {
      return {
        success: false,
        error: check.error || 'Fingerprint not available'
      };
    }

    console.log('✅ Fingerprint scanner ready');
    return { success: true };
  }

  /**
   * Capture fingerprint and create template
   * Returns a credential that can be stored and used for verification
   */
  async capture(userId, userName) {
    try {
      console.log('👆 Waiting for fingerprint...');

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential options
      const publicKeyOptions = {
        challenge: challenge,
        rp: {
          name: "Student Management System",
          id: window.location.hostname
        },
        user: {
          id: this.stringToBuffer(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "direct"
      };

      // Capture fingerprint (Windows Hello prompt appears)
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });

      console.log('✅ Fingerprint captured');

      // Extract template (credential ID)
      const template = this.bufferToBase64(credential.rawId);

      return {
        success: true,
        template: template, // This is what you store in database
        credentialId: template,
        publicKey: this.bufferToBase64(credential.response.getPublicKey())
      };

    } catch (error) {
      console.error('❌ Capture failed:', error);
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Fingerprint scan cancelled or failed'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint'
      };
    }
  }

  /**
   * Verify fingerprint against stored credentials
   * credentialIds: array of stored credential IDs from database
   */
  async verify(credentialIds) {
    try {
      console.log('🔍 Verifying fingerprint...');

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Convert credential IDs to proper format
      const allowCredentials = credentialIds.map(id => ({
        type: "public-key",
        id: this.base64ToBuffer(id)
      }));

      const publicKeyOptions = {
        challenge: challenge,
        allowCredentials: allowCredentials,
        userVerification: "required",
        timeout: 60000
      };

      console.log('👆 Place finger on scanner...');

      // Verify with fingerprint
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      console.log('✅ Fingerprint verified');

      // Return the matched credential ID
      const matchedCredentialId = this.bufferToBase64(assertion.rawId);

      return {
        success: true,
        matched: true,
        credentialId: matchedCredentialId,
        confidence: 100 // WebAuthn is binary: match or no match
      };

    } catch (error) {
      console.error('❌ Verification failed:', error);

      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          matched: false,
          error: 'Fingerprint verification cancelled'
        };
      }

      return {
        success: false,
        matched: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Compare - WebAuthn doesn't need manual comparison
   * It handles matching automatically during verify()
   */
  async compare(template1, template2) {
    // For WebAuthn, we don't manually compare
    // Instead, we use verify() with credential IDs
    return {
      matched: template1 === template2,
      confidence: template1 === template2 ? 100 : 0
    };
  }

  // Helper functions
  stringToBuffer(str) {
    return new TextEncoder().encode(str);
  }

  bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async stop() {
    // WebAuthn doesn't need cleanup
    console.log('🛑 Scanner ready for next scan');
  }
}

// Export singleton
export default new WebAuthnFingerprint();

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// 1. ENROLLMENT (Save student fingerprint):

import fingerprintScanner from '@/lib/fingerprint-webauthn';

const enrollFingerprint = async (studentId, matricNumber) => {
  // Initialize
  const initResult = await fingerprintScanner.initialize();
  if (!initResult.success) {
    alert(initResult.error);
    return;
  }

  // Capture
  const captureResult = await fingerprintScanner.capture(
    studentId,
    matricNumber
  );

  if (captureResult.success) {
    // Save to database
    await saveFingerprints(studentId, {
      thumb: captureResult.template, // Store this in database
      // OR store in a dedicated field:
      webauthnCredential: captureResult.template
    });
  }
};

// 2. VERIFICATION (Check fingerprint):

const verifyFingerprint = async () => {
  // Get all stored credential IDs from database
  const students = await getAllStudents();
  const credentialIds = students
    .map(s => s.thumbTemplate || s.webauthnCredential)
    .filter(Boolean);

  // Verify
  const verifyResult = await fingerprintScanner.verify(credentialIds);

  if (verifyResult.matched) {
    // Find which student matched
    const matchedStudent = students.find(
      s => (s.thumbTemplate || s.webauthnCredential) === verifyResult.credentialId
    );
    console.log('Matched student:', matchedStudent);
  }
};
*/
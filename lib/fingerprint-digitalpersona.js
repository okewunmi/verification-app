// // lib/fingerprint-webauthn.js
// // SIMPLE FINGERPRINT - NO SDK NEEDED!
// // Works with Windows Hello and your Microsoft Fingerprint Reader 4200

// class WebAuthnFingerprint {
//   constructor() {
//     this.isSupported = typeof window !== 'undefined' && 
//                        window.PublicKeyCredential !== undefined;
//   }

//   /**
//    * Check if fingerprint is available
//    */
//   async isAvailable() {
//     if (!this.isSupported) {
//       return {
//         available: false,
//         error: 'WebAuthn not supported in this browser'
//       };
//     }

//     try {
//       const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
//       return {
//         available: available,
//         error: available ? null : 'No fingerprint reader detected'
//       };
//     } catch (error) {
//       return { available: false, error: error.message };
//     }
//   }

//   /**
//    * Initialize - just checks if ready
//    */
//   async initialize() {
//     console.log('🔧 Checking fingerprint availability...');
    
//     const check = await this.isAvailable();
    
//     if (!check.available) {
//       return {
//         success: false,
//         error: check.error || 'Fingerprint not available'
//       };
//     }

//     console.log('✅ Fingerprint scanner ready');
//     return { success: true };
//   }

//   /**
//    * Capture fingerprint and create template
//    * Returns a credential that can be stored and used for verification
//    */
//   async capture(userId, userName) {
//     try {
//       console.log('👆 Waiting for fingerprint...');

//       // Generate challenge
//       const challenge = new Uint8Array(32);
//       crypto.getRandomValues(challenge);

//       // Create credential options
//       const publicKeyOptions = {
//         challenge: challenge,
//         rp: {
//           name: "Student Management System",
//           id: window.location.hostname
//         },
//         user: {
//           id: this.stringToBuffer(userId),
//           name: userName,
//           displayName: userName
//         },
//         pubKeyCredParams: [
//           { type: "public-key", alg: -7 },  // ES256
//           { type: "public-key", alg: -257 } // RS256
//         ],
//         authenticatorSelection: {
//           authenticatorAttachment: "platform",
//           userVerification: "required"
//         },
//         timeout: 60000,
//         attestation: "direct"
//       };

//       // Capture fingerprint (Windows Hello prompt appears)
//       const credential = await navigator.credentials.create({
//         publicKey: publicKeyOptions
//       });

//       console.log('✅ Fingerprint captured');

//       // Extract template (credential ID)
//       const template = this.bufferToBase64(credential.rawId);

//       return {
//         success: true,
//         template: template, // This is what you store in database
//         credentialId: template,
//         publicKey: this.bufferToBase64(credential.response.getPublicKey())
//       };

//     } catch (error) {
//       console.error('❌ Capture failed:', error);
      
//       if (error.name === 'NotAllowedError') {
//         return {
//           success: false,
//           error: 'Fingerprint scan cancelled or failed'
//         };
//       }

//       return {
//         success: false,
//         error: error.message || 'Failed to capture fingerprint'
//       };
//     }
//   }

//   /**
//    * Verify fingerprint against stored credentials
//    * credentialIds: array of stored credential IDs from database
//    */
//   async verify(credentialIds) {
//     try {
//       console.log('🔍 Verifying fingerprint...');

//       // Generate challenge
//       const challenge = new Uint8Array(32);
//       crypto.getRandomValues(challenge);

//       // Convert credential IDs to proper format
//       const allowCredentials = credentialIds.map(id => ({
//         type: "public-key",
//         id: this.base64ToBuffer(id)
//       }));

//       const publicKeyOptions = {
//         challenge: challenge,
//         allowCredentials: allowCredentials,
//         userVerification: "required",
//         timeout: 60000
//       };

//       console.log('👆 Place finger on scanner...');

//       // Verify with fingerprint
//       const assertion = await navigator.credentials.get({
//         publicKey: publicKeyOptions
//       });

//       console.log('✅ Fingerprint verified');

//       // Return the matched credential ID
//       const matchedCredentialId = this.bufferToBase64(assertion.rawId);

//       return {
//         success: true,
//         matched: true,
//         credentialId: matchedCredentialId,
//         confidence: 100 // WebAuthn is binary: match or no match
//       };

//     } catch (error) {
//       console.error('❌ Verification failed:', error);

//       if (error.name === 'NotAllowedError') {
//         return {
//           success: false,
//           matched: false,
//           error: 'Fingerprint verification cancelled'
//         };
//       }

//       return {
//         success: false,
//         matched: false,
//         error: error.message || 'Verification failed'
//       };
//     }
//   }

//   /**
//    * Compare - WebAuthn doesn't need manual comparison
//    * It handles matching automatically during verify()
//    */
//   async compare(template1, template2) {
//     // For WebAuthn, we don't manually compare
//     // Instead, we use verify() with credential IDs
//     return {
//       matched: template1 === template2,
//       confidence: template1 === template2 ? 100 : 0
//     };
//   }

//   // Helper functions
//   stringToBuffer(str) {
//     return new TextEncoder().encode(str);
//   }

//   bufferToBase64(buffer) {
//     const bytes = new Uint8Array(buffer);
//     let binary = '';
//     for (let i = 0; i < bytes.byteLength; i++) {
//       binary += String.fromCharCode(bytes[i]);
//     }
//     return btoa(binary);
//   }

//   base64ToBuffer(base64) {
//     const binary = atob(base64);
//     const bytes = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i++) {
//       bytes[i] = binary.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }

//   async stop() {
//     // WebAuthn doesn't need cleanup
//     console.log('🛑 Scanner ready for next scan');
//   }
// }

// // Export singleton
// export default new WebAuthnFingerprint();

// // ========================================
// // USAGE EXAMPLES
// // ========================================

// /*
// // 1. ENROLLMENT (Save student fingerprint):

// import fingerprintScanner from '@/lib/fingerprint-webauthn';

// const enrollFingerprint = async (studentId, matricNumber) => {
//   // Initialize
//   const initResult = await fingerprintScanner.initialize();
//   if (!initResult.success) {
//     alert(initResult.error);
//     return;
//   }

//   // Capture
//   const captureResult = await fingerprintScanner.capture(
//     studentId,
//     matricNumber
//   );

//   if (captureResult.success) {
//     // Save to database
//     await saveFingerprints(studentId, {
//       thumb: captureResult.template, // Store this in database
//       // OR store in a dedicated field:
//       webauthnCredential: captureResult.template
//     });
//   }
// };

// // 2. VERIFICATION (Check fingerprint):

// const verifyFingerprint = async () => {
//   // Get all stored credential IDs from database
//   const students = await getAllStudents();
//   const credentialIds = students
//     .map(s => s.thumbTemplate || s.webauthnCredential)
//     .filter(Boolean);

//   // Verify
//   const verifyResult = await fingerprintScanner.verify(credentialIds);

//   if (verifyResult.matched) {
//     // Find which student matched
//     const matchedStudent = students.find(
//       s => (s.thumbTemplate || s.webauthnCredential) === verifyResult.credentialId
//     );
//     console.log('Matched student:', matchedStudent);
//   }
// };
// */

// lib/fingerprint-webauthn.js
// FIXED VERSION - Proper user field handling

// class WebAuthnFingerprint {
//   constructor() {
//     this.isSupported = typeof window !== 'undefined' && 
//                        window.PublicKeyCredential !== undefined;
//   }

//   /**
//    * Check if fingerprint is available
//    */
//   async isAvailable() {
//     if (!this.isSupported) {
//       return {
//         available: false,
//         error: 'WebAuthn not supported in this browser'
//       };
//     }

//     try {
//       const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
//       return {
//         available: available,
//         error: available ? null : 'No fingerprint reader detected'
//       };
//     } catch (error) {
//       return { available: false, error: error.message };
//     }
//   }

//   /**
//    * Initialize - just checks if ready
//    */
//   async initialize() {
//     console.log('🔧 Checking fingerprint availability...');
    
//     const check = await this.isAvailable();
    
//     if (!check.available) {
//       return {
//         success: false,
//         error: check.error || 'Fingerprint not available'
//       };
//     }

//     console.log('✅ Fingerprint scanner ready');
//     return { success: true };
//   }

//   /**
//    * Capture fingerprint and create template
//    * Returns a credential that can be stored and used for verification
//    */
//   async capture(userId = null, userName = null) {
//     try {
//       console.log('👆 Waiting for fingerprint...');

//       // Generate unique IDs if not provided
//       const actualUserId = userId || `user_${Date.now()}`;
//       const actualUserName = userName || `Student_${Date.now()}`;

//       // Generate challenge
//       const challenge = new Uint8Array(32);
//       crypto.getRandomValues(challenge);

//       // Create credential options with REQUIRED user fields
//       const publicKeyOptions = {
//         challenge: challenge,
//         rp: {
//           name: "Student Management System",
//           id: window.location.hostname
//         },
//         user: {
//           id: this.stringToBuffer(actualUserId),
//           name: actualUserName, // REQUIRED - this was missing/undefined
//           displayName: actualUserName // REQUIRED - this was missing/undefined
//         },
//         pubKeyCredParams: [
//           { type: "public-key", alg: -7 },  // ES256
//           { type: "public-key", alg: -257 } // RS256
//         ],
//         authenticatorSelection: {
//           authenticatorAttachment: "platform",
//           userVerification: "required",
//           requireResidentKey: false
//         },
//         timeout: 60000,
//         attestation: "none" // Changed from "direct" to avoid unnecessary data
//       };

//       console.log('🔐 Creating credential with user:', actualUserName);

//       // Capture fingerprint (Windows Hello prompt appears)
//       const credential = await navigator.credentials.create({
//         publicKey: publicKeyOptions
//       });

//       console.log('✅ Fingerprint captured');

//       // Extract template (credential ID)
//       const template = this.bufferToBase64(credential.rawId);

//       return {
//         success: true,
//         template: template, // This is what you store in database
//         credentialId: template,
//         publicKey: credential.response.getPublicKey ? 
//           this.bufferToBase64(credential.response.getPublicKey()) : null
//       };

//     } catch (error) {
//       console.error('❌ Capture failed:', error);
      
//       if (error.name === 'NotAllowedError') {
//         return {
//           success: false,
//           error: 'Fingerprint scan cancelled or failed. Please try again.'
//         };
//       }

//       if (error.name === 'InvalidStateError') {
//         return {
//           success: false,
//           error: 'This fingerprint is already registered. Please use a different finger.'
//         };
//       }

//       return {
//         success: false,
//         error: error.message || 'Failed to capture fingerprint'
//       };
//     }
//   }

//   /**
//    * Verify fingerprint against stored credentials
//    * credentialIds: array of stored credential IDs from database
//    */
//   async verify(credentialIds) {
//     try {
//       console.log('🔍 Verifying fingerprint...');

//       if (!credentialIds || credentialIds.length === 0) {
//         return {
//           success: false,
//           matched: false,
//           error: 'No credentials provided for verification'
//         };
//       }

//       // Generate challenge
//       const challenge = new Uint8Array(32);
//       crypto.getRandomValues(challenge);

//       // Convert credential IDs to proper format
//       const allowCredentials = credentialIds.map(id => ({
//         type: "public-key",
//         id: this.base64ToBuffer(id),
//         transports: ["internal"] // For Windows Hello
//       }));

//       const publicKeyOptions = {
//         challenge: challenge,
//         allowCredentials: allowCredentials,
//         userVerification: "required",
//         timeout: 60000
//       };

//       console.log(`👆 Place finger on scanner (checking ${credentialIds.length} credentials)...`);

//       // Verify with fingerprint
//       const assertion = await navigator.credentials.get({
//         publicKey: publicKeyOptions
//       });

//       console.log('✅ Fingerprint verified');

//       // Return the matched credential ID
//       const matchedCredentialId = this.bufferToBase64(assertion.rawId);

//       return {
//         success: true,
//         matched: true,
//         credentialId: matchedCredentialId,
//         confidence: 100 // WebAuthn is binary: match or no match
//       };

//     } catch (error) {
//       console.error('❌ Verification failed:', error);

//       if (error.name === 'NotAllowedError') {
//         return {
//           success: false,
//           matched: false,
//           error: 'Fingerprint verification cancelled or timeout'
//         };
//       }

//       return {
//         success: false,
//         matched: false,
//         error: error.message || 'Verification failed'
//       };
//     }
//   }

//   /**
//    * Compare - WebAuthn doesn't need manual comparison
//    * It handles matching automatically during verify()
//    */
//   async compare(template1, template2) {
//     // For WebAuthn, we don't manually compare
//     // Instead, we use verify() with credential IDs
//     return {
//       matched: template1 === template2,
//       confidence: template1 === template2 ? 100 : 0
//     };
//   }

//   // Helper functions
//   stringToBuffer(str) {
//     return new TextEncoder().encode(str);
//   }

//   bufferToBase64(buffer) {
//     const bytes = new Uint8Array(buffer);
//     let binary = '';
//     for (let i = 0; i < bytes.byteLength; i++) {
//       binary += String.fromCharCode(bytes[i]);
//     }
//     return btoa(binary);
//   }

//   base64ToBuffer(base64) {
//     const binary = atob(base64);
//     const bytes = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i++) {
//       bytes[i] = binary.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }

//   async stop() {
//     // WebAuthn doesn't need cleanup
//     console.log('🛑 Scanner ready for next scan');
//   }
// }

// // Export singleton
// export default new WebAuthnFingerprint();

// lib/fingerprint-digitalpersona.js
// PRODUCTION-READY DIGITALPERSONA IMPLEMENTATION
// Works with DigitalPersona U.are.U 4500 and other DigitalPersona readers

class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.currentCapture = null;
  }

  /**
   * Initialize DigitalPersona SDK
   */
  async initialize() {
    try {
      console.log('🔧 Initializing DigitalPersona SDK...');

      // Check if DigitalPersona WebSDK is loaded
      if (typeof Fingerprint === 'undefined') {
        return {
          success: false,
          error: 'DigitalPersona SDK not loaded. Please ensure the SDK script is included in your HTML.'
        };
      }

      // Create SDK instance
      this.sdk = new Fingerprint.WebApi();

      // Check if reader is available
      const devices = await this.sdk.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        return {
          success: false,
          error: 'No fingerprint reader detected. Please connect your DigitalPersona device.'
        };
      }

      this.reader = devices[0]; // Use first available reader
      this.isInitialized = true;

      console.log('✅ DigitalPersona SDK initialized successfully');
      console.log('📱 Reader:', this.reader);

      return {
        success: true,
        reader: this.reader,
        message: 'Scanner ready'
      };

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize scanner'
      };
    }
  }

  /**
   * Check if scanner is available
   */
  async isAvailable() {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        return { available: initResult.success, error: initResult.error };
      }

      const devices = await this.sdk.enumerateDevices();
      return {
        available: devices && devices.length > 0,
        error: devices.length === 0 ? 'No fingerprint reader connected' : null
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Capture single fingerprint
   * Returns FMD (Fingerprint Minutiae Data) template as Base64 string
   */
  async capture(userId = null, fingerName = 'Unknown') {
    try {
      console.log(`👆 Capturing ${fingerName}...`);

      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      // Start capture with quality threshold
      const sample = await this.sdk.startAcquisition(
        Fingerprint.SampleFormat.PngImage, // Get image
        this.reader
      );

      console.log('📸 Fingerprint image captured');

      // Convert to FMD template (this is what we store)
      const fmdData = await this.sdk.createFmd(
        sample,
        Fingerprint.FmdFormat.ANSI_378_2004 // Standard format
      );

      // Get quality score (0-100)
      const quality = await this.getQualityScore(sample);

      console.log(`✅ ${fingerName} captured with quality: ${quality}%`);

      // Convert FMD to Base64 string for storage
      const template = this.arrayBufferToBase64(fmdData);

      // Stop acquisition
      await this.sdk.stopAcquisition(this.reader);

      return {
        success: true,
        template: template, // Store this in database (Base64 string)
        quality: quality,
        fingerName: fingerName,
        image: sample, // PNG image data (optional - for preview)
        capturedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Capture failed:', error);

      // Stop acquisition on error
      try {
        if (this.sdk && this.reader) {
          await this.sdk.stopAcquisition(this.reader);
        }
      } catch (stopError) {
        console.error('Error stopping acquisition:', stopError);
      }

      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint'
      };
    }
  }

  /**
   * Get fingerprint quality score
   */
  async getQualityScore(sample) {
    try {
      const quality = await this.sdk.getQuality(sample);
      
      // DigitalPersona quality values:
      // 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
      const qualityMap = {
        1: 40,  // Poor
        2: 60,  // Fair
        3: 75,  // Good
        4: 90,  // Very Good
        5: 100  // Excellent
      };

      return qualityMap[quality] || 50;
    } catch (error) {
      console.warn('Could not get quality score:', error);
      return 75; // Default quality
    }
  }

  /**
   * Verify fingerprint against stored templates
   * Returns matched credential ID if found
   */
  async verify(storedTemplates) {
    try {
      console.log('🔍 Starting verification...');
      console.log(`📋 Checking against ${storedTemplates.length} stored templates`);

      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      if (!storedTemplates || storedTemplates.length === 0) {
        return {
          success: false,
          matched: false,
          error: 'No templates provided for verification'
        };
      }

      // Capture fingerprint to verify
      console.log('👆 Place finger on scanner...');
      
      const sample = await this.sdk.startAcquisition(
        Fingerprint.SampleFormat.PngImage,
        this.reader
      );

      console.log('📸 Verification sample captured');

      // Convert to FMD
      const probeFmd = await this.sdk.createFmd(
        sample,
        Fingerprint.FmdFormat.ANSI_378_2004
      );

      // Stop acquisition
      await this.sdk.stopAcquisition(this.reader);

      // Compare with each stored template
      let bestMatch = null;
      let highestScore = 0;
      const MATCH_THRESHOLD = 20000; // DigitalPersona threshold (lower = better match)

      for (const stored of storedTemplates) {
        try {
          // Convert Base64 template back to ArrayBuffer
          const storedFmd = this.base64ToArrayBuffer(stored.template);

          // Compare fingerprints
          const result = await this.sdk.compare(
            probeFmd,
            storedFmd,
            Fingerprint.FmdFormat.ANSI_378_2004
          );

          console.log(`  🔄 Comparing with ${stored.id || 'template'}: Score = ${result}`);

          // Lower score = better match in DigitalPersona
          if (result <= MATCH_THRESHOLD && result < highestScore || highestScore === 0) {
            highestScore = result;
            bestMatch = stored;
          }

        } catch (compareError) {
          console.warn(`  ⚠️ Error comparing template:`, compareError.message);
          continue;
        }
      }

      if (bestMatch) {
        console.log('✅ MATCH FOUND!');
        console.log(`  Match score: ${highestScore} (threshold: ${MATCH_THRESHOLD})`);
        
        // Calculate confidence percentage (inverse of score)
        const confidence = Math.max(0, Math.min(100, 
          ((MATCH_THRESHOLD - highestScore) / MATCH_THRESHOLD) * 100
        ));

        return {
          success: true,
          matched: true,
          credentialId: bestMatch.id,
          matchedTemplate: bestMatch,
          confidence: confidence.toFixed(1),
          matchScore: highestScore
        };
      }

      console.log('❌ No match found');
      return {
        success: true,
        matched: false,
        message: 'No matching fingerprint found'
      };

    } catch (error) {
      console.error('❌ Verification error:', error);

      // Stop acquisition on error
      try {
        if (this.sdk && this.reader) {
          await this.sdk.stopAcquisition(this.reader);
        }
      } catch (stopError) {
        console.error('Error stopping acquisition:', stopError);
      }

      return {
        success: false,
        matched: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Compare two fingerprint templates
   * Used for duplicate checking
   */
  async compareTemplates(template1, template2) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const fmd1 = this.base64ToArrayBuffer(template1);
      const fmd2 = this.base64ToArrayBuffer(template2);

      const score = await this.sdk.compare(
        fmd1,
        fmd2,
        Fingerprint.FmdFormat.ANSI_378_2004
      );

      const MATCH_THRESHOLD = 20000;
      const matched = score <= MATCH_THRESHOLD;

      return {
        success: true,
        matched: matched,
        score: score,
        confidence: matched ? ((MATCH_THRESHOLD - score) / MATCH_THRESHOLD) * 100 : 0
      };

    } catch (error) {
      console.error('Comparison error:', error);
      return {
        success: false,
        matched: false,
        error: error.message
      };
    }
  }

  /**
   * Check for duplicate fingerprints across all students
   * CRITICAL: Prevents same finger being registered multiple times
   */
  async checkForDuplicates(newTemplate, existingTemplates) {
    try {
      console.log(`🔍 Checking for duplicates against ${existingTemplates.length} templates...`);

      const duplicates = [];
      const DUPLICATE_THRESHOLD = 20000;

      for (const existing of existingTemplates) {
        try {
          const compareResult = await this.compareTemplates(
            newTemplate,
            existing.template
          );

          if (compareResult.matched && compareResult.score <= DUPLICATE_THRESHOLD) {
            duplicates.push({
              studentId: existing.studentId,
              matricNumber: existing.matricNumber,
              fingerName: existing.fingerName,
              score: compareResult.score,
              confidence: compareResult.confidence
            });
          }
        } catch (error) {
          console.warn('Error comparing with template:', error);
          continue;
        }
      }

      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICATE FINGERPRINTS FOUND!', duplicates);
        return {
          hasDuplicates: true,
          duplicates: duplicates,
          message: `This fingerprint is already registered to ${duplicates[0].matricNumber}`
        };
      }

      console.log('✅ No duplicates found');
      return {
        hasDuplicates: false,
        duplicates: [],
        message: 'Fingerprint is unique'
      };

    } catch (error) {
      console.error('Duplicate check error:', error);
      return {
        hasDuplicates: false,
        duplicates: [],
        error: error.message
      };
    }
  }

  // Helper: Convert ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Convert Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Stop scanner and cleanup
   */
  async stop() {
    try {
      if (this.sdk && this.reader) {
        await this.sdk.stopAcquisition(this.reader);
      }
      console.log('🛑 Scanner stopped');
      return { success: true };
    } catch (error) {
      console.error('Error stopping scanner:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export default new DigitalPersonaFingerprint();

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// 1. ENROLLMENT WITH DUPLICATE CHECK:

import fingerprintScanner from '@/lib/fingerprint-digitalpersona';

const enrollFingerprint = async (studentId, matricNumber) => {
  const initResult = await fingerprintScanner.initialize();
  if (!initResult.success) {
    alert(initResult.error);
    return;
  }

  // Capture fingerprint
  const captureResult = await fingerprintScanner.capture(
    studentId,
    'Thumb' // finger name
  );

  if (captureResult.success) {
    // CRITICAL: Check for duplicates before saving
    const allStudents = await getAllStudents();
    const existingTemplates = allStudents
      .filter(s => s.thumbTemplate)
      .map(s => ({
        studentId: s.$id,
        matricNumber: s.matricNumber,
        template: s.thumbTemplate,
        fingerName: 'Thumb'
      }));

    const duplicateCheck = await fingerprintScanner.checkForDuplicates(
      captureResult.template,
      existingTemplates
    );

    if (duplicateCheck.hasDuplicates) {
      alert(`This fingerprint is already registered to ${duplicateCheck.duplicates[0].matricNumber}`);
      return;
    }

    // Save to database
    await saveFingerprints(studentId, {
      thumb: captureResult.template
    });
  }
};

// 2. VERIFICATION:

const verifyFingerprint = async () => {
  const students = await getAllStudents();
  const templates = students
    .filter(s => s.fingerprintsCaptured)
    .flatMap(s => [
      { id: s.$id, template: s.thumbTemplate, fingerName: 'Thumb', student: s },
      { id: s.$id, template: s.indexTemplate, fingerName: 'Index', student: s },
      // ... other fingers
    ])
    .filter(t => t.template);

  const verifyResult = await fingerprintScanner.verify(templates);

  if (verifyResult.matched) {
    console.log('Matched student:', verifyResult.matchedTemplate.student);
  }
};
*/
// lib/fingerprint-digitalpersona.js
// PRODUCTION-READY DIGITALPERSONA IMPLEMENTATION
// Works with DigitalPersona U.are.U 4500 and other DigitalPersona readers

class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.currentCapture = null;
  }

  /**
   * Initialize DigitalPersona SDK
   */
  async initialize() {
    try {
      console.log('🔧 Initializing DigitalPersona SDK...');

      // Check if DigitalPersona WebSDK is loaded
      if (typeof Fingerprint === 'undefined') {
        return {
          success: false,
          error: 'DigitalPersona SDK not loaded. Please ensure the SDK script is included in your HTML.'
        };
      }

      // Create SDK instance
      this.sdk = new Fingerprint.WebApi();

      // Check if reader is available
      const devices = await this.sdk.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        return {
          success: false,
          error: 'No fingerprint reader detected. Please connect your DigitalPersona device.'
        };
      }

      this.reader = devices[0]; // Use first available reader
      this.isInitialized = true;

      console.log('✅ DigitalPersona SDK initialized successfully');
      console.log('📱 Reader:', this.reader);

      return {
        success: true,
        reader: this.reader,
        message: 'Scanner ready'
      };

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize scanner'
      };
    }
  }

  /**
   * Check if scanner is available
   */
  async isAvailable() {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        return { available: initResult.success, error: initResult.error };
      }

      const devices = await this.sdk.enumerateDevices();
      return {
        available: devices && devices.length > 0,
        error: devices.length === 0 ? 'No fingerprint reader connected' : null
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Capture single fingerprint
   * Returns FMD (Fingerprint Minutiae Data) template as Base64 string
   */
  async capture(userId = null, fingerName = 'Unknown') {
    try {
      console.log(`👆 Capturing ${fingerName}...`);

      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      // Start capture with quality threshold
      const sample = await this.sdk.startAcquisition(
        Fingerprint.SampleFormat.PngImage, // Get image
        this.reader
      );

      console.log('📸 Fingerprint image captured');

      // Convert to FMD template (this is what we store)
      const fmdData = await this.sdk.createFmd(
        sample,
        Fingerprint.FmdFormat.ANSI_378_2004 // Standard format
      );

      // Get quality score (0-100)
      const quality = await this.getQualityScore(sample);

      console.log(`✅ ${fingerName} captured with quality: ${quality}%`);

      // Convert FMD to Base64 string for storage
      const template = this.arrayBufferToBase64(fmdData);

      // Stop acquisition
      await this.sdk.stopAcquisition(this.reader);

      return {
        success: true,
        template: template, // Store this in database (Base64 string)
        quality: quality,
        fingerName: fingerName,
        image: sample, // PNG image data (optional - for preview)
        capturedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Capture failed:', error);

      // Stop acquisition on error
      try {
        if (this.sdk && this.reader) {
          await this.sdk.stopAcquisition(this.reader);
        }
      } catch (stopError) {
        console.error('Error stopping acquisition:', stopError);
      }

      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint'
      };
    }
  }

  /**
   * Get fingerprint quality score
   */
  async getQualityScore(sample) {
    try {
      const quality = await this.sdk.getQuality(sample);
      
      // DigitalPersona quality values:
      // 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
      const qualityMap = {
        1: 40,  // Poor
        2: 60,  // Fair
        3: 75,  // Good
        4: 90,  // Very Good
        5: 100  // Excellent
      };

      return qualityMap[quality] || 50;
    } catch (error) {
      console.warn('Could not get quality score:', error);
      return 75; // Default quality
    }
  }

  /**
   * Verify fingerprint against stored templates
   * Returns matched credential ID if found
   */
  async verify(storedTemplates) {
    try {
      console.log('🔍 Starting verification...');
      console.log(`📋 Checking against ${storedTemplates.length} stored templates`);

      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      if (!storedTemplates || storedTemplates.length === 0) {
        return {
          success: false,
          matched: false,
          error: 'No templates provided for verification'
        };
      }

      // Capture fingerprint to verify
      console.log('👆 Place finger on scanner...');
      
      const sample = await this.sdk.startAcquisition(
        Fingerprint.SampleFormat.PngImage,
        this.reader
      );

      console.log('📸 Verification sample captured');

      // Convert to FMD
      const probeFmd = await this.sdk.createFmd(
        sample,
        Fingerprint.FmdFormat.ANSI_378_2004
      );

      // Stop acquisition
      await this.sdk.stopAcquisition(this.reader);

      // Compare with each stored template
      let bestMatch = null;
      let highestScore = 0;
      const MATCH_THRESHOLD = 20000; // DigitalPersona threshold (lower = better match)

      for (const stored of storedTemplates) {
        try {
          // Convert Base64 template back to ArrayBuffer
          const storedFmd = this.base64ToArrayBuffer(stored.template);

          // Compare fingerprints
          const result = await this.sdk.compare(
            probeFmd,
            storedFmd,
            Fingerprint.FmdFormat.ANSI_378_2004
          );

          console.log(`  🔄 Comparing with ${stored.id || 'template'}: Score = ${result}`);

          // Lower score = better match in DigitalPersona
          if (result <= MATCH_THRESHOLD && result < highestScore || highestScore === 0) {
            highestScore = result;
            bestMatch = stored;
          }

        } catch (compareError) {
          console.warn(`  ⚠️ Error comparing template:`, compareError.message);
          continue;
        }
      }

      if (bestMatch) {
        console.log('✅ MATCH FOUND!');
        console.log(`  Match score: ${highestScore} (threshold: ${MATCH_THRESHOLD})`);
        
        // Calculate confidence percentage (inverse of score)
        const confidence = Math.max(0, Math.min(100, 
          ((MATCH_THRESHOLD - highestScore) / MATCH_THRESHOLD) * 100
        ));

        return {
          success: true,
          matched: true,
          credentialId: bestMatch.id,
          matchedTemplate: bestMatch,
          confidence: confidence.toFixed(1),
          matchScore: highestScore
        };
      }

      console.log('❌ No match found');
      return {
        success: true,
        matched: false,
        message: 'No matching fingerprint found'
      };

    } catch (error) {
      console.error('❌ Verification error:', error);

      // Stop acquisition on error
      try {
        if (this.sdk && this.reader) {
          await this.sdk.stopAcquisition(this.reader);
        }
      } catch (stopError) {
        console.error('Error stopping acquisition:', stopError);
      }

      return {
        success: false,
        matched: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Compare two fingerprint templates
   * Used for duplicate checking
   */
  async compareTemplates(template1, template2) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const fmd1 = this.base64ToArrayBuffer(template1);
      const fmd2 = this.base64ToArrayBuffer(template2);

      const score = await this.sdk.compare(
        fmd1,
        fmd2,
        Fingerprint.FmdFormat.ANSI_378_2004
      );

      const MATCH_THRESHOLD = 20000;
      const matched = score <= MATCH_THRESHOLD;

      return {
        success: true,
        matched: matched,
        score: score,
        confidence: matched ? ((MATCH_THRESHOLD - score) / MATCH_THRESHOLD) * 100 : 0
      };

    } catch (error) {
      console.error('Comparison error:', error);
      return {
        success: false,
        matched: false,
        error: error.message
      };
    }
  }

  /**
   * Check for duplicate fingerprints across all students
   * CRITICAL: Prevents same finger being registered multiple times
   */
  async checkForDuplicates(newTemplate, existingTemplates) {
    try {
      console.log(`🔍 Checking for duplicates against ${existingTemplates.length} templates...`);

      const duplicates = [];
      const DUPLICATE_THRESHOLD = 20000;

      for (const existing of existingTemplates) {
        try {
          const compareResult = await this.compareTemplates(
            newTemplate,
            existing.template
          );

          if (compareResult.matched && compareResult.score <= DUPLICATE_THRESHOLD) {
            duplicates.push({
              studentId: existing.studentId,
              matricNumber: existing.matricNumber,
              fingerName: existing.fingerName,
              score: compareResult.score,
              confidence: compareResult.confidence
            });
          }
        } catch (error) {
          console.warn('Error comparing with template:', error);
          continue;
        }
      }

      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICATE FINGERPRINTS FOUND!', duplicates);
        return {
          hasDuplicates: true,
          duplicates: duplicates,
          message: `This fingerprint is already registered to ${duplicates[0].matricNumber}`
        };
      }

      console.log('✅ No duplicates found');
      return {
        hasDuplicates: false,
        duplicates: [],
        message: 'Fingerprint is unique'
      };

    } catch (error) {
      console.error('Duplicate check error:', error);
      return {
        hasDuplicates: false,
        duplicates: [],
        error: error.message
      };
    }
  }

  // Helper: Convert ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Convert Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Stop scanner and cleanup
   */
  async stop() {
    try {
      if (this.sdk && this.reader) {
        await this.sdk.stopAcquisition(this.reader);
      }
      console.log('🛑 Scanner stopped');
      return { success: true };
    } catch (error) {
      console.error('Error stopping scanner:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export default new DigitalPersonaFingerprint();

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// 1. ENROLLMENT WITH DUPLICATE CHECK:

import fingerprintScanner from '@/lib/fingerprint-digitalpersona';

const enrollFingerprint = async (studentId, matricNumber) => {
  const initResult = await fingerprintScanner.initialize();
  if (!initResult.success) {
    alert(initResult.error);
    return;
  }

  // Capture fingerprint
  const captureResult = await fingerprintScanner.capture(
    studentId,
    'Thumb' // finger name
  );

  if (captureResult.success) {
    // CRITICAL: Check for duplicates before saving
    const allStudents = await getAllStudents();
    const existingTemplates = allStudents
      .filter(s => s.thumbTemplate)
      .map(s => ({
        studentId: s.$id,
        matricNumber: s.matricNumber,
        template: s.thumbTemplate,
        fingerName: 'Thumb'
      }));

    const duplicateCheck = await fingerprintScanner.checkForDuplicates(
      captureResult.template,
      existingTemplates
    );

    if (duplicateCheck.hasDuplicates) {
      alert(`This fingerprint is already registered to ${duplicateCheck.duplicates[0].matricNumber}`);
      return;
    }

    // Save to database
    await saveFingerprints(studentId, {
      thumb: captureResult.template
    });
  }
};

// 2. VERIFICATION:

const verifyFingerprint = async () => {
  const students = await getAllStudents();
  const templates = students
    .filter(s => s.fingerprintsCaptured)
    .flatMap(s => [
      { id: s.$id, template: s.thumbTemplate, fingerName: 'Thumb', student: s },
      { id: s.$id, template: s.indexTemplate, fingerName: 'Index', student: s },
      // ... other fingers
    ])
    .filter(t => t.template);

  const verifyResult = await fingerprintScanner.verify(templates);

  if (verifyResult.matched) {
    console.log('Matched student:', verifyResult.matchedTemplate.student);
  }
};
*/

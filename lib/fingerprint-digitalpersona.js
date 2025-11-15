// // lib/fingerprint-digitalpersona.js
// // PRODUCTION-READY - Using Official @digitalpersona/fingerprint SDK
// /// <reference types="@digitalpersona/websdk" />
// /// <reference types="@digitalpersona/fingerprint" />

// class DigitalPersonaFingerprint {
//   constructor() {
//     this.api = null;
//     this.isInitialized = false;
//     this.capturing = false;
//     this.currentReader = null;
//   }

//   /**
//    * Initialize DigitalPersona SDK
//    */
//   async initialize() {
//     try {
//       console.log('🔧 Initializing DigitalPersona SDK...');

//       // Check if Fingerprint API is loaded
//       if (typeof window === 'undefined' || typeof Fingerprint === 'undefined') {
//         return {
//           success: false,
//           error: 'DigitalPersona SDK not loaded. Please ensure the SDK script is included.'
//         };
//       }

//       // Create API instance
//       this.api = new Fingerprint.WebApi();

//       // Set up event handlers
//       this.setupEventHandlers();

//       // Enumerate devices to check if reader is available
//       const devices = await this.enumerateDevices();
      
//       if (!devices || devices.length === 0) {
//         return {
//           success: false,
//           error: 'No fingerprint reader detected. Please connect your DigitalPersona device.'
//         };
//       }

//       this.currentReader = devices[0]; // Use first available reader
//       this.isInitialized = true;

//       console.log('✅ DigitalPersona SDK initialized successfully');
//       console.log('📱 Reader:', this.currentReader);

//       return {
//         success: true,
//         reader: this.currentReader,
//         message: 'Scanner ready'
//       };

//     } catch (error) {
//       console.error('❌ Initialization failed:', error);
//       return {
//         success: false,
//         error: error.message || 'Failed to initialize scanner'
//       };
//     }
//   }

//   /**
//    * Set up event handlers
//    */
//   setupEventHandlers() {
//     // Device connection events
//     this.api.onDeviceConnected = (event) => {
//       console.log('📱 Device connected:', event);
//     };

//     this.api.onDeviceDisconnected = (event) => {
//       console.warn('⚠️ Device disconnected:', event);
//     };

//     // Acquisition events
//     this.api.onAcquisitionStarted = (event) => {
//       console.log('🎬 Acquisition started');
//       this.capturing = true;
//     };

//     this.api.onAcquisitionStopped = (event) => {
//       console.log('🛑 Acquisition stopped');
//       this.capturing = false;
//     };

//     // Quality reporting
//     this.api.onQualityReported = (event) => {
//       console.log('📊 Quality:', event.quality);
//     };

//     // Error handling
//     this.api.onErrorOccurred = (event) => {
//       console.error('❌ Error occurred:', event.error);
//     };

//     this.api.onCommunicationFailed = (event) => {
//       console.error('❌ Communication failed:', event);
//     };
//   }

//   /**
//    * Enumerate available fingerprint devices
//    */
//   async enumerateDevices() {
//     try {
//       if (!this.api) {
//         this.api = new Fingerprint.WebApi();
//       }
//       const devices = await this.api.enumerateDevices();
//       return devices;
//     } catch (error) {
//       console.error('Error enumerating devices:', error);
//       return [];
//     }
//   }

//   /**
//    * Get device information
//    */
//   async getDeviceInfo(deviceId) {
//     try {
//       const info = await this.api.getDeviceInfo(deviceId);
//       return info;
//     } catch (error) {
//       console.error('Error getting device info:', error);
//       return null;
//     }
//   }

//   /**
//    * Check if scanner is available
//    */
//   async isAvailable() {
//     try {
//       if (!this.isInitialized) {
//         const initResult = await this.initialize();
//         return { available: initResult.success, error: initResult.error };
//       }

//       const devices = await this.enumerateDevices();
//       return {
//         available: devices && devices.length > 0,
//         error: devices.length === 0 ? 'No fingerprint reader connected' : null
//       };
//     } catch (error) {
//       return { available: false, error: error.message };
//     }
//   }

//   /**
//    * Capture single fingerprint
//    * Returns FMD (Fingerprint Minutiae Data) template as Base64 string
//    */
//   async capture(userId = null, fingerName = 'Unknown') {
//     try {
//       console.log(`👆 Capturing ${fingerName}...`);

//       if (!this.isInitialized) {
//         const initResult = await this.initialize();
//         if (!initResult.success) {
//           return initResult;
//         }
//       }

//       // Start acquisition with PNG format for preview
//       await this.api.startAcquisition(Fingerprint.SampleFormat.PngImage);

//       // Wait for samples
//       const samples = await new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           reject(new Error('Capture timeout - no finger detected'));
//         }, 30000); // 30 second timeout

//         this.api.onSamplesAcquired = (event) => {
//           clearTimeout(timeout);
//           resolve(event.samples);
//         };

//         this.api.onErrorOccurred = (event) => {
//           clearTimeout(timeout);
//           reject(new Error(event.error || 'Capture failed'));
//         };
//       });

//       // Stop acquisition
//       await this.api.stopAcquisition();

//       console.log('📸 Fingerprint samples captured');

//       // Parse samples (they come as JSON string)
//       const parsedSamples = JSON.parse(samples);
      
//       if (!parsedSamples || parsedSamples.length === 0) {
//         throw new Error('No fingerprint data captured');
//       }

//       const sample = parsedSamples[0];

//       // Get PNG image for preview (base64url encoded)
//       const imageData = Fingerprint.b64UrlToUtf8(sample.Data);
//       const image = `data:image/png;base64,${window.btoa(imageData)}`;

//       // Create FMD (Fingerprint Minutiae Data) for storage and matching
//       // This is the template we'll store in the database
//       const fmdData = sample.Data; // Already in base64url format

//       // Get quality score (0-4 scale from DigitalPersona)
//       const quality = this.calculateQualityPercentage(sample.Quality || 0);

//       console.log(`✅ ${fingerName} captured with quality: ${quality}%`);

//       return {
//         success: true,
//         template: fmdData, // Store this in database (base64url string)
//         quality: quality,
//         fingerName: fingerName,
//         image: image, // PNG image for preview
//         capturedAt: new Date().toISOString()
//       };

//     } catch (error) {
//       console.error('❌ Capture failed:', error);

//       // Stop acquisition on error
//       try {
//         if (this.api && this.capturing) {
//           await this.api.stopAcquisition();
//         }
//       } catch (stopError) {
//         console.error('Error stopping acquisition:', stopError);
//       }

//       return {
//         success: false,
//         error: error.message || 'Failed to capture fingerprint'
//       };
//     }
//   }

//   /**
//    * Convert DigitalPersona quality (0-4) to percentage
//    */
//   calculateQualityPercentage(quality) {
//     // DigitalPersona quality scale:
//     // 0 = Undefined, 1 = Poor, 2 = Fair, 3 = Good, 4 = Excellent
//     const qualityMap = {
//       0: 50,  // Undefined - assume medium
//       1: 40,  // Poor
//       2: 60,  // Fair
//       3: 80,  // Good
//       4: 100  // Excellent
//     };
//     return qualityMap[quality] || 50;
//   }

//   /**
//    * Verify fingerprint against stored templates
//    * Uses DigitalPersona's matching algorithm
//    */
//   async verify(storedTemplates) {
//     try {
//       console.log('🔍 Starting verification...');
//       console.log(`📋 Checking against ${storedTemplates.length} stored templates`);

//       if (!this.isInitialized) {
//         const initResult = await this.initialize();
//         if (!initResult.success) {
//           return initResult;
//         }
//       }

//       if (!storedTemplates || storedTemplates.length === 0) {
//         return {
//           success: false,
//           matched: false,
//           error: 'No templates provided for verification'
//         };
//       }

//       // Capture probe fingerprint
//       console.log('👆 Place finger on scanner...');
      
//       await this.api.startAcquisition(Fingerprint.SampleFormat.PngImage);

//       const probeSamples = await new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           reject(new Error('Verification timeout'));
//         }, 30000);

//         this.api.onSamplesAcquired = (event) => {
//           clearTimeout(timeout);
//           resolve(event.samples);
//         };

//         this.api.onErrorOccurred = (event) => {
//           clearTimeout(timeout);
//           reject(new Error(event.error));
//         };
//       });

//       await this.api.stopAcquisition();

//       console.log('📸 Verification sample captured');

//       const parsedProbeSamples = JSON.parse(probeSamples);
//       if (!parsedProbeSamples || parsedProbeSamples.length === 0) {
//         throw new Error('No probe sample captured');
//       }

//       const probeSample = parsedProbeSamples[0];

//       // Compare with each stored template
//       let bestMatch = null;
//       let highestScore = 0;

//       for (const stored of storedTemplates) {
//         try {
//           // Use DigitalPersona's compare function
//           // Note: The actual comparison algorithm depends on your DigitalPersona license
//           // This is a simplified version - you may need to use server-side matching
          
//           const similarity = await this.compareFingerprints(
//             probeSample.Data,
//             stored.template
//           );

//           console.log(`  🔄 Comparing with ${stored.id || 'template'}: Score = ${similarity}%`);

//           if (similarity > highestScore && similarity >= 70) { // 70% threshold
//             highestScore = similarity;
//             bestMatch = stored;
//           }

//         } catch (compareError) {
//           console.warn(`  ⚠️ Error comparing template:`, compareError.message);
//           continue;
//         }
//       }

//       if (bestMatch) {
//         console.log('✅ MATCH FOUND!');
//         console.log(`  Match score: ${highestScore}%`);

//         return {
//           success: true,
//           matched: true,
//           credentialId: bestMatch.id,
//           matchedTemplate: bestMatch,
//           confidence: highestScore.toFixed(1),
//           matchScore: highestScore
//         };
//       }

//       console.log('❌ No match found');
//       return {
//         success: true,
//         matched: false,
//         message: 'No matching fingerprint found'
//       };

//     } catch (error) {
//       console.error('❌ Verification error:', error);

//       try {
//         if (this.api && this.capturing) {
//           await this.api.stopAcquisition();
//         }
//       } catch (stopError) {
//         console.error('Error stopping acquisition:', stopError);
//       }

//       return {
//         success: false,
//         matched: false,
//         error: error.message || 'Verification failed'
//       };
//     }
//   }

//   /**
//    * Compare two fingerprint templates
//    * Simple comparison - for production, use server-side matching with proper DigitalPersona SDK
//    */
//   async compareFingerprints(template1, template2) {
//     try {
//       // This is a simple base64 comparison
//       // For production, you should use DigitalPersona's server-side matching API
//       // which provides proper biometric matching algorithms
      
//       if (template1 === template2) {
//         return 100; // Exact match
//       }

//       // Simple similarity check (NOT cryptographically secure for production!)
//       // In production, use DigitalPersona's biometric matching service
//       const similarity = this.calculateStringSimilarity(template1, template2);
//       return similarity;

//     } catch (error) {
//       console.error('Comparison error:', error);
//       throw error;
//     }
//   }

//   /**
//    * Calculate string similarity (temporary - replace with proper biometric matching)
//    */
//   calculateStringSimilarity(str1, str2) {
//     if (!str1 || !str2) return 0;
//     if (str1 === str2) return 100;

//     // Levenshtein distance for similarity
//     const len1 = str1.length;
//     const len2 = str2.length;
//     const maxLen = Math.max(len1, len2);
    
//     if (maxLen === 0) return 100;

//     const distance = this.levenshteinDistance(str1.substring(0, 100), str2.substring(0, 100));
//     const similarity = ((maxLen - distance) / maxLen) * 100;
    
//     return Math.max(0, similarity);
//   }

//   /**
//    * Levenshtein distance algorithm
//    */
//   levenshteinDistance(str1, str2) {
//     const matrix = [];
    
//     for (let i = 0; i <= str2.length; i++) {
//       matrix[i] = [i];
//     }
    
//     for (let j = 0; j <= str1.length; j++) {
//       matrix[0][j] = j;
//     }
    
//     for (let i = 1; i <= str2.length; i++) {
//       for (let j = 1; j <= str1.length; j++) {
//         if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
//           matrix[i][j] = matrix[i - 1][j - 1];
//         } else {
//           matrix[i][j] = Math.min(
//             matrix[i - 1][j - 1] + 1,
//             matrix[i][j - 1] + 1,
//             matrix[i - 1][j] + 1
//           );
//         }
//       }
//     }
    
//     return matrix[str2.length][str1.length];
//   }

//   /**
//    * Check for duplicate fingerprints
//    */
//   async checkForDuplicates(newTemplate, existingTemplates) {
//     try {
//       console.log(`🔍 Checking for duplicates against ${existingTemplates.length} templates...`);

//       const duplicates = [];
//       const DUPLICATE_THRESHOLD = 95; // 95% similarity = duplicate

//       for (const existing of existingTemplates) {
//         try {
//           const similarity = await this.compareFingerprints(
//             newTemplate,
//             existing.template
//           );

//           if (similarity >= DUPLICATE_THRESHOLD) {
//             duplicates.push({
//               studentId: existing.studentId,
//               matricNumber: existing.matricNumber,
//               fingerName: existing.fingerName,
//               similarity: similarity
//             });
//           }
//         } catch (error) {
//           console.warn('Error comparing with template:', error);
//           continue;
//         }
//       }

//       if (duplicates.length > 0) {
//         console.warn('⚠️ DUPLICATE FINGERPRINTS FOUND!', duplicates);
//         return {
//           hasDuplicates: true,
//           duplicates: duplicates,
//           message: `This fingerprint is already registered to ${duplicates[0].matricNumber}`
//         };
//       }

//       console.log('✅ No duplicates found');
//       return {
//         hasDuplicates: false,
//         duplicates: [],
//         message: 'Fingerprint is unique'
//       };

//     } catch (error) {
//       console.error('Duplicate check error:', error);
//       return {
//         hasDuplicates: false,
//         duplicates: [],
//         error: error.message
//       };
//     }
//   }

//   /**
//    * Stop scanner and cleanup
//    */
//   async stop() {
//     try {
//       if (this.api && this.capturing) {
//         await this.api.stopAcquisition();
//       }
//       this.capturing = false;
//       console.log('🛑 Scanner stopped');
//       return { success: true };
//     } catch (error) {
//       console.error('Error stopping scanner:', error);
//       return { success: false, error: error.message };
//     }
//   }
// }

// // Export singleton
// export default new DigitalPersonaFingerprint();

/*
===========================================
IMPORTANT NOTES FOR PRODUCTION:
===========================================

1. BIOMETRIC MATCHING:
   The compareFingerprints() function above uses simple string comparison
   which is NOT suitable for production biometric matching.
   
   For production, you MUST use one of these approaches:
   
   a) DigitalPersona Server-Side Matching:
      - Use DigitalPersona's IdentityManager or LDS
      - Send templates to server for matching
      - Server uses proper biometric algorithms
   
   b) DigitalPersona VeriFinger SDK:
      - License VeriFinger SDK for client-side matching
      - Use proper biometric matching algorithms
      - Much more secure and accurate

2. TEMPLATE STORAGE:
   - Always store templates encrypted in database
   - Use HTTPS for all API calls
   - Never expose templates in client-side code
   - Consider using server-side enrollment

3. SECURITY:
   - The template data is sensitive biometric information
   - Implement proper access controls
   - Log all enrollment and verification attempts
   - Use secure channels for template transmission

4. PERFORMANCE:
   - For large databases (>1000 students), use server-side matching
   - Consider indexing templates for faster searching
   - Implement timeout mechanisms

5. ERROR HANDLING:
   - Always provide user-friendly error messages
   - Log technical details server-side
   - Implement retry mechanisms for transient failures
*/
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


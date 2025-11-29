// class DigitalPersonaFingerprint {
//   constructor() {
//     this.sdk = null;
//     this.reader = null;
//     this.isInitialized = false;
//     this.currentCapture = null;
//   }

//   /**
//    * Initialize DigitalPersona SDK
//    */
//   async initialize() {
//     try {
//       console.log('🔧 Initializing DigitalPersona SDK...');

//       // Check if DigitalPersona WebSDK is loaded
//       if (typeof Fingerprint === 'undefined') {
//         return {
//           success: false,
//           error: 'DigitalPersona SDK not loaded. Please ensure the SDK script is included in your HTML.'
//         };
//       }

//       // Create SDK instance
//       this.sdk = new Fingerprint.WebApi();

//       // Check if reader is available
//       const devices = await this.sdk.enumerateDevices();
      
//       if (!devices || devices.length === 0) {
//         return {
//           success: false,
//           error: 'No fingerprint reader detected. Please connect your DigitalPersona device.'
//         };
//       }

//       this.reader = devices[0]; // Use first available reader
//       this.isInitialized = true;

//       console.log('✅ DigitalPersona SDK initialized successfully');
//       console.log('📱 Reader:', this.reader);

//       return {
//         success: true,
//         reader: this.reader,
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
//    * Check if scanner is available
//    */
//   async isAvailable() {
//     try {
//       if (!this.isInitialized) {
//         const initResult = await this.initialize();
//         return { available: initResult.success, error: initResult.error };
//       }

//       const devices = await this.sdk.enumerateDevices();
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

//       // Start capture with quality threshold
//       const sample = await this.sdk.startAcquisition(
//         Fingerprint.SampleFormat.PngImage, // Get image
//         this.reader
//       );

//       console.log('📸 Fingerprint image captured');

//       // Convert to FMD template (this is what we store)
//       const fmdData = await this.sdk.createFmd(
//         sample,
//         Fingerprint.FmdFormat.ANSI_378_2004 // Standard format
//       );

//       // Get quality score (0-100)
//       const quality = await this.getQualityScore(sample);

//       console.log(`✅ ${fingerName} captured with quality: ${quality}%`);

//       // Convert FMD to Base64 string for storage
//       const template = this.arrayBufferToBase64(fmdData);

//       // Stop acquisition
//       await this.sdk.stopAcquisition(this.reader);

//       return {
//         success: true,
//         template: template, // Store this in database (Base64 string)
//         quality: quality,
//         fingerName: fingerName,
//         image: sample, // PNG image data (optional - for preview)
//         capturedAt: new Date().toISOString()
//       };

//     } catch (error) {
//       console.error('❌ Capture failed:', error);

//       // Stop acquisition on error
//       try {
//         if (this.sdk && this.reader) {
//           await this.sdk.stopAcquisition(this.reader);
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
//    * Get fingerprint quality score
//    */
//   async getQualityScore(sample) {
//     try {
//       const quality = await this.sdk.getQuality(sample);
      
//       // DigitalPersona quality values:
//       // 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
//       const qualityMap = {
//         1: 40,  // Poor
//         2: 60,  // Fair
//         3: 75,  // Good
//         4: 90,  // Very Good
//         5: 100  // Excellent
//       };

//       return qualityMap[quality] || 50;
//     } catch (error) {
//       console.warn('Could not get quality score:', error);
//       return 75; // Default quality
//     }
//   }

//   /**
//    * Verify fingerprint against stored templates
//    * Returns matched credential ID if found
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

//       // Capture fingerprint to verify
//       console.log('👆 Place finger on scanner...');
      
//       const sample = await this.sdk.startAcquisition(
//         Fingerprint.SampleFormat.PngImage,
//         this.reader
//       );

//       console.log('📸 Verification sample captured');

//       // Convert to FMD
//       const probeFmd = await this.sdk.createFmd(
//         sample,
//         Fingerprint.FmdFormat.ANSI_378_2004
//       );

//       // Stop acquisition
//       await this.sdk.stopAcquisition(this.reader);

//       // Compare with each stored template
//       let bestMatch = null;
//       let highestScore = 0;
//       const MATCH_THRESHOLD = 20000; // DigitalPersona threshold (lower = better match)

//       for (const stored of storedTemplates) {
//         try {
//           // Convert Base64 template back to ArrayBuffer
//           const storedFmd = this.base64ToArrayBuffer(stored.template);

//           // Compare fingerprints
//           const result = await this.sdk.compare(
//             probeFmd,
//             storedFmd,
//             Fingerprint.FmdFormat.ANSI_378_2004
//           );

//           console.log(`  🔄 Comparing with ${stored.id || 'template'}: Score = ${result}`);

//           // Lower score = better match in DigitalPersona
//           if (result <= MATCH_THRESHOLD && result < highestScore || highestScore === 0) {
//             highestScore = result;
//             bestMatch = stored;
//           }

//         } catch (compareError) {
//           console.warn(`  ⚠️ Error comparing template:`, compareError.message);
//           continue;
//         }
//       }

//       if (bestMatch) {
//         console.log('✅ MATCH FOUND!');
//         console.log(`  Match score: ${highestScore} (threshold: ${MATCH_THRESHOLD})`);
        
//         // Calculate confidence percentage (inverse of score)
//         const confidence = Math.max(0, Math.min(100, 
//           ((MATCH_THRESHOLD - highestScore) / MATCH_THRESHOLD) * 100
//         ));

//         return {
//           success: true,
//           matched: true,
//           credentialId: bestMatch.id,
//           matchedTemplate: bestMatch,
//           confidence: confidence.toFixed(1),
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

//       // Stop acquisition on error
//       try {
//         if (this.sdk && this.reader) {
//           await this.sdk.stopAcquisition(this.reader);
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
//    * Used for duplicate checking
//    */
//   async compareTemplates(template1, template2) {
//     try {
//       if (!this.isInitialized) {
//         await this.initialize();
//       }

//       const fmd1 = this.base64ToArrayBuffer(template1);
//       const fmd2 = this.base64ToArrayBuffer(template2);

//       const score = await this.sdk.compare(
//         fmd1,
//         fmd2,
//         Fingerprint.FmdFormat.ANSI_378_2004
//       );

//       const MATCH_THRESHOLD = 20000;
//       const matched = score <= MATCH_THRESHOLD;

//       return {
//         success: true,
//         matched: matched,
//         score: score,
//         confidence: matched ? ((MATCH_THRESHOLD - score) / MATCH_THRESHOLD) * 100 : 0
//       };

//     } catch (error) {
//       console.error('Comparison error:', error);
//       return {
//         success: false,
//         matched: false,
//         error: error.message
//       };
//     }
//   }

//   /**
//    * Check for duplicate fingerprints across all students
//    * CRITICAL: Prevents same finger being registered multiple times
//    */
//   async checkForDuplicates(newTemplate, existingTemplates) {
//     try {
//       console.log(`🔍 Checking for duplicates against ${existingTemplates.length} templates...`);

//       const duplicates = [];
//       const DUPLICATE_THRESHOLD = 20000;

//       for (const existing of existingTemplates) {
//         try {
//           const compareResult = await this.compareTemplates(
//             newTemplate,
//             existing.template
//           );

//           if (compareResult.matched && compareResult.score <= DUPLICATE_THRESHOLD) {
//             duplicates.push({
//               studentId: existing.studentId,
//               matricNumber: existing.matricNumber,
//               fingerName: existing.fingerName,
//               score: compareResult.score,
//               confidence: compareResult.confidence
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

//   // Helper: Convert ArrayBuffer to Base64
//   arrayBufferToBase64(buffer) {
//     const bytes = new Uint8Array(buffer);
//     let binary = '';
//     for (let i = 0; i < bytes.byteLength; i++) {
//       binary += String.fromCharCode(bytes[i]);
//     }
//     return btoa(binary);
//   }

//   // Helper: Convert Base64 to ArrayBuffer
//   base64ToArrayBuffer(base64) {
//     const binary = atob(base64);
//     const bytes = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i++) {
//       bytes[i] = binary.charCodeAt(i);
//     }
//     return bytes.buffer;
//   }

//   /**
//    * Stop scanner and cleanup
//    */
//   async stop() {
//     try {
//       if (this.sdk && this.reader) {
//         await this.sdk.stopAcquisition(this.reader);
//       }
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



// lib/fingerprint-digitalpersona.js - PRODUCTION READY VERSION

class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.currentCapture = null;
  }

  /**
   * Check if DigitalPersona SDK is loaded and available
   */
  checkSDKAvailability() {
    if (typeof window === 'undefined') {
      return { available: false, error: 'Not in browser environment' };
    }

    // Check if SDK objects are available
    const hasWebApi = typeof window.Fingerprint !== 'undefined' && 
                      typeof window.Fingerprint.WebApi !== 'undefined';
    const hasSampleFormat = typeof window.Fingerprint !== 'undefined' && 
                           typeof window.Fingerprint.SampleFormat !== 'undefined';
    const hasFmdFormat = typeof window.Fingerprint !== 'undefined' && 
                        typeof window.Fingerprint.FmdFormat !== 'undefined';

    if (!hasWebApi || !hasSampleFormat || !hasFmdFormat) {
      return { 
        available: false, 
        error: 'DigitalPersona SDK not fully loaded. Missing: ' + 
               (!hasWebApi ? 'WebApi ' : '') +
               (!hasSampleFormat ? 'SampleFormat ' : '') +
               (!hasFmdFormat ? 'FmdFormat' : '')
      };
    }

    return { available: true };
  }

  /**
   * Initialize DigitalPersona SDK with comprehensive error checking
   */
  async initialize() {
    try {
      console.log('🔧 Initializing DigitalPersona SDK...');

      // Check SDK availability
      const sdkCheck = this.checkSDKAvailability();
      if (!sdkCheck.available) {
        console.error('❌ SDK Check Failed:', sdkCheck.error);
        return {
          success: false,
          error: sdkCheck.error,
          troubleshooting: [
            '1. Ensure DigitalPersona SDK scripts are loaded in your HTML',
            '2. Check browser console for script loading errors',
            '3. Verify scripts are loaded before component mounts'
          ]
        };
      }

      // Create SDK instance
      this.sdk = new window.Fingerprint.WebApi();
      console.log('✅ SDK instance created');

      // Check if DigitalPersona service is running
      let devices;
      try {
        devices = await this.sdk.enumerateDevices();
        console.log('📱 Device enumeration result:', devices);
      } catch (enumError) {
        console.error('❌ Device enumeration failed:', enumError);
        return {
          success: false,
          error: 'Failed to connect to DigitalPersona service',
          troubleshooting: [
            '1. Install DigitalPersona software from: https://www.digitalpersona.com/support/',
            '2. Ensure DigitalPersona service is running (check Windows Services)',
            '3. Try restarting the DigitalPersona service',
            '4. Check if scanner is properly connected (USB)',
            '5. Try a different USB port'
          ]
        };
      }

      if (!devices || devices.length === 0) {
        console.warn('⚠️ No fingerprint readers detected');
        return {
          success: false,
          error: 'No fingerprint reader detected',
          troubleshooting: [
            '1. Connect your DigitalPersona 4500 scanner via USB',
            '2. Check Device Manager to ensure scanner is recognized',
            '3. Install/reinstall DigitalPersona drivers',
            '4. Try a different USB port',
            '5. Restart your computer'
          ]
        };
      }

      this.reader = devices[0]; // Use first available reader
      this.isInitialized = true;

      console.log('✅ DigitalPersona SDK initialized successfully');
      console.log('📱 Reader Info:', {
        deviceId: this.reader,
        totalDevices: devices.length
      });

      return {
        success: true,
        reader: this.reader,
        message: 'Scanner ready',
        deviceInfo: {
          deviceId: this.reader,
          totalDevices: devices.length
        }
      };

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize scanner',
        details: error,
        troubleshooting: [
          '1. Reload the page',
          '2. Check browser console for detailed errors',
          '3. Ensure DigitalPersona software is installed',
          '4. Try using Chrome or Edge browser'
        ]
      };
    }
  }

  /**
   * Capture single fingerprint with enhanced error handling
   */
  async capture(fingerName = 'Unknown') {
    try {
      console.log(`👆 Capturing ${fingerName}...`);

      if (!this.isInitialized) {
        console.log('⚠️ SDK not initialized, initializing now...');
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      console.log('📸 Starting acquisition...');

      // Start capture with quality threshold
      let sample;
      try {
        sample = await this.sdk.startAcquisition(
          window.Fingerprint.SampleFormat.PngImage,
          this.reader
        );
        console.log('✅ Sample acquired:', sample ? 'success' : 'failed');
      } catch (acquireError) {
        console.error('❌ Acquisition error:', acquireError);
        
        // Try to stop acquisition on error
        try {
          await this.sdk.stopAcquisition(this.reader);
        } catch (e) {
          console.warn('Could not stop acquisition:', e);
        }

        return {
          success: false,
          error: 'Failed to capture fingerprint',
          details: acquireError.message,
          troubleshooting: [
            '1. Place your finger firmly on the scanner',
            '2. Ensure finger covers the entire scanner surface',
            '3. Clean the scanner surface and your finger',
            '4. Try again with steady pressure'
          ]
        };
      }

      console.log('🔄 Converting to FMD template...');

      // Convert to FMD template (this is what we store)
      let fmdData;
      try {
        fmdData = await this.sdk.createFmd(
          sample,
          window.Fingerprint.FmdFormat.ANSI_378_2004
        );
        console.log('✅ FMD created, size:', fmdData.byteLength, 'bytes');
      } catch (fmdError) {
        console.error('❌ FMD creation error:', fmdError);
        
        // Stop acquisition
        try {
          await this.sdk.stopAcquisition(this.reader);
        } catch (e) {
          console.warn('Could not stop acquisition:', e);
        }

        return {
          success: false,
          error: 'Failed to process fingerprint',
          details: fmdError.message
        };
      }

      // Convert FMD to Base64 string for storage
      const template = this.arrayBufferToBase64(fmdData);
      console.log('✅ Template created, length:', template.length);

      // Get quality score
      const quality = await this.getQualityScore(sample);
      console.log(`✅ ${fingerName} captured with quality: ${quality}%`);

      // Stop acquisition
      try {
        await this.sdk.stopAcquisition(this.reader);
        console.log('✅ Acquisition stopped');
      } catch (stopError) {
        console.warn('Warning stopping acquisition:', stopError);
      }

      return {
        success: true,
        template: template,
        quality: quality,
        fingerName: fingerName,
        image: sample, // PNG image data (optional - for preview)
        capturedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Capture failed:', error);

      // Ensure acquisition is stopped
      try {
        if (this.sdk && this.reader) {
          await this.sdk.stopAcquisition(this.reader);
        }
      } catch (stopError) {
        console.error('Error stopping acquisition:', stopError);
      }

      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint',
        details: error
      };
    }
  }

  /**
   * Get fingerprint quality score
   */
  async getQualityScore(sample) {
    try {
      const quality = await this.sdk.getQuality(sample);
      
      // DigitalPersona quality values: 1-5
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
   * Compare two fingerprint templates
   * Used for duplicate checking and verification
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
        window.Fingerprint.FmdFormat.ANSI_378_2004
      );

      const MATCH_THRESHOLD = 20000; // Lower = better match
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
   * Helper: Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Convert Base64 to ArrayBuffer
   */
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

  /**
   * Test scanner connectivity
   */
  async testConnection() {
    console.log('\n🔍 === TESTING SCANNER CONNECTION ===');
    
    const sdkCheck = this.checkSDKAvailability();
    console.log('1. SDK Availability:', sdkCheck.available ? '✅' : '❌', sdkCheck.error || '');
    
    if (!sdkCheck.available) {
      return {
        success: false,
        error: 'SDK not available',
        details: sdkCheck
      };
    }

    const initResult = await this.initialize();
    console.log('2. Initialization:', initResult.success ? '✅' : '❌', initResult.error || '');
    
    console.log('=================================\n');
    
    return initResult;
  }
}

// Export singleton
export default new DigitalPersonaFingerprint();
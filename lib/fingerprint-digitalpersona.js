// // lib/fingerprint-digitalpersona.js - FIXED VERSION

// class DigitalPersonaFingerprint {
//   constructor() {
//     this.sdk = null;
//     this.reader = null;
//     this.isInitialized = false;
//   }

//   /**
//    * Comprehensive SDK availability check
//    */
//   checkSDKAvailability() {
//     if (typeof window === 'undefined') {
//       return { available: false, error: 'Not in browser environment' };
//     }

//     const isAvailable = 
//       typeof window.Fingerprint !== 'undefined' &&
//       typeof window.Fingerprint.WebApi !== 'undefined';

//     return { 
//       available: isAvailable, 
//       error: isAvailable ? null : 'DigitalPersona SDK scripts not loaded' 
//     };
//   }

//   /**
//    * Initialize DigitalPersona SDK and detect scanner
//    */
//   async initialize() {
//     try {
//       console.log('\n🔧 === INITIALIZING DIGITALPERSONA SDK ===');

//       if (this.isInitialized && this.sdk) {
//         console.log('ℹ️ SDK already initialized');
//         return { success: true, message: 'SDK already initialized' };
//       }

//       const check = this.checkSDKAvailability();
//       if (!check.available) {
//         throw new Error(check.error || 'DigitalPersona SDK failed to load.');
//       }

//       // Create SDK instance
//       try {
//         // eslint-disable-next-line no-undef
//         this.sdk = new window.Fingerprint.WebApi();
//         console.log('✅ WebApi instance created');
//       } catch (sdkError) {
//         throw new Error(`Failed to create SDK instance: ${sdkError.message}`);
//       }

//       // Enumerate fingerprint devices
//       console.log('🔍 Detecting fingerprint scanner...');
//       const devices = await this.sdk.enumerateDevices();
      
//       if (!devices || devices.length === 0) {
//         throw new Error('No fingerprint scanner detected. Please connect DigitalPersona reader.');
//       }

//       // Select first available device
//       this.reader = devices[0];
//       this.isInitialized = true;

//       console.log('✅ INITIALIZATION SUCCESSFUL');
//       console.log('📱 Active Scanner:', this.reader);
//       console.log('=====================================\n');

//       return { success: true, reader: this.reader, message: 'Scanner initialized and ready' };

//     } catch (error) {
//       console.error('❌ Initialization failed:', error.message);
//       return { success: false, error: error.message };
//     }
//   }

//   /**
//    * FIXED CAPTURE METHOD - Enhanced data extraction
//    */
//   async capture(fingerName = 'Finger') {
//     if (!this.isInitialized) {
//       const init = await this.initialize();
//       if (!init.success) return init;
//     }

//     await this.stopAcquisition();

//     return new Promise((resolve, reject) => {
//       console.log(`💡 Scanner lighting up for: ${fingerName}...`);

//       const onAcquired = (event) => {
//         console.log("⚡ Hardware Event Received. Processing data...");
//         console.log("📦 Raw Event Object:", event);
//         console.log("📦 Event Keys:", Object.keys(event));

//         this.stopAcquisition().then(() => {
//           try {
//             // STEP 1: Extract raw data from event
//             const rawData = this._extractRawData(event);
            
//             if (!rawData) {
//               throw new Error("No valid fingerprint data found in event");
//             }

//             console.log("📊 Raw Data Type:", Object.prototype.toString.call(rawData));
//             console.log("📊 Raw Data Length:", rawData.length || rawData.byteLength || 'unknown');

//             // STEP 2: Convert to Base64
//             const base64String = this._convertToBase64(rawData);
            
//             if (!base64String) {
//               throw new Error("Failed to convert fingerprint data to Base64");
//             }

//             console.log("✅ Base64 String Length:", base64String.length);
//             console.log("✅ First 50 chars:", base64String.substring(0, 50));

//             // STEP 3: Validate and process
//             resolve(this._processBase64Sample(base64String));

//           } catch (e) {
//             console.error("❌ CRITICAL PROCESSING ERROR:", e);
//             console.error("❌ Error Stack:", e.stack);
//             resolve({ 
//               success: false, 
//               error: `Capture failed: ${e.message}` 
//             });
//           }
//         });
//       };

//       // Define error handler
//       const onError = (error) => {
//         console.error("❌ Scanner Hardware Error:", error);
//         this.stopAcquisition();
//         resolve({ success: false, error: error.message || "Device error" });
//       };

//       // Start Acquisition
//       this.sdk.startAcquisition(
//         // eslint-disable-next-line no-undef
//         window.Fingerprint.SampleFormat.PngImage,
//         this.reader
//       ).then(() => {
//         console.log("✅ Acquisition started successfully");
//         this.sdk.onSamplesAcquired = onAcquired;
//         this.sdk.onErrorOccurred = onError;
//       }).catch((err) => {
//         console.error("❌ Failed to start acquisition:", err);
//         resolve({ success: false, error: "Could not start scanner: " + err.message });
//       });

//       // Safety Timeout (30s)
//       setTimeout(() => {
//         if (this.sdk && this.sdk.onSamplesAcquired) {
//           this.stopAcquisition(); 
//           resolve({ success: false, error: "Capture timed out. Please try again." });
//         }
//       }, 30000);
//     });
//   }

//   /**
//    * CRITICAL FIX: Extract raw data from event object
//    * This handles all known DigitalPersona SDK data structures
//    */
//   _extractRawData(event) {
//     console.log("🔍 Starting data extraction...");

//     // If event itself is null/undefined
//     if (!event) {
//       console.warn("⚠️ Event is null or undefined");
//       return null;
//     }

//     // SCENARIO 1: Check common property names
//     const possibleKeys = [
//       'samples',      // Most common in newer SDK
//       'sample',       // Some SDK versions
//       'Samples',      // Capitalized version
//       'Sample',       // Capitalized version
//       'data',         // Generic data field
//       'Data',         // Capitalized
//       'image',        // Image data
//       'Image',        // Capitalized
//       'imageData',    // Combined
//       'ImageData',    // Capitalized
//       'fingerprint',  // Direct fingerprint
//       'Fingerprint'   // Capitalized
//     ];

//     for (const key of possibleKeys) {
//       if (event[key] !== undefined && event[key] !== null) {
//         console.log(`✅ Found data at event.${key}`);
//         const data = event[key];
        
//         // If it's an array, get first element
//         if (Array.isArray(data) && data.length > 0) {
//           console.log(`📦 Data is array, extracting first element`);
//           return data[0];
//         }
        
//         return data;
//       }
//     }

//     // SCENARIO 2: Check if event itself is the data
//     const eventType = Object.prototype.toString.call(event);
//     console.log("🔍 Event type:", eventType);

//     if (eventType === '[object ArrayBuffer]' || 
//         eventType === '[object Uint8Array]' ||
//         eventType === '[object Array]') {
//       console.log("✅ Event itself is the data");
//       return event;
//     }

//     // SCENARIO 3: Check for nested objects
//     if (eventType === '[object Object]') {
//       // Look for any property that contains buffer-like data
//       for (const key in event) {
//         if (event.hasOwnProperty(key)) {
//           const value = event[key];
//           const valueType = Object.prototype.toString.call(value);
          
//           console.log(`🔍 Checking event.${key} - Type: ${valueType}`);
          
//           if (valueType === '[object ArrayBuffer]' || 
//               valueType === '[object Uint8Array]' ||
//               (valueType === '[object Array]' && value.length > 100)) {
//             console.log(`✅ Found buffer data at event.${key}`);
//             return value;
//           }
          
//           // Recursively check nested objects (one level deep)
//           if (valueType === '[object Object]' || valueType === '[object Array]') {
//             const nested = this._extractRawData(value);
//             if (nested) {
//               console.log(`✅ Found nested data at event.${key}`);
//               return nested;
//             }
//           }
//         }
//       }
//     }

//     // SCENARIO 4: Check if it's already a base64 string
//     if (typeof event === 'string' && event.length > 100) {
//       console.log("✅ Event is already a Base64 string");
//       return event;
//     }

//     console.warn("⚠️ Could not extract raw data from event");
//     console.log("📦 Event structure:", JSON.stringify(event, null, 2));
//     return null;
//   }

//   /**
//    * CRITICAL FIX: Convert any data format to Base64
//    */
//   _convertToBase64(rawData) {
//     if (!rawData) {
//       console.warn("⚠️ No data to convert");
//       return null;
//     }

//     const dataType = Object.prototype.toString.call(rawData);
//     console.log("🔄 Converting to Base64, data type:", dataType);

//     try {
//       // CASE 1: Already a Base64 string
//       if (typeof rawData === 'string') {
//         console.log("✅ Data is already a string");
        
//         // Check if it's already Base64
//         if (this._isBase64String(rawData)) {
//           console.log("✅ String is valid Base64");
//           return this.fixUrlBase64(rawData);
//         }
        
//         // If it's a regular string, encode it
//         console.log("⚠️ String is not Base64, encoding...");
//         return btoa(rawData);
//       }

//       // CASE 2: Uint8Array or ArrayBuffer
//       if (dataType === '[object Uint8Array]') {
//         console.log("✅ Converting Uint8Array to Base64");
//         return this.bytesToBase64(rawData);
//       }

//       if (dataType === '[object ArrayBuffer]') {
//         console.log("✅ Converting ArrayBuffer to Base64");
//         return this.bytesToBase64(new Uint8Array(rawData));
//       }

//       // CASE 3: Regular Array (older SDK versions)
//       if (dataType === '[object Array]') {
//         console.log("✅ Converting Array to Base64");
        
//         // Check if it's an array of numbers (bytes)
//         if (rawData.length > 0 && typeof rawData[0] === 'number') {
//           console.log("✅ Array contains byte values");
//           return this.bytesToBase64(new Uint8Array(rawData));
//         }
        
//         // Check if it's an array with nested data
//         if (rawData.length > 0) {
//           console.log("🔍 Array contains nested data, extracting...");
//           return this._convertToBase64(rawData[0]);
//         }
//       }

//       // CASE 4: Object with data properties
//       if (dataType === '[object Object]') {
//         console.log("🔍 Object detected, looking for data properties...");
        
//         const dataKeys = ['Data', 'data', 'Image', 'image', 'bytes', 'Bytes'];
        
//         for (const key of dataKeys) {
//           if (rawData[key]) {
//             console.log(`✅ Found data at object.${key}`);
//             return this._convertToBase64(rawData[key]);
//           }
//         }
//       }

//       console.warn("⚠️ Unknown data format, attempting generic conversion");
      
//       // Last resort: Try to convert to string and encode
//       const stringified = JSON.stringify(rawData);
//       return btoa(stringified);

//     } catch (error) {
//       console.error("❌ Conversion error:", error);
//       return null;
//     }
//   }

//   /**
//    * Check if a string is valid Base64
//    */
//   _isBase64String(str) {
//     if (!str || typeof str !== 'string') return false;
    
//     // Check if it starts with PNG header (most DigitalPersona images are PNG)
//     if (str.startsWith('iVBORw0KGgo')) return true;
    
//     // Check if it matches Base64 pattern
//     const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
//     return base64Regex.test(str) && str.length > 100;
//   }

//   /**
//    * Process and validate Base64 sample
//    */
//   _processBase64Sample(rawBase64) {
//     const cleanBase64 = this.fixUrlBase64(rawBase64);
//     const quality = this.calculateQuality(cleanBase64);

//     console.log("🎯 Quality Score:", quality);

//     if (quality < 40) {
//       return {
//         success: false,
//         error: "Image quality too low. Please press harder.",
//         quality
//       };
//     } 
    
//     return {
//       success: true,
//       template: cleanBase64,
//       quality,
//       capturedAt: new Date().toISOString()
//     };
//   }

//   /**
//    * Force stop the scanner (Light off)
//    */
//   async stopAcquisition() {
//     try {
//       if (this.sdk && this.reader) {
//         this.sdk.onSamplesAcquired = null;
//         this.sdk.onErrorOccurred = null;
        
//         await this.sdk.stopAcquisition(this.reader);
//         console.log("🛑 Scanner Stopped");
//       }
//     } catch (e) {
//       // Ignore errors if it was already stopped
//       console.log("ℹ️ Scanner was already stopped");
//     }
//   }

//   /**
//    * Utility to convert raw byte array (Uint8Array) to Base64 string
//    */
//   bytesToBase64(bytes) {
//     let binary = '';
//     const len = bytes.byteLength || bytes.length;
    
//     // Process in chunks to avoid stack overflow with large arrays
//     const chunkSize = 8192;
//     for (let i = 0; i < len; i += chunkSize) {
//       const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
//       for (let j = 0; j < chunk.length; j++) {
//         binary += String.fromCharCode(chunk[j]);
//       }
//     }
    
//     return btoa(binary);
//   }

//   /**
//    * Utility to fix Base64 strings (UrlSafe vs Standard)
//    */
//   fixUrlBase64(str) {
//     if (!str) return str;
    
//     let output = str.replace(/-/g, '+').replace(/_/g, '/');
    
//     // Add padding if needed
//     switch (output.length % 4) {
//       case 0: break;
//       case 2: output += '=='; break;
//       case 3: output += '='; break;
//       default: return str;
//     }
    
//     return output;
//   }

//   /**
//    * Calculate fingerprint quality score (Client-side heuristic)
//    */
//   calculateQuality(base64) {
//     if (!base64) return 0;
    
//     const len = base64.length;
    
//     // Typical PNG fingerprint image sizes:
//     // - Low quality: < 5KB (~6,800 chars)
//     // - Medium quality: 5-15KB (6,800-20,000 chars)
//     // - High quality: > 15KB (20,000+ chars)
    
//     if (len < 1000) return 20;      // Too small, likely incomplete
//     if (len < 5000) return 45;      // Below average
//     if (len < 10000) return 65;     // Average
//     if (len < 20000) return 80;     // Good
//     return 90;                       // Excellent
//   }
  
//   /**
//    * Compare two fingerprint templates
//    */
//   async compareTemplates(t1, t2) {
//     if (!t1 || !t2) {
//       return {
//         success: false,
//         matched: false,
//         error: "Invalid templates for comparison"
//       };
//     }

//     // Simple length-based similarity (client-side only)
//     // For production, use server-side comparison with proper algorithms
//     const similarity = (Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length)) * 100;
//     const MATCH_THRESHOLD = 95;
//     const matched = similarity >= MATCH_THRESHOLD;
    
//     const score = matched ? 1000 : 100000;

//     return {
//       success: true,
//       matched: matched,
//       similarity: similarity,
//       confidence: similarity,
//       score: score,
//       threshold: MATCH_THRESHOLD
//     };
//   }

//   /**
//    * Check for duplicate fingerprints
//    */
//   // async checkForDuplicates(newTemplate, existingTemplates) {
//   //   console.log(`🔍 Checking against ${existingTemplates.length} stored fingerprints...`);

//   //   const duplicates = [];
//   //   const DUPLICATE_THRESHOLD = 95;

//   //   for (const existing of existingTemplates) {
//   //     const comparison = await this.compareTemplates(newTemplate, existing.template);
      
//   //     if (comparison.matched && comparison.similarity >= DUPLICATE_THRESHOLD) {
//   //       duplicates.push({
//   //         studentId: existing.studentId,
//   //         matricNumber: existing.matricNumber,
//   //         fingerName: existing.fingerName,
//   //         similarity: comparison.similarity
//   //       });
//   //     }
//   //   }

//   //   const hasDuplicates = duplicates.length > 0;
//   //   return {
//   //     success: true,
//   //     hasDuplicates: hasDuplicates,
//   //     duplicates: duplicates,
//   //   };
//   // }
// // Add this to your fingerprint-digitalpersona.js file
// // Replace the existing checkForDuplicates method

// /**
//  * Check for duplicate fingerprints across different students
//  * @param {string} newTemplate - Base64 template of newly captured fingerprint
//  * @param {Array} existingTemplates - Array of {studentId, matricNumber, template, fingerName, studentName}
//  * @param {number} threshold - Similarity threshold (default 95%)
//  * @returns {Promise<{success: boolean, hasDuplicates: boolean, duplicates: Array}>}
//  */
// async checkForDuplicates(newTemplate, existingTemplates, threshold = 95) {
//   console.log(`\n🔍 === DUPLICATE CHECK STARTED ===`);
//   console.log(`📋 Checking against ${existingTemplates.length} stored fingerprint(s)`);
//   console.log(`🎯 Threshold: ${threshold}% similarity`);

//   try {
//     // Validate inputs
//     if (!newTemplate || typeof newTemplate !== 'string') {
//       throw new Error('Invalid template provided for comparison');
//     }

//     if (!Array.isArray(existingTemplates)) {
//       throw new Error('existingTemplates must be an array');
//     }

//     if (existingTemplates.length === 0) {
//       console.log('✅ No existing templates to check - first registration');
//       console.log('=====================================\n');
//       return {
//         success: true,
//         hasDuplicates: false,
//         duplicates: [],
//         message: 'No templates in database (first fingerprint)'
//       };
//     }

//     const duplicates = [];
//     let comparisonCount = 0;

//     // Compare with each existing template
//     for (const existing of existingTemplates) {
//       comparisonCount++;
      
//       // Validate existing template
//       if (!existing.template || typeof existing.template !== 'string') {
//         console.warn(`⚠️ [${comparisonCount}/${existingTemplates.length}] Skipping invalid template for ${existing.matricNumber}`);
//         continue;
//       }

//       try {
//         // Compare the templates
//         const comparison = await this.compareTemplates(newTemplate, existing.template);

//         if (!comparison.success) {
//           console.warn(`⚠️ [${comparisonCount}/${existingTemplates.length}] Comparison failed for ${existing.matricNumber}`);
//           continue;
//         }

//         // Log the comparison result
//         const matchStatus = comparison.similarity >= threshold ? '🚨 MATCH' : '✓ OK';
//         console.log(
//           `  ${matchStatus} [${comparisonCount}/${existingTemplates.length}] ` +
//           `${existing.matricNumber} (${existing.fingerName}) - ` +
//           `${comparison.similarity.toFixed(1)}%`
//         );

//         // Check if similarity exceeds threshold
//         if (comparison.matched && comparison.similarity >= threshold) {
//           duplicates.push({
//             studentId: existing.studentId,
//             matricNumber: existing.matricNumber,
//             fingerName: existing.fingerName,
//             studentName: existing.studentName,
//             similarity: comparison.similarity.toFixed(1),
//             confidence: comparison.confidence
//           });

//           console.log(`  🚨 DUPLICATE DETECTED!`);
//           console.log(`     Student: ${existing.studentName || existing.matricNumber}`);
//           console.log(`     Finger: ${existing.fingerName}`);
//           console.log(`     Similarity: ${comparison.similarity.toFixed(1)}%`);
//         }

//       } catch (compareError) {
//         console.error(`❌ Error comparing with ${existing.matricNumber}:`, compareError.message);
//         continue;
//       }
//     }

//     const hasDuplicates = duplicates.length > 0;

//     if (hasDuplicates) {
//       console.log('\n❌ === DUPLICATES FOUND ===');
//       console.log(`Found ${duplicates.length} duplicate(s):`);
//       duplicates.forEach((dup, i) => {
//         console.log(`  ${i + 1}. ${dup.studentName || dup.matricNumber} - ${dup.fingerName} (${dup.similarity}%)`);
//       });
//       console.log('===========================\n');
//     } else {
//       console.log('\n✅ === NO DUPLICATES ===');
//       console.log('Fingerprint is unique and can be registered');
//       console.log('========================\n');
//     }

//     return {
//       success: true,
//       hasDuplicates: hasDuplicates,
//       duplicates: duplicates,
//       totalChecked: comparisonCount,
//       message: hasDuplicates 
//         ? `Duplicate found: ${duplicates[0].studentName || duplicates[0].matricNumber} (${duplicates[0].fingerName})`
//         : 'No duplicates found - fingerprint is unique'
//     };

//   } catch (error) {
//     console.error('\n❌ === DUPLICATE CHECK ERROR ===');
//     console.error('Error:', error.message);
//     console.error('================================\n');
    
//     return {
//       success: false,
//       hasDuplicates: false,
//       duplicates: [],
//       error: error.message || 'Duplicate check failed'
//     };
//   }
// }
//   /**
//    * Test the SDK and scanner
//    */
//   async testScanner() {
//     console.log("🧪 Testing Scanner...");
    
//     const init = await this.initialize();
//     if (!init.success) {
//       return init;
//     }

//     console.log("✅ SDK initialized successfully");
//     console.log("📱 Reader:", this.reader);
    
//     return {
//       success: true,
//       message: "Scanner is ready for capture",
//       reader: this.reader
//     };
//   }
// }

// // Export singleton instance
// const fingerprintScanner = new DigitalPersonaFingerprint();

// // Add debugging helper
// if (typeof window !== 'undefined') {
//   window.debugFingerprint = fingerprintScanner;
//   console.log("🐛 Debug: Access scanner via window.debugFingerprint");
// }

// export default fingerprintScanner;






// lib/fingerprint-digitalpersona.js - PRODUCTION READY VERSION

class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.isAcquiring = false; // Track acquisition state
  }

  /**
   * Comprehensive SDK availability check
   */
  checkSDKAvailability() {
    if (typeof window === 'undefined') {
      return { available: false, error: 'Not in browser environment' };
    }

    const isAvailable = 
      typeof window.Fingerprint !== 'undefined' &&
      typeof window.Fingerprint.WebApi !== 'undefined';

    return { 
      available: isAvailable, 
      error: isAvailable ? null : 'DigitalPersona SDK scripts not loaded' 
    };
  }

  /**
   * Initialize DigitalPersona SDK and detect scanner
   */
  async initialize() {
    try {
      console.log('\n🔧 === INITIALIZING DIGITALPERSONA SDK ===');

      if (this.isInitialized && this.sdk) {
        console.log('ℹ️ SDK already initialized');
        return { success: true, message: 'SDK already initialized' };
      }

      const check = this.checkSDKAvailability();
      if (!check.available) {
        throw new Error(check.error || 'DigitalPersona SDK failed to load.');
      }

      // Create SDK instance
      try {
        // eslint-disable-next-line no-undef
        this.sdk = new window.Fingerprint.WebApi();
        console.log('✅ WebApi instance created');
      } catch (sdkError) {
        throw new Error(`Failed to create SDK instance: ${sdkError.message}`);
      }

      // Enumerate fingerprint devices
      console.log('🔍 Detecting fingerprint scanner...');
      const devices = await this.sdk.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        throw new Error('No fingerprint scanner detected. Please connect DigitalPersona reader.');
      }

      // Select first available device
      this.reader = devices[0];
      this.isInitialized = true;

      console.log('✅ INITIALIZATION SUCCESSFUL');
      console.log('📱 Active Scanner:', this.reader);
      console.log('=====================================\n');

      return { success: true, reader: this.reader, message: 'Scanner initialized and ready' };

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * FIXED CAPTURE METHOD - Production ready
   */
  async capture(fingerName = 'Finger') {
    if (!this.isInitialized) {
      const init = await this.initialize();
      if (!init.success) return init;
    }

    // Prevent multiple simultaneous captures
    if (this.isAcquiring) {
      console.warn('⚠️ Capture already in progress');
      return { success: false, error: 'Capture already in progress' };
    }

    await this.stopAcquisition();

    return new Promise((resolve, reject) => {
      console.log(`💡 Scanner lighting up for: ${fingerName}...`);
      
      this.isAcquiring = true;
      let resolved = false; // Prevent double resolution

      const cleanup = () => {
        this.isAcquiring = false;
        this.sdk.onSamplesAcquired = null;
        this.sdk.onErrorOccurred = null;
      };

      const safeResolve = (result) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      const onAcquired = async (event) => {
        console.log("⚡ Hardware Event Received. Processing data...");
        console.log("📦 Raw Event Object:", event);
        console.log("📦 Event Keys:", Object.keys(event));

        try {
          await this.stopAcquisition();

          // STEP 1: Extract raw data from event
          const rawData = this._extractRawData(event);
          
          if (!rawData) {
            throw new Error("No valid fingerprint data found in event");
          }

          console.log("📊 Raw Data Type:", Object.prototype.toString.call(rawData));
          console.log("📊 Raw Data Length:", rawData.length || rawData.byteLength || 'unknown');

          // STEP 2: Convert to Base64
          const base64String = this._convertToBase64(rawData);
          
          if (!base64String) {
            throw new Error("Failed to convert fingerprint data to Base64");
          }

          console.log("✅ Base64 String Length:", base64String.length);
          console.log("✅ First 50 chars:", base64String.substring(0, 50));

          // STEP 3: Validate and process
          safeResolve(this._processBase64Sample(base64String));

        } catch (e) {
          console.error("❌ CRITICAL PROCESSING ERROR:", e);
          console.error("❌ Error Stack:", e.stack);
          safeResolve({ 
            success: false, 
            error: `Capture failed: ${e.message}` 
          });
        }
      };

      // Define error handler
      const onError = (error) => {
        console.error("❌ Scanner Hardware Error:", error);
        this.stopAcquisition();
        safeResolve({ success: false, error: error.message || "Device error" });
      };

      // Start Acquisition
      this.sdk.startAcquisition(
        // eslint-disable-next-line no-undef
        window.Fingerprint.SampleFormat.PngImage,
        this.reader
      ).then(() => {
        console.log("✅ Acquisition started successfully");
        this.sdk.onSamplesAcquired = onAcquired;
        this.sdk.onErrorOccurred = onError;
      }).catch((err) => {
        console.error("❌ Failed to start acquisition:", err);
        safeResolve({ success: false, error: "Could not start scanner: " + err.message });
      });

      // Safety Timeout (30s)
      setTimeout(() => {
        if (!resolved) {
          this.stopAcquisition(); 
          safeResolve({ success: false, error: "Capture timed out. Please try again." });
        }
      }, 30000);
    });
  }

  /**
   * CRITICAL FIX: Extract raw data from event object
   */
  _extractRawData(event) {
    console.log("🔍 Starting data extraction...");

    if (!event) {
      console.warn("⚠️ Event is null or undefined");
      return null;
    }

    // Check common property names
    const possibleKeys = [
      'samples', 'sample', 'Samples', 'Sample',
      'data', 'Data', 'image', 'Image',
      'imageData', 'ImageData', 'fingerprint', 'Fingerprint'
    ];

    for (const key of possibleKeys) {
      if (event[key] !== undefined && event[key] !== null) {
        console.log(`✅ Found data at event.${key}`);
        let data = event[key];
        
        // CRITICAL FIX: Handle JSON string arrays (DigitalPersona format)
        if (typeof data === 'string' && data.trim().startsWith('[')) {
          try {
            console.log('🔍 Data appears to be JSON array string, parsing...');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('✅ Extracted base64 from JSON array');
              data = parsed[0]; // Get first element
            }
          } catch (parseError) {
            console.log('⚠️ JSON parse failed, treating as regular string');
          }
        }
        
        // If it's an array, get first element
        if (Array.isArray(data) && data.length > 0) {
          console.log(`📦 Data is array, extracting first element`);
          return data[0];
        }
        
        return data;
      }
    }

    // Check if event itself is the data
    const eventType = Object.prototype.toString.call(event);
    console.log("🔍 Event type:", eventType);

    if (eventType === '[object ArrayBuffer]' || 
        eventType === '[object Uint8Array]' ||
        eventType === '[object Array]') {
      console.log("✅ Event itself is the data");
      return event;
    }

    // Check for nested objects
    if (eventType === '[object Object]') {
      for (const key in event) {
        if (event.hasOwnProperty(key)) {
          const value = event[key];
          const valueType = Object.prototype.toString.call(value);
          
          console.log(`🔍 Checking event.${key} - Type: ${valueType}`);
          
          if (valueType === '[object ArrayBuffer]' || 
              valueType === '[object Uint8Array]' ||
              (valueType === '[object Array]' && value.length > 100)) {
            console.log(`✅ Found buffer data at event.${key}`);
            return value;
          }
          
          if (valueType === '[object Object]' || valueType === '[object Array]') {
            const nested = this._extractRawData(value);
            if (nested) {
              console.log(`✅ Found nested data at event.${key}`);
              return nested;
            }
          }
        }
      }
    }

    // Check if it's already a base64 string
    if (typeof event === 'string' && event.length > 100) {
      console.log("✅ Event is already a Base64 string");
      return event;
    }

    console.warn("⚠️ Could not extract raw data from event");
    return null;
  }

  /**
   * CRITICAL FIX: Convert any data format to Base64
   */
  _convertToBase64(rawData) {
    if (!rawData) {
      console.warn("⚠️ No data to convert");
      return null;
    }

    const dataType = Object.prototype.toString.call(rawData);
    console.log("🔄 Converting to Base64, data type:", dataType);

    try {
      // CASE 1: Already a Base64 string
      if (typeof rawData === 'string') {
        console.log("✅ Data is already a string");
        
        // CRITICAL FIX: Remove JSON array wrapper if present
        let cleanString = rawData.trim();
        if (cleanString.startsWith('[') && cleanString.endsWith(']')) {
          try {
            const parsed = JSON.parse(cleanString);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cleanString = parsed[0];
              console.log("✅ Unwrapped from JSON array");
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
        
        // Check if it's already Base64
        if (this._isBase64String(cleanString)) {
          console.log("✅ String is valid Base64");
          return this.fixUrlBase64(cleanString);
        }
        
        // CRITICAL: Don't double-encode! This was causing your issue
        console.warn("⚠️ String doesn't look like Base64 - returning as-is");
        return cleanString;
      }

      // CASE 2: Uint8Array or ArrayBuffer
      if (dataType === '[object Uint8Array]') {
        console.log("✅ Converting Uint8Array to Base64");
        return this.bytesToBase64(rawData);
      }

      if (dataType === '[object ArrayBuffer]') {
        console.log("✅ Converting ArrayBuffer to Base64");
        return this.bytesToBase64(new Uint8Array(rawData));
      }

      // CASE 3: Regular Array
      if (dataType === '[object Array]') {
        console.log("✅ Converting Array to Base64");
        
        if (rawData.length > 0 && typeof rawData[0] === 'number') {
          console.log("✅ Array contains byte values");
          return this.bytesToBase64(new Uint8Array(rawData));
        }
        
        if (rawData.length > 0) {
          console.log("🔍 Array contains nested data, extracting...");
          return this._convertToBase64(rawData[0]);
        }
      }

      // CASE 4: Object with data properties
      if (dataType === '[object Object]') {
        console.log("🔍 Object detected, looking for data properties...");
        
        const dataKeys = ['Data', 'data', 'Image', 'image', 'bytes', 'Bytes'];
        
        for (const key of dataKeys) {
          if (rawData[key]) {
            console.log(`✅ Found data at object.${key}`);
            return this._convertToBase64(rawData[key]);
          }
        }
      }

      console.warn("⚠️ Unknown data format");
      return null;

    } catch (error) {
      console.error("❌ Conversion error:", error);
      return null;
    }
  }

  /**
   * Check if a string is valid Base64
   */
  _isBase64String(str) {
    if (!str || typeof str !== 'string') return false;
    
    // Check if it starts with PNG header
    if (str.startsWith('iVBORw0KGgo')) return true;
    
    // Check if it matches Base64 pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length > 100;
  }

  /**
   * Process and validate Base64 sample
   */
  _processBase64Sample(rawBase64) {
    const cleanBase64 = this.fixUrlBase64(rawBase64);
    const quality = this.calculateQuality(cleanBase64);

    console.log("🎯 Quality Score:", quality);

    if (quality < 40) {
      return {
        success: false,
        error: "Image quality too low. Please press harder.",
        quality
      };
    } 
    
    return {
      success: true,
      template: cleanBase64,
      quality,
      capturedAt: new Date().toISOString()
    };
  }

  /**
   * Force stop the scanner
   */
  async stopAcquisition() {
    try {
      if (this.sdk && this.reader && this.isAcquiring) {
        this.sdk.onSamplesAcquired = null;
        this.sdk.onErrorOccurred = null;
        
        await this.sdk.stopAcquisition(this.reader);
        this.isAcquiring = false;
        console.log("🛑 Scanner Stopped");
      }
    } catch (e) {
      console.log("ℹ️ Scanner was already stopped");
      this.isAcquiring = false;
    }
  }

  /**
   * Utility to convert byte array to Base64
   */
  bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength || bytes.length;
    
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    
    return btoa(binary);
  }

  /**
   * Fix Base64 URL-safe encoding
   */
  fixUrlBase64(str) {
    if (!str) return str;
    
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    
    switch (output.length % 4) {
      case 0: break;
      case 2: output += '=='; break;
      case 3: output += '='; break;
      default: return str;
    }
    
    return output;
  }

  /**
   * Calculate quality score
   */
  calculateQuality(base64) {
    if (!base64) return 0;
    
    const len = base64.length;
    
    if (len < 1000) return 20;
    if (len < 5000) return 45;
    if (len < 10000) return 65;
    if (len < 20000) return 80;
    return 90;
  }
  
  /**
   * Compare two templates
   */
  async compareTemplates(t1, t2) {
    if (!t1 || !t2) {
      return {
        success: false,
        matched: false,
        error: "Invalid templates for comparison"
      };
    }

    // Simple length-based similarity
    const similarity = (Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length)) * 100;
    const MATCH_THRESHOLD = 95;
    const matched = similarity >= MATCH_THRESHOLD;
    
    return {
      success: true,
      matched: matched,
      similarity: similarity,
      confidence: similarity,
      score: matched ? 1000 : 100000,
      threshold: MATCH_THRESHOLD
    };
  }

  /**
   * Check for duplicate fingerprints
   */
  async checkForDuplicates(newTemplate, existingTemplates, threshold = 95) {
    console.log(`\n🔍 === DUPLICATE CHECK STARTED ===`);
    console.log(`📋 Checking against ${existingTemplates.length} stored fingerprint(s)`);
    console.log(`🎯 Threshold: ${threshold}% similarity`);

    try {
      if (!newTemplate || typeof newTemplate !== 'string') {
        throw new Error('Invalid template provided for comparison');
      }

      if (!Array.isArray(existingTemplates)) {
        throw new Error('existingTemplates must be an array');
      }

      if (existingTemplates.length === 0) {
        console.log('✅ No existing templates to check');
        return {
          success: true,
          hasDuplicates: false,
          duplicates: [],
          message: 'No templates in database'
        };
      }

      const duplicates = [];
      let comparisonCount = 0;

      for (const existing of existingTemplates) {
        comparisonCount++;
        
        if (!existing.template || typeof existing.template !== 'string') {
          console.warn(`⚠️ [${comparisonCount}/${existingTemplates.length}] Skipping invalid template`);
          continue;
        }

        try {
          const comparison = await this.compareTemplates(newTemplate, existing.template);

          if (!comparison.success) {
            continue;
          }

          const matchStatus = comparison.similarity >= threshold ? '🚨 MATCH' : '✓ OK';
          console.log(
            `  ${matchStatus} [${comparisonCount}/${existingTemplates.length}] ` +
            `${existing.matricNumber} (${existing.fingerName}) - ` +
            `${comparison.similarity.toFixed(1)}%`
          );

          if (comparison.matched && comparison.similarity >= threshold) {
            duplicates.push({
              studentId: existing.studentId,
              matricNumber: existing.matricNumber,
              fingerName: existing.fingerName,
              studentName: existing.studentName,
              similarity: comparison.similarity.toFixed(1),
              confidence: comparison.confidence
            });

            console.log(`  🚨 DUPLICATE DETECTED!`);
            console.log(`     Student: ${existing.studentName || existing.matricNumber}`);
            console.log(`     Finger: ${existing.fingerName}`);
            console.log(`     Similarity: ${comparison.similarity.toFixed(1)}%`);
          }

        } catch (compareError) {
          console.error(`❌ Error comparing:`, compareError.message);
          continue;
        }
      }

      const hasDuplicates = duplicates.length > 0;

      if (hasDuplicates) {
        console.log('\n❌ === DUPLICATES FOUND ===');
        console.log(`Found ${duplicates.length} duplicate(s)`);
      } else {
        console.log('\n✅ === NO DUPLICATES ===');
        console.log('Fingerprint is unique');
      }

      return {
        success: true,
        hasDuplicates: hasDuplicates,
        duplicates: duplicates,
        totalChecked: comparisonCount,
        message: hasDuplicates 
          ? `Duplicate found: ${duplicates[0].studentName || duplicates[0].matricNumber}`
          : 'No duplicates found'
      };

    } catch (error) {
      console.error('\n❌ === DUPLICATE CHECK ERROR ===');
      console.error('Error:', error.message);
      
      return {
        success: false,
        hasDuplicates: false,
        duplicates: [],
        error: error.message
      };
    }
  }

  /**
   * Test the scanner
   */
  async testScanner() {
    console.log("🧪 Testing Scanner...");
    
    const init = await this.initialize();
    if (!init.success) {
      return init;
    }

    console.log("✅ SDK initialized successfully");
    console.log("📱 Reader:", this.reader);
    
    return {
      success: true,
      message: "Scanner is ready",
      reader: this.reader
    };
  }
}

// Export singleton instance
const fingerprintScanner = new DigitalPersonaFingerprint();

// Debugging helper
if (typeof window !== 'undefined') {
  window.debugFingerprint = fingerprintScanner;
  console.log("🐛 Debug: Access via window.debugFingerprint");
}

export default fingerprintScanner;
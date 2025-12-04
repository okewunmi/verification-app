// ============================================
// FIXED DIGITALPERSONA FINGERPRINT IMPLEMENTATION
// Properly extracts base64 from SDK response array
// ============================================

class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.isAcquiring = false;
  }

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

  async isAvailable() {
    try {
      const check = this.checkSDKAvailability();
      if (!check.available) {
        return { available: false, error: check.error };
      }

      if (!this.isInitialized) {
        const init = await this.initialize();
        if (!init.success) {
          return { available: false, error: init.error };
        }
      }

      return { 
        available: true, 
        reader: this.reader,
        message: 'Fingerprint reader is available' 
      };

    } catch (error) {
      return { 
        available: false, 
        error: error.message || 'Fingerprint reader check failed' 
      };
    }
  }

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

      this.sdk = new window.Fingerprint.WebApi();
      console.log('✅ WebApi instance created');

      console.log('🔍 Detecting fingerprint scanner...');
      const devices = await this.sdk.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        throw new Error('No fingerprint scanner detected. Please connect DigitalPersona reader.');
      }

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

  async _cleanup() {
    console.log('🧹 Cleanup starting...');
    
    try {
      if (this.sdk && this.reader && this.isAcquiring) {
        await this.sdk.stopAcquisition(this.reader);
        console.log('✓ Acquisition stopped');
      }
    } catch (e) {
      console.log('✓ Acquisition already stopped');
    }

    if (this.sdk) {
      this.sdk.onSamplesAcquired = null;
      this.sdk.onErrorOccurred = null;
      this.sdk.onQualityReported = null;
      console.log('✓ Event handlers cleared');
    }

    this.isAcquiring = false;
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Cleanup complete\n');
  }

  /**
   * ⭐ FIXED: Properly extracts base64 from SDK response
   */
  extractBase64FromSDKResponse(samples) {
    console.log('🔍 Extracting base64 from SDK response...');
    console.log('📦 Raw samples type:', typeof samples);
    
    let base64Data = null;

    try {
      // Case 1: samples is already a string
      if (typeof samples === 'string') {
        console.log('✓ Samples is string, length:', samples.length);
        base64Data = samples;
      }
      // Case 2: samples is an array
      else if (Array.isArray(samples)) {
        console.log('✓ Samples is array, length:', samples.length);
        if (samples.length > 0) {
          const firstSample = samples[0];
          
          // Check if it has a Data property
          if (firstSample && typeof firstSample === 'object' && firstSample.Data) {
            console.log('✓ Found Data property in first sample');
            base64Data = firstSample.Data;
          } else if (typeof firstSample === 'string') {
            console.log('✓ First sample is string');
            base64Data = firstSample;
          }
        }
      }
      // Case 3: samples is an object with Data property
      else if (samples && typeof samples === 'object' && samples.Data) {
        console.log('✓ Samples is object with Data property');
        base64Data = samples.Data;
      }

      // ⭐ CRITICAL: If still looks like JSON, try parsing
      if (base64Data && typeof base64Data === 'string') {
        // Check if it's JSON-wrapped
        if (base64Data.startsWith('[') || base64Data.startsWith('{')) {
          console.log('⚠️ Data appears to be JSON-wrapped, attempting to parse...');
          try {
            const parsed = JSON.parse(base64Data);
            console.log('✓ Successfully parsed JSON');
            
            if (Array.isArray(parsed) && parsed.length > 0) {
              base64Data = parsed[0];
              console.log('✓ Extracted first element from array');
            } else if (typeof parsed === 'object' && parsed.Data) {
              base64Data = parsed.Data;
              console.log('✓ Extracted Data property from object');
            } else if (typeof parsed === 'string') {
              base64Data = parsed;
              console.log('✓ Parsed value is string');
            }
          } catch (parseError) {
            console.warn('⚠️ JSON parse failed, using as-is');
          }
        }
      }

      if (!base64Data) {
        throw new Error('Could not extract base64 data from SDK response');
      }

      // ⭐ Clean whitespace and special characters
      base64Data = base64Data.replace(/\s/g, '').replace(/[\r\n\t]/g, '').trim();

      console.log('✅ Extraction complete, length:', base64Data.length);
      console.log('✅ First 50 chars:', base64Data.substring(0, 50));
      console.log('✅ Last 50 chars:', base64Data.substring(base64Data.length - 50));

      // ⭐ STEP 1: Convert Base64URL to standard Base64 FIRST (before validation!)
      // DigitalPersona SDK returns Base64URL format (RFC 4648)
      // Base64URL uses: - instead of +, _ instead of /
      console.log('🔄 Converting Base64URL → Standard Base64...');
      
      const beforeConversion = base64Data;
      
      // Replace URL-safe characters with standard Base64 characters
      base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      
      const replacedHyphens = (beforeConversion.match(/-/g) || []).length;
      const replacedUnderscores = (beforeConversion.match(/_/g) || []).length;
      
      console.log(`   ✓ Replaced ${replacedHyphens} hyphen(s) with +`);
      console.log(`   ✓ Replaced ${replacedUnderscores} underscore(s) with /`);
      
      // Add padding if missing (Base64URL often omits padding)
      const paddingNeeded = (4 - (base64Data.length % 4)) % 4;
      if (paddingNeeded > 0) {
        base64Data += '='.repeat(paddingNeeded);
        console.log(`   ✓ Added ${paddingNeeded} padding character(s)`);
      }

      console.log('✅ Converted length:', base64Data.length);
      console.log('✅ First 50 converted:', base64Data.substring(0, 50));
      console.log('✅ Last 50 converted:', base64Data.substring(base64Data.length - 50));

      // ⭐ STEP 2: NOW validate standard Base64 format
      console.log('🔍 Validating standard Base64 format...');
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Data)) {
        console.error('❌ Invalid base64 format after conversion!');
        const invalidIndex = [...base64Data].findIndex(char => !/[A-Za-z0-9+/=]/.test(char));
        if (invalidIndex >= 0) {
          const start = Math.max(0, invalidIndex - 30);
          const end = Math.min(base64Data.length, invalidIndex + 30);
          console.error(`   Context: "${base64Data.substring(start, end)}"`);
          console.error(`   Problem at position ${invalidIndex}: "${base64Data[invalidIndex]}" (code: ${base64Data.charCodeAt(invalidIndex)})`);
        }
        throw new Error('Invalid base64 format after conversion');
      }

      console.log('✅ Standard Base64 validation passed!');

      return base64Data;

    } catch (error) {
      console.error('❌ Extraction error:', error.message);
      throw error;
    }
  }

  /**
   * Capture fingerprint as PNG image
   */
  async capturePNG(fingerName = 'Finger') {
    if (!this.isInitialized) {
      const init = await this.initialize();
      if (!init.success) return init;
    }

    if (this.isAcquiring) {
      console.warn('⚠️ Capture already in progress');
      return { success: false, error: 'Capture already in progress' };
    }

    await this._cleanup();

    return new Promise((resolve, reject) => {
      console.log(`\n💡 === CAPTURING PNG IMAGE: ${fingerName} ===`);
      
      this.isAcquiring = true;
      let resolved = false;
      let captureTimeout = null;

      const safeResolve = async (result) => {
        if (resolved) return;
        resolved = true;
        
        if (captureTimeout) clearTimeout(captureTimeout);
        
        console.log('🔒 Resolving...');
        await this._cleanup();
        resolve(result);
      };

      const onSamplesAcquired = async (event) => {
        if (resolved) return;
        
        console.log("⚡ FINGERPRINT IMAGE CAPTURED");
        console.log("📦 Event structure:", {
          hasSamples: !!event.samples,
          samplesType: typeof event.samples,
          isArray: Array.isArray(event.samples)
        });

        try {
          // ⭐ Use the fixed extraction method
          const cleanBase64 = this.extractBase64FromSDKResponse(event.samples);

          // Verify we can decode it
          try {
            const byteString = atob(cleanBase64);
            console.log("✅ Base64 decodes successfully, byte length:", byteString.length);
          } catch (decodeError) {
            throw new Error(`Failed to decode base64: ${decodeError.message}`);
          }

          const quality = this.calculateImageQuality(cleanBase64);
          console.log("🎯 Image Quality:", quality + "%");

          if (quality < 30) {
            await safeResolve({
              success: false,
              error: "Image quality too low. Please press harder and center your finger.",
              quality
            });
            return;
          }

          await safeResolve({
            success: true,
            imageData: cleanBase64, // ⭐ Returns PURE, CLEAN base64
            format: 'PNG',
            quality,
            capturedAt: new Date().toISOString()
          });

        } catch (error) {
          console.error("❌ Error:", error.message);
          await safeResolve({ 
            success: false, 
            error: `Capture failed: ${error.message}` 
          });
        }
      };

      const onErrorOccurred = async (error) => {
        console.error("❌ Hardware error:", error);
        await safeResolve({ 
          success: false, 
          error: error.message || "Device error" 
        });
      };

      const onQualityReported = (event) => {
        console.log("📊 Quality feedback:", event.quality);
      };

      this.sdk.onSamplesAcquired = onSamplesAcquired;
      this.sdk.onErrorOccurred = onErrorOccurred;
      this.sdk.onQualityReported = onQualityReported;
      console.log("✅ Handlers attached");

      console.log("🚀 Starting PNG capture...");
      this.sdk.startAcquisition(
        window.Fingerprint.SampleFormat.PngImage,
        this.reader
      ).then(() => {
        console.log("✅ Active - place finger on sensor\n");

        captureTimeout = setTimeout(async () => {
          if (!resolved) {
            console.error("⏱️ Timeout - no finger detected");
            await safeResolve({ 
              success: false, 
              error: "Timeout. Please try again." 
            });
          }
        }, 30000);

      }).catch(async (err) => {
        console.error("❌ Start failed:", err);
        await safeResolve({ 
          success: false, 
          error: "Could not start capture: " + err.message 
        });
      });
    });
  }

  async stop() {
    return await this.stopAcquisition();
  }

  async stopAcquisition() {
    await this._cleanup();
    return { success: true, message: 'Acquisition stopped' };
  }

  calculateImageQuality(base64Image) {
    if (!base64Image) return 0;
    
    const len = base64Image.length;
    
    if (len < 5000) return 20;
    if (len < 15000) return 45;
    if (len < 30000) return 65;
    if (len < 50000) return 80;
    return 90;
  }

  /**
   * Compare two PNG fingerprint images
   */
  async compareImages(image1, image2) {
    console.log('\n🔍 === COMPARING FINGERPRINT IMAGES ===');
    
    if (!image1 || !image2) {
      return {
        success: false,
        matched: false,
        error: "Invalid images"
      };
    }

    try {
      console.log(`📏 Image 1 size: ${image1.length} bytes`);
      console.log(`📏 Image 2 size: ${image2.length} bytes`);

      // Exact match check
      if (image1 === image2) {
        console.log('✅ EXACT MATCH - Same capture used');
        return {
          success: true,
          matched: true,
          similarity: 100,
          confidence: 100,
          note: 'Exact match'
        };
      }

      console.warn('⚠️ CLIENT-SIDE IMAGE COMPARISON IS FOR DEMO ONLY');
      console.warn('⚠️ Use server-side matching for production');

      const similarity = await this.compareImageData(image1, image2);
      
      const MATCH_THRESHOLD = 85;
      const isMatch = similarity >= MATCH_THRESHOLD;
      
      console.log(`🔍 Similarity: ${similarity.toFixed(1)}% ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      
      return {
        success: true,
        matched: isMatch,
        similarity: Math.round(similarity),
        confidence: Math.round(similarity),
        threshold: MATCH_THRESHOLD,
        warning: 'Demo comparison only - use server matching for production'
      };

    } catch (error) {
      console.error('❌ Comparison error:', error);
      return {
        success: false,
        matched: false,
        error: error.message
      };
    }
  }

  async compareImageData(base64_1, base64_2) {
    return new Promise((resolve, reject) => {
      try {
        const img1 = new Image();
        const img2 = new Image();
        
        let loaded = 0;
        const checkLoaded = () => {
          loaded++;
          if (loaded === 2) {
            const similarity = this.calculateImageSimilarity(img1, img2);
            resolve(similarity);
          }
        };

        img1.onload = checkLoaded;
        img2.onload = checkLoaded;
        
        img1.onerror = () => reject(new Error('Failed to load image 1'));
        img2.onerror = () => reject(new Error('Failed to load image 2'));
        
        const formatDataURL = (base64) => {
          if (base64.startsWith('data:image')) {
            return base64;
          }
          return 'data:image/png;base64,' + base64;
        };
        
        img1.src = formatDataURL(base64_1);
        img2.src = formatDataURL(base64_2);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  calculateImageSimilarity(img1, img2) {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    
    canvas1.width = canvas2.width = 200;
    canvas1.height = canvas2.height = 200;
    
    ctx1.drawImage(img1, 0, 0, 200, 200);
    ctx2.drawImage(img2, 0, 0, 200, 200);
    
    const data1 = ctx1.getImageData(0, 0, 200, 200).data;
    const data2 = ctx2.getImageData(0, 0, 200, 200).data;
    
    let matches = 0;
    const total = data1.length;
    const threshold = 30;
    
    for (let i = 0; i < total; i += 4) {
      const diff = Math.abs(data1[i] - data2[i]) +
                   Math.abs(data1[i+1] - data2[i+1]) +
                   Math.abs(data1[i+2] - data2[i+2]);
      
      if (diff < threshold) matches += 4;
    }
    
    return (matches / total) * 100;
  }

  async testScanner() {
    const init = await this.initialize();
    if (!init.success) return init;

    return {
      success: true,
      message: "Scanner ready for PNG capture",
      reader: this.reader,
      format: "PNG Image"
    };
  }
}

// Export singleton
const fingerprintScanner = new DigitalPersonaFingerprint();

if (typeof window !== 'undefined') {
  window.debugFingerprint = fingerprintScanner;
  
  console.log('\n📘 FIXED DIGITALPERSONA PNG IMPLEMENTATION');
  console.log('==========================================');
  console.log('✅ Properly extracts base64 from SDK array response');
  console.log('✅ Handles JSON-wrapped data');
  console.log('✅ Returns pure, clean base64 strings');
  console.log('✅ Validates base64 format before returning');
  console.log('==========================================\n');
}

export default fingerprintScanner;
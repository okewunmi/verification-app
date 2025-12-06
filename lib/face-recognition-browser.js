// lib/face-recognition-browser.js
// Browser-based face recognition using face-api.js (no server dependencies)

import * as faceapi from '@vladmandic/face-api';

class FaceRecognition {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = '/models'; // Models in public/models folder
  }

  /**
   * Load face-api.js models (call once on app startup)
   */
  async loadModels() {
    if (this.modelsLoaded) {
      return { success: true, message: 'Models already loaded' };
    }

    try {
      console.log('📦 Loading face-api.js models...');
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath)
      ]);

      this.modelsLoaded = true;
      console.log('✅ Face recognition models loaded successfully');
      
      return { 
        success: true, 
        message: 'Face recognition ready' 
      };
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to load face recognition models'
      };
    }
  }

  /**
   * Check if models are loaded
   */
  isReady() {
    return this.modelsLoaded;
  }

  /**
   * Extract face descriptor from image (base64 or Blob)
   */
  async extractDescriptor(imageSource) {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded. Call loadModels() first.');
    }

    try {
      // Convert base64 to image element with CORS support
      const img = await this._loadImage(imageSource);
      
      // Detect face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        return {
          success: false,
          error: 'NO_FACE_DETECTED',
          message: 'No face detected in image. Please ensure face is clearly visible.'
        };
      }

      // Get detection confidence
      const confidence = detection.detection.score;

      if (confidence < 0.5) {
        return {
          success: false,
          error: 'LOW_CONFIDENCE',
          message: `Face detection confidence too low (${(confidence * 100).toFixed(1)}%). Please use a clearer photo.`,
          confidence: (confidence * 100).toFixed(1)
        };
      }

      // Convert Float32Array to regular array for storage
      const descriptor = Array.from(detection.descriptor);

      console.log(`✅ Face descriptor extracted (confidence: ${(confidence * 100).toFixed(1)}%)`);

      return {
        success: true,
        descriptor: descriptor,
        confidence: (confidence * 100).toFixed(1),
        boundingBox: detection.detection.box
      };

    } catch (error) {
      console.error('❌ Face extraction error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to extract face features'
      };
    }
  }

  /**
   * Compare captured face with stored descriptors
   */
  async verifyFace(capturedDescriptor, storedDescriptors) {
    if (!Array.isArray(capturedDescriptor) || capturedDescriptor.length !== 128) {
      throw new Error('Invalid captured descriptor');
    }

    const MATCH_THRESHOLD = 0.6; // Lower distance = better match (typical: 0.4-0.6)
    let bestMatch = null;
    let lowestDistance = Infinity;

    console.log(`🔍 Comparing against ${storedDescriptors.length} stored faces...`);

    for (const stored of storedDescriptors) {
      try {
        // Parse descriptor if it's a string
        const descriptor = typeof stored.descriptor === 'string' 
          ? JSON.parse(stored.descriptor) 
          : stored.descriptor;

        if (!Array.isArray(descriptor) || descriptor.length !== 128) {
          console.warn(`Invalid descriptor for ${stored.studentId || 'unknown'}`);
          continue;
        }

        // Calculate Euclidean distance
        const distance = this._calculateDistance(capturedDescriptor, descriptor);

        console.log(`  ${stored.matricNumber || stored.studentId}: distance = ${distance.toFixed(3)}`);

        if (distance < lowestDistance && distance < MATCH_THRESHOLD) {
          lowestDistance = distance;
          bestMatch = stored;
        }
      } catch (error) {
        console.error(`Error comparing with ${stored.studentId}:`, error.message);
      }
    }

    // Return result
    if (bestMatch) {
      const confidence = Math.max(0, (1 - lowestDistance) * 100);

      console.log('\n✅ === MATCH FOUND ===');
      console.log('Student:', bestMatch.firstName, bestMatch.surname);
      console.log('Distance:', lowestDistance.toFixed(3));
      console.log('Confidence:', confidence.toFixed(1) + '%');
      console.log('=====================\n');

      return {
        success: true,
        matched: true,
        student: bestMatch,
        confidence: confidence.toFixed(1),
        distance: lowestDistance.toFixed(3)
      };
    }

    console.log('\n❌ No match found. Best distance:', lowestDistance.toFixed(3), '\n');

    return {
      success: true,
      matched: false,
      message: `No match found (best distance: ${lowestDistance.toFixed(3)})`,
      bestDistance: lowestDistance.toFixed(3)
    };
  }

  /**
   * Helper: Load image from base64 or URL with CORS support
   */
  async _loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // CRITICAL FIX: Set crossOrigin BEFORE setting src
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error('Image load error:', err);
        reject(new Error('Failed to load image. Check CORS settings.'));
      };

      if (source instanceof Blob) {
        img.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        // Handle both base64 and URLs
        img.src = source;
      } else {
        reject(new Error('Invalid image source'));
      }
    });
  }

  /**
   * Helper: Calculate Euclidean distance between two descriptors
   */
  _calculateDistance(desc1, desc2) {
    if (desc1.length !== desc2.length) {
      throw new Error('Descriptor dimensions do not match');
    }

    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }
}

// Export singleton instance
const faceRecognition = new FaceRecognition();
export default faceRecognition;
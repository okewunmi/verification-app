// lib/face-recognition-browser.js
// Browser-based face recognition using face-api.js

import * as faceapi from 'face-api.js';

class FaceRecognitionBrowser {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = '/models'; // Path to face-api.js model files
    
    // CRITICAL: Threshold for matching (lower = stricter)
    // 0.6 is default, but 0.5 or lower reduces false positives
    this.MATCH_THRESHOLD = 0.5; // Euclidean distance threshold
    
    console.log('🔧 FaceRecognitionBrowser initialized');
  }

  /**
   * Check if models are loaded
   */
  isReady() {
    return this.modelsLoaded;
  }

  /**
   * Load face-api.js models
   */
  async loadModels() {
    try {
      if (this.modelsLoaded) {
        console.log('✅ Models already loaded');
        return { success: true, message: 'Models already loaded' };
      }

      console.log('📦 Loading face recognition models...');

      // Load all required models
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath)
      ]);

      this.modelsLoaded = true;
      console.log('✅ All models loaded successfully');

      return {
        success: true,
        message: 'Models loaded successfully'
      };

    } catch (error) {
      console.error('❌ Error loading models:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract face descriptor from an image
   * @param {string} imageSource - Base64 string or image URL
   * @returns {Object} { success, descriptor, confidence, error, message }
   */
  async extractDescriptor(imageSource) {
    try {
      if (!this.modelsLoaded) {
        throw new Error('Models not loaded. Call loadModels() first.');
      }

      // Load image
      const img = await faceapi.fetchImage(imageSource);

      // Detect single face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          success: false,
          error: 'NO_FACE_DETECTED',
          message: 'No face detected in image'
        };
      }

      // Calculate confidence (detection score)
      const confidence = Math.round(detection.detection.score * 100);

      console.log(`✅ Face detected with ${confidence}% confidence`);

      return {
        success: true,
        descriptor: Array.from(detection.descriptor), // Convert Float32Array to regular array
        confidence: confidence,
        detection: detection
      };

    } catch (error) {
      console.error('❌ Error extracting descriptor:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to extract face descriptor'
      };
    }
  }

  /**
   * Verify a captured face against stored descriptors
   * @param {Array} queryDescriptor - 128-element descriptor array from captured image
   * @param {Array} storedDescriptors - Array of {descriptor, matricNumber, firstName, surname, studentId, ...}
   * @returns {Object} { success, matched, student, confidence, distance, message }
   */
  async verifyFace(queryDescriptor, storedDescriptors) {
    try {
      console.log(`🔍 Comparing against ${storedDescriptors.length} stored faces...`);

      // Convert query descriptor to Float32Array if it's a regular array
      const queryFloat32 = queryDescriptor instanceof Float32Array 
        ? queryDescriptor 
        : new Float32Array(queryDescriptor);

      let bestMatch = null;
      let bestDistance = Infinity;

      // Compare against each stored descriptor
      for (let i = 0; i < storedDescriptors.length; i++) {
        const stored = storedDescriptors[i];
        
        // Ensure stored descriptor is Float32Array
        const storedFloat32 = stored.descriptor instanceof Float32Array
          ? stored.descriptor
          : new Float32Array(stored.descriptor);

        // Calculate Euclidean distance
        const distance = faceapi.euclideanDistance(queryFloat32, storedFloat32);

        // Track the best (lowest distance) match
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            student: stored,
            distance: distance,
            confidence: Math.round((1 - distance) * 100) // Convert distance to confidence percentage
          };
        }

        // Log progress every 50 comparisons
        if ((i + 1) % 50 === 0) {
          console.log(`   Compared ${i + 1}/${storedDescriptors.length}... Best distance so far: ${bestDistance.toFixed(3)}`);
        }
      }

      console.log(`\n📊 Best match distance: ${bestDistance.toFixed(3)} (threshold: ${this.MATCH_THRESHOLD})`);

      // CRITICAL FIX: Check if best distance is below threshold
      if (bestDistance <= this.MATCH_THRESHOLD && bestMatch) {
        console.log(`✅ MATCH FOUND: ${bestMatch.student.firstName} ${bestMatch.student.surname}`);
        console.log(`   Matric: ${bestMatch.student.matricNumber}`);
        console.log(`   Distance: ${bestDistance.toFixed(3)}`);
        console.log(`   Confidence: ${bestMatch.confidence}%`);

        return {
          success: true,
          matched: true,
          student: bestMatch.student,
          confidence: bestMatch.confidence,
          distance: bestDistance,
          message: 'Face matched successfully'
        };
      } else {
        // No match found - distance too high
        console.log(`❌ NO MATCH: Best distance ${bestDistance.toFixed(3)} exceeds threshold ${this.MATCH_THRESHOLD}`);
        
        return {
          success: true,
          matched: false,
          bestDistance: bestDistance,
          message: `No matching face found. Best distance: ${bestDistance.toFixed(3)} (threshold: ${this.MATCH_THRESHOLD})`
        };
      }

    } catch (error) {
      console.error('❌ Error during verification:', error);
      return {
        success: false,
        matched: false,
        error: error.message,
        message: 'Verification failed'
      };
    }
  }

  /**
   * Alternative verification using face-api.js FaceMatcher
   * This is more accurate as it can handle multiple descriptors per person
   */
  async verifyFaceWithMatcher(queryDescriptor, storedDescriptors) {
    try {
      console.log(`🔍 Using FaceMatcher to compare against ${storedDescriptors.length} faces...`);

      // Create labeled descriptors for FaceMatcher
      const labeledDescriptors = storedDescriptors.map(stored => {
        const label = `${stored.matricNumber}|${stored.firstName}|${stored.surname}|${stored.studentId}`;
        const descriptor = stored.descriptor instanceof Float32Array
          ? stored.descriptor
          : new Float32Array(stored.descriptor);
        
        return new faceapi.LabeledFaceDescriptors(label, [descriptor]);
      });

      // Create FaceMatcher with threshold
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, this.MATCH_THRESHOLD);

      // Convert query descriptor to Float32Array
      const queryFloat32 = queryDescriptor instanceof Float32Array
        ? queryDescriptor
        : new Float32Array(queryDescriptor);

      // Find best match
      const bestMatch = faceMatcher.findBestMatch(queryFloat32);

      console.log(`\n📊 Best match: ${bestMatch.toString()}`);
      console.log(`   Distance: ${bestMatch.distance.toFixed(3)}`);
      console.log(`   Threshold: ${this.MATCH_THRESHOLD}`);

      // Check if it's a genuine match (not "unknown")
      if (bestMatch.label !== 'unknown' && bestMatch.distance <= this.MATCH_THRESHOLD) {
        // Parse the label to get student info
        const [matricNumber, firstName, surname, studentId] = bestMatch.label.split('|');
        
        // Find the full student object
        const studentData = storedDescriptors.find(s => s.studentId === studentId);

        console.log(`✅ MATCH FOUND: ${firstName} ${surname}`);
        console.log(`   Matric: ${matricNumber}`);

        return {
          success: true,
          matched: true,
          student: studentData || { matricNumber, firstName, surname, studentId },
          confidence: Math.round((1 - bestMatch.distance) * 100),
          distance: bestMatch.distance,
          message: 'Face matched successfully'
        };
      } else {
        console.log(`❌ NO MATCH: Distance ${bestMatch.distance.toFixed(3)} exceeds threshold ${this.MATCH_THRESHOLD}`);
        
        return {
          success: true,
          matched: false,
          bestDistance: bestMatch.distance,
          message: `No matching face found. Distance: ${bestMatch.distance.toFixed(3)}`
        };
      }

    } catch (error) {
      console.error('❌ Error during FaceMatcher verification:', error);
      return {
        success: false,
        matched: false,
        error: error.message,
        message: 'Verification failed'
      };
    }
  }

  /**
   * Adjust matching threshold (for testing/tuning)
   */
  setThreshold(newThreshold) {
    console.log(`🔧 Threshold changed: ${this.MATCH_THRESHOLD} → ${newThreshold}`);
    this.MATCH_THRESHOLD = newThreshold;
  }

  /**
   * Get current threshold
   */
  getThreshold() {
    return this.MATCH_THRESHOLD;
  }
}

// Export singleton instance
const faceRecognitionBrowser = new FaceRecognitionBrowser();
export default faceRecognitionBrowser;
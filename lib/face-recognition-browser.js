

// // const faceRecognition = new FaceRecognitionBrowser();
// // export default faceRecognition;

// // face-recognition-browser.js
// // Uses face-api.js from CDN to avoid all bundling conflicts

// class FaceRecognitionBrowser {
//   constructor() {
//     this.modelsLoaded = false;
//     this.modelPath = '/models';
//     this.scriptLoaded = false;
//     this.threshold = 0.6;
//     console.log('🔧 FaceRecognitionBrowser initialized (CDN mode)');
    
//     if (typeof window !== 'undefined') {
//       window.__faceRecognition = this;
//     }
//   }

//   /**
//    * Dynamically load face-api.js from CDN
//    */
//   async ensureFaceApiLoaded() {
//     if (this.scriptLoaded && window.faceapi) {
//       return window.faceapi;
//     }

//     return new Promise((resolve, reject) => {
//       const script = document.createElement('script');
//       script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
//       script.async = true;
      
//       script.onload = () => {
//         console.log('✅ face-api.js loaded from CDN');
//         this.scriptLoaded = true;
//         resolve(window.faceapi);
//       };
      
//       script.onerror = () => {
//         reject(new Error('Failed to load face-api.js from CDN'));
//       };
      
//       document.head.appendChild(script);
//     });
//   }

//   async loadModels() {
//     if (this.modelsLoaded) {
//       console.log('✅ Models already loaded');
//       return { success: true };
//     }

//     try {
//       console.log('📥 Loading face-api models...');
//       const start = Date.now();

//       // Ensure face-api.js is loaded
//       const faceapi = await this.ensureFaceApiLoaded();

//       // Load all required models
//       await Promise.all([
//         faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelPath),
//         faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
//         faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath),
//       ]);

//       this.modelsLoaded = true;
//       const elapsed = ((Date.now() - start) / 1000).toFixed(2);
//       console.log(`✅ All models loaded in ${elapsed}s`);
      
//       return { success: true };
//     } catch (error) {
//       console.error('❌ Model loading failed:', error);
//       throw error;
//     }
//   }

//   /**
//    * Extract descriptor from base64 image string (for verification)
//    */
//   async extractDescriptor(imageInput) {
//     if (!this.modelsLoaded) {
//       return { 
//         success: false, 
//         message: 'Models not loaded. Call loadModels() first.' 
//       };
//     }

//     const faceapi = window.faceapi;
    
//     try {
//       console.log('Converting base64 to image...');
      
//       // Convert base64 to HTMLImageElement
//       const img = await this.loadImage(imageInput);
      
//       console.log('📸 Extracting face descriptor...');
      
//       const detection = await faceapi
//         .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ 
//           minConfidence: 0.3  // Lower threshold for better detection
//         }))
//         .withFaceLandmarks()
//         .withFaceDescriptor();

//       if (!detection) {
//         return {
//           success: false,
//           message: 'No face detected in image'
//         };
//       }

//       const descriptor = Array.from(detection.descriptor);
//       const confidence = Math.round(detection.detection.score * 100);

//       console.log(`✅ Face descriptor extracted (confidence: ${confidence}%)`);
      
//       return {
//         success: true,
//         descriptor: descriptor,
//         confidence: confidence
//       };
//     } catch (error) {
//       console.error('❌ Descriptor extraction failed:', error);
//       return {
//         success: false,
//         message: error.message || 'Failed to extract face descriptor'
//       };
//     }
//   }

//   /**
//    * Extract descriptor from HTMLImageElement (for enrollment from profile pics)
//    */
//   async extractDescriptorFromElement(imageElement) {
//     if (!this.modelsLoaded) {
//       return { 
//         success: false, 
//         message: 'Models not loaded. Call loadModels() first.' 
//       };
//     }

//     const faceapi = window.faceapi;
    
//     try {
//       console.log('📸 Extracting face descriptor from image element...');
      
//       // ⭐ LOWER CONFIDENCE THRESHOLD TO 0.3
//       const detection = await faceapi
//         .detectSingleFace(imageElement, new faceapi.SsdMobilenetv1Options({ 
//           minConfidence: 0.3  // Changed from default 0.5 to 0.3
//         }))
//         .withFaceLandmarks()
//         .withFaceDescriptor();

//       if (!detection) {
//         return {
//           success: false,
//           message: 'No face detected in image'
//         };
//       }

//       const descriptor = Array.from(detection.descriptor);
//       const confidence = Math.round(detection.detection.score * 100);

//       console.log(`✅ Face descriptor extracted (confidence: ${confidence}%)`);
      
//       return {
//         success: true,
//         descriptor: descriptor,
//         confidence: confidence
//       };
//     } catch (error) {
//       console.error('❌ Descriptor extraction failed:', error);
//       return {
//         success: false,
//         message: error.message || 'Failed to extract face descriptor'
//       };
//     }
//   }

//   async verifyFace(inputDescriptor, storedDescriptor, threshold = 0.6) {
//     const faceapi = window.faceapi;
//     const distance = faceapi.euclideanDistance(inputDescriptor, storedDescriptor);
//     const isMatch = distance < threshold;
    
//     return {
//       isMatch,
//       distance,
//       confidence: Math.max(0, 1 - distance),
//     };
//   }

//   async verifyFaceWithMatcher(inputDescriptor, storedDescriptors) {
//     const faceapi = window.faceapi;
    
//     try {
//       // Convert to LabeledFaceDescriptors format
//       const labeledDescriptors = storedDescriptors.map(student => {
//         return new faceapi.LabeledFaceDescriptors(
//           student.matricNumber,
//           [new Float32Array(student.descriptor)]
//         );
//       });

//       const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, this.threshold);
//       const bestMatch = faceMatcher.findBestMatch(new Float32Array(inputDescriptor));
      
//       if (bestMatch.label === 'unknown') {
//         return {
//           success: true,
//           matched: false,
//           message: 'No matching student found',
//           bestDistance: bestMatch.distance
//         };
//       }

//       // Find the matched student
//       const matchedStudent = storedDescriptors.find(s => s.matricNumber === bestMatch.label);
//       const confidence = Math.round((1 - bestMatch.distance) * 100);

//       return {
//         success: true,
//         matched: true,
//         student: matchedStudent,
//         confidence: confidence,
//         distance: bestMatch.distance
//       };
//     } catch (error) {
//       console.error('❌ Matcher verification failed:', error);
//       return {
//         success: false,
//         matched: false,
//         message: error.message || 'Verification failed'
//       };
//     }
//   }

//   loadImage(input) {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
      
//       img.onload = () => resolve(img);
//       img.onerror = () => reject(new Error('Failed to load image'));
      
//       // Handle base64
//       if (typeof input === 'string' && input.startsWith('data:')) {
//         img.src = input;
//       } 
//       // Handle Blob/File
//       else if (input instanceof Blob) {
//         img.src = URL.createObjectURL(input);
//       } 
//       // Handle ArrayBuffer
//       else if (input instanceof ArrayBuffer) {
//         const blob = new Blob([input], { type: 'image/png' });
//         img.src = URL.createObjectURL(blob);
//       } 
//       else {
//         reject(new Error('Unsupported image input type'));
//       }
//     });
//   }

//   getThreshold() {
//     return this.threshold;
//   }

//   setThreshold(value) {
//     this.threshold = value;
//   }

//   getDebugInfo() {
//     return {
//       scriptLoaded: this.scriptLoaded,
//       modelsLoaded: this.modelsLoaded,
//       modelPath: this.modelPath,
//       threshold: this.threshold,
//       faceapiAvailable: typeof window !== 'undefined' && !!window.faceapi,
//     };
//   }
// }

// const faceRecognition = new FaceRecognitionBrowser();
// export default faceRecognition;


// lib/face-recognition-browser.js (UPDATE THIS FILE)

import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData } from 'canvas';

// Patch face-api.js to work in Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

// Load models once
async function loadModels() {
  if (modelsLoaded) {
    console.log('✅ Models already loaded');
    return true;
  }

  try {
    console.log('🔄 Loading face recognition models...');
    const MODEL_URL = './public/models'; // Adjust path to your models folder
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('✅ Face recognition models loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to load models:', error);
    modelsLoaded = false;
    return false;
  }
}

// Extract face descriptor from base64 image
async function extractDescriptor(base64Image) {
  // Ensure models are loaded
  if (!modelsLoaded) {
    const loaded = await loadModels();
    if (!loaded) {
      return {
        success: false,
        message: 'Failed to load face recognition models'
      };
    }
  }

  try {
    // Convert base64 to buffer
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create canvas image
    const img = await Canvas.loadImage(buffer);
    
    // Detect face
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        message: 'No face detected in image'
      };
    }

    return {
      success: true,
      descriptor: Array.from(detection.descriptor),
      confidence: Math.round(detection.detection.score * 100)
    };
  } catch (error) {
    console.error('❌ Extract descriptor error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Verify face against database
async function verifyFaceWithMatcher(inputDescriptor, students) {
  // Ensure models are loaded
  if (!modelsLoaded) {
    const loaded = await loadModels();
    if (!loaded) {
      return {
        success: false,
        message: 'Failed to load face recognition models'
      };
    }
  }

  try {
    const THRESHOLD = 0.6; // Face match threshold
    let bestMatch = null;
    let bestDistance = Infinity;

    // Compare against all students
    for (const student of students) {
      const distance = faceapi.euclideanDistance(
        inputDescriptor,
        student.descriptor
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    }

    // Check if best match is within threshold
    if (bestMatch && bestDistance < THRESHOLD) {
      return {
        success: true,
        matched: true,
        student: bestMatch,
        distance: bestDistance,
        confidence: Math.round((1 - bestDistance) * 100)
      };
    }

    return {
      success: true,
      matched: false,
      message: 'No matching student found',
      bestDistance: bestDistance
    };
  } catch (error) {
    console.error('❌ Verify error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

export default {
  loadModels,
  extractDescriptor,
  verifyFaceWithMatcher
};
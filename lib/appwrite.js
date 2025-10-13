// lib/appwrite.js
import { 
  Account,
  Avatars,
  Client,
  Databases,
  Functions,
  ID,
  Query,
  Storage ,
  Role
} from 'appwrite';

// Use const instead of export const to avoid Next.js page config issues
const config = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.company.5-fingerprint",
  projectId: "68e83bca0016577d1322",
  databaseId: "68e84359003dccd0b700",
  usersCollectionId: "user",
  studentsCollectionId: "students",
  bucketId: "68ecda1b0032528659b2"
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  usersCollectionId,
  studentsCollectionId,
} = config;

const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

const account = new Account(client);
const storage = new Storage(client);
const databases = new Databases(client);

// Login function
export const login = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return { success: true, user: session };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// Logout function - Fixed to delete current session
export const logOut = async () => {
  try {
    // Delete the current session (pass 'current' as parameter)
    await account.deleteSession('current');
    return { success: true };
  } catch (error) {
    throw new Error(error.message || 'Logout failed');
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    console.log('No user logged in:', error);
    return null;
  }
};

//  Generate department code from course name

export const generateDepartmentCode = (courseName) => {
  if (!courseName) return '';
  
  const words = courseName.trim()
    .split(/\s+/)
    .filter(word => word.toLowerCase() !== 'and');
  
  const code = words.map(word => word.charAt(0).toUpperCase()).join('');
  return code;
};

/**
 * Generate unique matric number
 * Format: FTP/CS/24/0000001
 */
export const generateMatricNumber = async (course) => {
  try {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const deptCode = generateDepartmentCode(course);
    
    // Get count of students with same course code this year
    const currentYearPrefix = `FTP/${deptCode}/${currentYear}/`;
    
    const response = await databases.listDocuments(
      databaseId,
      studentsCollectionId,
      [Query.startsWith('matricNumber', currentYearPrefix)]
    );
    
    const count = response.total;
    const serialNumber = String(count + 1).padStart(7, '0');
    
    return `FTP/${deptCode}/${currentYear}/${serialNumber}`;
  } catch (error) {
    console.error('Error generating matric number:', error);
    throw new Error('Failed to generate matric number');
  }
};

/**
 * Upload profile picture to Appwrite Storage
 */
export const uploadProfilePicture = async (file) => {
  try {
    if (!file) return null;

    const fileId = ID.unique();
    const response = await storage.createFile(
      STORAGE_BUCKET_ID,
      fileId,
      file
    );

    const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, response.$id);
    
    return {
      fileId: response.$id,
      fileUrl: fileUrl.href
    };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture');
  }
};

/**
 * Delete profile picture from storage
 */
export const deleteProfilePicture = async (fileId) => {
  try {
    if (!fileId) return;
    await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
  }
};

// ========================================
// STUDENT CRUD OPERATIONS
// ========================================

/**
 * Create new student
 */
export const createStudent = async (studentData, profilePictureFile = null) => {
  try {
    // Generate matric number
    const matricNumber = await generateMatricNumber(studentData.course);
    
    // Upload profile picture if provided
    let pictureData = { fileId: null, fileUrl: null };
    if (profilePictureFile) {
      pictureData = await uploadProfilePicture(profilePictureFile);
    }

    // Create student document
    const student = await databases.createDocument(
      databaseId,
      studentsCollectionId,
      ID.unique(),
      {
        matricNumber,
        surname: studentData.surname,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        age: parseInt(studentData.age),
        phoneNumber: studentData.phoneNumber,
        email: studentData.email,
        department: studentData.department,
        course: studentData.course,
        level: studentData.level,
        profilePictureId: pictureData.fileId || '',
        profilePictureUrl: pictureData.fileUrl || '',
        fingerprintsCaptured: false,
        fingerprintThumb: '',
        fingerprintIndex: '',
        fingerprintMiddle: '',
        fingerprintRing: '',
        fingerprintPinky: '',
        fingerprintQuality: '',
        fingerprintCapturedAt: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: studentData.createdBy || 'system'
      }
    );

    return { success: true, data: student, matricNumber };
  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all students with optional filters
 */
export const getAllStudents = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.department) {
      queries.push(Query.equal('department', filters.department));
    }
    
    if (filters.level) {
      queries.push(Query.equal('level', filters.level));
    }
    
    if (filters.search) {
      queries.push(Query.search('matricNumber', filters.search));
    }

    const response = await databases.listDocuments(
      databaseId,
      studentsCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get student by matric number
 */

export const getStudentByMatricNumber = async (matricNumber) => {
  try {
    const response = await databases.listDocuments(
      databaseId,
      studentsCollectionId,
      [Query.equal('matricNumber', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    return { success: true, data: response.documents[0] };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student by document ID
 */
export const getStudentById = async (documentId) => {
  try {
    const student = await databases.getDocument(
      databaseId,
      studentsCollectionId,
      documentId
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update student information
 */
export const updateStudent = async (documentId, updates, newProfilePicture = null) => {
  try {
    let pictureData = null;

    // Handle profile picture update
    if (newProfilePicture) {
      const student = await getStudentById(documentId);
      
      // Delete old picture if exists
      if (student.success && student.data.profilePictureId) {
        await deleteProfilePicture(student.data.profilePictureId);
      }

      // Upload new picture
      pictureData = await uploadProfilePicture(newProfilePicture);
    }

    const updateData = { ...updates };
    if (pictureData) {
      updateData.profilePictureId = pictureData.fileId;
      updateData.profilePictureUrl = pictureData.fileUrl;
    }

    const student = await databases.updateDocument(
      databaseId,
      studentsCollectionId,
      documentId,
      updateData
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete student (soft delete)
 */
export const deleteStudent = async (documentId) => {
  try {
    // Soft delete - mark as inactive
    await databases.updateDocument(
      databaseId,
      studentsCollectionId,
      documentId,
      { isActive: false }
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Permanently delete student (hard delete)
 */
export const permanentlyDeleteStudent = async (documentId) => {
  try {
    const student = await getStudentById(documentId);
    
    // Delete profile picture from storage
    if (student.success && student.data.profilePictureId) {
      await deleteProfilePicture(student.data.profilePictureId);
    }

    // Delete document
    await databases.deleteDocument(
      databaseId,
      studentsCollectionId,
      documentId
    );

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting student:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// FINGERPRINT OPERATIONS
// ========================================

/**
 * Save fingerprints to student record
 */
export const saveFingerprints = async (documentId, fingerprintData) => {
  try {
    const student = await databases.updateDocument(
      databaseId,
      studentsCollectionId,
      documentId,
      {
        fingerprintThumb: fingerprintData.thumb || '',
        fingerprintIndex: fingerprintData.index || '',
        fingerprintMiddle: fingerprintData.middle || '',
        fingerprintRing: fingerprintData.ring || '',
        fingerprintPinky: fingerprintData.pinky || '',
        fingerprintQuality: JSON.stringify(fingerprintData.quality || {}),
        fingerprintCapturedAt: new Date().toISOString(),
        fingerprintsCaptured: true
      }
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error saving fingerprints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student fingerprints
 */
export const getFingerprints = async (documentId) => {
  try {
    const student = await databases.getDocument(
      databaseId,
      studentsCollectionId,
      documentId
    );

    if (!student.fingerprintsCaptured) {
      return { success: false, error: 'No fingerprints captured for this student' };
    }

    const fingerprints = {
      thumb: student.fingerprintThumb,
      index: student.fingerprintIndex,
      middle: student.fingerprintMiddle,
      ring: student.fingerprintRing,
      pinky: student.fingerprintPinky,
      quality: JSON.parse(student.fingerprintQuality || '{}'),
      capturedAt: student.fingerprintCapturedAt
    };

    return { success: true, data: fingerprints };
  } catch (error) {
    console.error('Error fetching fingerprints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify fingerprint against stored templates
 */
export const verifyFingerprint = async (capturedTemplate) => {
  try {
    // Get all students with fingerprints
    const response = await databases.listDocuments(
      databaseId,
      studentsCollectionId,
      [Query.equal('fingerprintsCaptured', true)]
    );

    // In production, use proper fingerprint matching algorithm
    // This is a simplified simulation
    for (const student of response.documents) {
      const fingerprints = [
        student.fingerprintThumb,
        student.fingerprintIndex,
        student.fingerprintMiddle,
        student.fingerprintRing,
        student.fingerprintPinky
      ];

      // Simulate matching (replace with actual fingerprint SDK)
      for (const storedTemplate of fingerprints) {
        if (storedTemplate && capturedTemplate === storedTemplate) {
          return { 
            success: true, 
            matched: true, 
            student: student,
            confidence: 95 
          };
        }
      }
    }

    return { success: true, matched: false };
  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// STATISTICS & REPORTS
// ========================================

/**
 * Get student statistics
 */

export const getStudentStats = async () => {
  try {
    const allStudents = await databases.listDocuments(
      databaseId,
      studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const verified = allStudents.documents.filter(s => s.fingerprintsCaptured).length;
    const pending = allStudents.total - verified;

    const byDepartment = {};
    const byLevel = {};

    allStudents.documents.forEach(student => {
      byDepartment[student.department] = (byDepartment[student.department] || 0) + 1;
      byLevel[student.level] = (byLevel[student.level] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: allStudents.total,
        verified,
        pending,
        byDepartment,
        byLevel
      }
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: error.message };
  }
};
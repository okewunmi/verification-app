// lib/appwrite.js
import {
  Account,
  Avatars,
  Client,
  Databases,
  Functions,
  ID,
  Query,
  Storage,
  Role,
  Permission
} from 'appwrite';
import bcrypt from 'bcryptjs';
// Use const instead of export const to avoid Next.js page config issues
const config = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.company.5-fingerprint",
  projectId: "68e83bca0016577d1322",
  databaseId: "68e84359003dccd0b700",
  usersCollectionId: "user",
  studentsCollectionId: "student",
  studentAuthCollectionId: "studentauth",
  bucketId: "68ecda1b0032528659b2",
coursesCollectionId: "courses",
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  usersCollectionId,
  studentsCollectionId,
  coursesCollectionId,
  bucketId,
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

    // Use Query.search or Query.contains instead of startsWith
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(100) // Limit to prevent timeout
      ]
    );

    // Filter manually to count students with matching prefix
    const matchingStudents = response.documents.filter(doc =>
      doc.matricNumber && doc.matricNumber.startsWith(currentYearPrefix)
    );

    const count = matchingStudents.length;
    const serialNumber = String(count + 1).padStart(7, '0');

    return `FTP/${deptCode}/${currentYear}/${serialNumber}`;
  } catch (error) {
    console.error('Error generating matric number:', error);
    console.error('Error details:', error.message, error.code);
    throw new Error(`Failed to generate matric number: ${error.message}`);
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
      config.bucketId,
      fileId,
      file,
      [
        Permission.read(Role.any()),  // Allow anyone to read
      ]
    );

    // Use getFileView instead of getFilePreview to avoid transformation restrictions
    const fileUrl = storage.getFileView(
      config.bucketId,
      response.$id
    );

    const finalUrl = fileUrl.href || fileUrl.toString();
    console.log('Uploaded file URL:', finalUrl);

    return {
      fileId: response.$id,
      fileUrl: finalUrl
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
    await storage.deleteFile(config.bucketId, fileId);
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

// export const createStudent = async (studentData, profilePictureFile = null) => {
//   try {
//     const matricNumber = await generateMatricNumber(studentData.course);

//     let pictureData = { fileId: null, fileUrl: null };
//     if (profilePictureFile) {
//       pictureData = await uploadProfilePicture(profilePictureFile);
//     }

//     const student = await databases.createDocument(
//       config.databaseId,
//       config.studentsCollectionId,
//       ID.unique(),
//       {
//         matricNumber,
//         surname: studentData.surname,
//         firstName: studentData.firstName,
//         middleName: studentData.middleName,
//         age: parseInt(studentData.age),
//         phoneNumber: studentData.phoneNumber,
//         email: studentData.email,
//         department: studentData.department,
//         course: studentData.course,
//         level: studentData.level,
//         // Only set profilePictureUrl if it exists, otherwise omit the field
//         ...(pictureData.fileUrl && { profilePictureUrl: pictureData.fileUrl }),
//         fingerprintsCaptured: false,
//         thumbTemplate: '',
//         indexTemplate: '',
//         middleTemplate: '',
//         ringTemplate: '',
//         pinkyTemplate: '',
//         fingerprintsCapturedAt: '',
//         isActive: true,
//       }
//     );

//     return { success: true, data: student, matricNumber };
//   } catch (error) {
//     console.error('Error creating student:', error);
//     return { success: false, error: error.message };
//   }
// };
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      {
        thumbTemplate: fingerprintData.thumb || '',
        indexTemplate: fingerprintData.index || '',
        middleTemplate: fingerprintData.middle || '',
        ringTemplate: fingerprintData.ring || '',
        pinkyTemplate: fingerprintData.pinky || '',
        // fingerprintQuality: JSON.stringify(fingerprintData.quality || {}),
        fingerprintsCapturedAt: new Date().toISOString(),
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
      config.databaseId,
      config.studentsCollectionId,
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
      capturedAt: student.fingerprintsCapturedAt
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
      config.databaseId,
      config.studentsCollectionId,
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
      config.databaseId,
      config.studentsCollectionId,
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


// ========================================
// STUDENT AUTHENTICATION FUNCTIONS
// ========================================

/**
 * Create student auth credentials
 * Username: Matric Number
 * Password: Surname (hashed for security)
 */
export const createStudentAuthCredentials = async (matricNumber, surname, studentDocId) => {
  try {
    // Hash the password (surname) for security
    const hashedPassword = await hashPassword(surname);

    const authCredentials = await databases.createDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      ID.unique(),
      {
        username: matricNumber, // Matric number as username
        password: hashedPassword, // Hashed surname as password
        studentDocId: studentDocId, // Link to student record
        lastLogin: '',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    );

    return { success: true, data: authCredentials };
  } catch (error) {
    console.error('Error creating student auth:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simple password hashing function
 * In production, use bcrypt or similar library
 */

export const hashPassword = async (password) => {
  return await bcrypt.hash(password.toLowerCase(), 10);
};

export const verifyPassword = async (inputPassword, hashedPassword) => {
  return await bcrypt.compare(inputPassword.toLowerCase(), hashedPassword);
};


/**
 * Student Login Function
 */
export const studentLogin = async (matricNumber, password) => {
  try {
    // Find student auth by username (matric number)
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [
        Query.equal('username', matricNumber),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    const authRecord = response.documents[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, authRecord.password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    // Get full student details
    const studentResult = await getStudentById(authRecord.studentDocId);

    if (!studentResult.success) {
      return {
        success: false,
        error: 'Student record not found'
      };
    }

    // Update last login time
    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { lastLogin: new Date().toISOString() }
    );

    return {
      success: true,
      user: studentResult.data,
      authId: authRecord.$id,
      message: 'Login successful'
    };

  } catch (error) {
    console.error('Error during student login:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
};

/**
 * Change student password
 */
export const changeStudentPassword = async (matricNumber, oldPassword, newPassword) => {
  try {
    // Verify old password first
    const loginResult = await studentLogin(matricNumber, oldPassword);

    if (!loginResult.success) {
      return {
        success: false,
        error: 'Current password is incorrect'
      };
    }

    // Get auth record
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [Query.equal('username', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Account not found' };
    }

    const authRecord = response.documents[0];
    const newHashedPassword = await hashPassword(newPassword);

    // Update password
    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { password: newHashedPassword }
    );

    return {
      success: true,
      message: 'Password changed successfully'
    };

  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset student password (Admin only)
 */
export const resetStudentPassword = async (matricNumber) => {
  try {
    // Get student by matric number
    const studentResult = await getStudentByMatricNumber(matricNumber);

    if (!studentResult.success) {
      return { success: false, error: 'Student not found' };
    }

    const student = studentResult.data;

    // Reset password to surname
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [Query.equal('username', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Auth record not found' };
    }

    const authRecord = response.documents[0];
    const resetPassword = await hashPassword(student.surname);

    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { password: resetPassword }
    );

    return {
      success: true,
      message: 'Password reset to surname successfully',
      defaultPassword: student.surname
    };

  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// UPDATED CREATE STUDENT FUNCTION
// ========================================

/**
 * Create new student WITH authentication credentials
 */
export const createStudent = async (studentData, profilePictureFile = null) => {
  try {
    const matricNumber = await generateMatricNumber(studentData.course);

    let pictureData = { fileId: null, fileUrl: null };
    if (profilePictureFile) {
      pictureData = await uploadProfilePicture(profilePictureFile);
    }

    // Create student record
    const student = await databases.createDocument(
      config.databaseId,
      config.studentsCollectionId,
      ID.unique(),
      {
        matricNumber,
        surname: studentData.surname,
        firstName: studentData.firstName,
        middleName: studentData.middleName,
        age: parseInt(studentData.age),
        phoneNumber: studentData.phoneNumber,
        email: studentData.email,
        department: studentData.department,
        course: studentData.course,
        level: studentData.level,
        ...(pictureData.fileUrl && { profilePictureUrl: pictureData.fileUrl }),
        fingerprintsCaptured: false,
        thumbTemplate: '',
        indexTemplate: '',
        middleTemplate: '',
        ringTemplate: '',
        pinkyTemplate: '',
        fingerprintsCapturedAt: '',
        isActive: true,
      }
    );

    // Create authentication credentials automatically
    const authResult = await createStudentAuthCredentials(
      matricNumber,
      studentData.surname,
      student.$id
    );

    if (!authResult.success) {
      // Rollback: Delete student record if auth creation fails
      await databases.deleteDocument(
        config.databaseId,
        config.studentsCollectionId,
        student.$id
      );

      return {
        success: false,
        error: 'Failed to create login credentials'
      };
    }

    return {
      success: true,
      data: student,
      matricNumber,
      credentials: {
        username: matricNumber,
        defaultPassword: studentData.surname,
        message: 'Login credentials created. Username: Matric Number, Password: Surname'
      }
    };

  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// COURSE MANAGEMENT FUNCTIONS
// ========================================

/**
 * Create single course
 */
export const createCourse = async (courseData) => {
  try {
    const course = await databases.createDocument(
      config.databaseId,
      config.coursesCollectionId,
      ID.unique(),
      {
        courseCode: courseData.courseCode.toUpperCase(),
        courseTitle: courseData.courseTitle,
        courseUnit: parseInt(courseData.courseUnit),
        semester: courseData.semester,
        level: courseData.level,
        department: courseData.department,
        description: courseData.description || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: courseData.createdBy || 'admin'
      }
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error creating course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create multiple courses (bulk insert)
 */
export const createMultipleCourses = async (coursesArray) => {
  try {
    const results = [];
    const errors = [];

    for (const courseData of coursesArray) {
      const result = await createCourse(courseData);
      
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          course: courseData.courseCode,
          error: result.error
        });
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors: errors,
      message: `${results.length} courses created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  } catch (error) {
    console.error('Error creating multiple courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all courses with optional filters
 */
export const getAllCourses = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.department) {
      queries.push(Query.equal('department', filters.department));
    }
    
    if (filters.level) {
      queries.push(Query.equal('level', filters.level));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.search) {
      // Search in course code or title
      queries.push(Query.search('courseCode', filters.search));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get course by ID
 */
export const getCourseById = async (documentId) => {
  try {
    const course = await databases.getDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get course by course code
 */
export const getCourseByCourseCode = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('courseCode', courseCode.toUpperCase())]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    return { success: true, data: response.documents[0] };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update course
 */
export const updateCourse = async (documentId, updates) => {
  try {
    const course = await databases.updateDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId,
      updates
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error updating course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete course (soft delete)
 */
export const deleteCourse = async (documentId) => {
  try {
    await databases.updateDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId,
      { isActive: false }
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Permanently delete course (hard delete)
 */
export const permanentlyDeleteCourse = async (documentId) => {
  try {
    await databases.deleteDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId
    );

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get courses by student level and department
 */
export const getCoursesByLevelAndDepartment = async (level, department) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [
        Query.equal('level', level),
        Query.equal('department', department),
        Query.equal('isActive', true),
        Query.orderAsc('courseCode')
      ]
    );

    return { success: true, data: response.documents };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get course statistics
 */
export const getCourseStats = async () => {
  try {
    const allCourses = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('isActive', true)]
    );

    const byDepartment = {};
    const byLevel = {};
    const bySemester = {};

    allCourses.documents.forEach(course => {
      byDepartment[course.department] = (byDepartment[course.department] || 0) + 1;
      byLevel[course.level] = (byLevel[course.level] || 0) + 1;
      bySemester[course.semester] = (bySemester[course.semester] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: allCourses.total,
        byDepartment,
        byLevel,
        bySemester
      }
    };
  } catch (error) {
    console.error('Error fetching course stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if course code exists
 */
export const courseCodeExists = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('courseCode', courseCode.toUpperCase())]
    );

    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking course code:', error);
    return false;
  }
};


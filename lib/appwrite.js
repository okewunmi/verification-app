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
  platform: "5-fingerprint",
  projectId: "68e83bca0016577d1322",
  databaseId: "68e84359003dccd0b700",
  usersCollectionId: "user",
  studentsCollectionId: "student",
  studentAuthCollectionId: "studentauth",
  bucketId: "68ecda1b0032528659b2",
  coursesCollectionId: "courses",
  courseRegistrationCollectionId: "courseregistration",
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
  courseRegistrationCollectionId
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


/**
 * Simple password hashing function with better error handling
 */
export const hashPassword = async (password) => {
  try {
    // Trim and convert to lowercase for consistency
    const cleanPassword = password.trim().toLowerCase();
    return await bcrypt.hash(cleanPassword, 10);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

export const verifyPassword = async (inputPassword, hashedPassword) => {
  try {
    // Trim and convert to lowercase for consistency
    const cleanPassword = inputPassword.trim().toLowerCase();
    return await bcrypt.compare(cleanPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Create student auth credentials with better error handling
 */
export const createStudentAuthCredentials = async (matricNumber, surname, studentDocId) => {
  try {
    // Trim matric number and surname
    const cleanMatricNumber = matricNumber.trim();
    const cleanSurname = surname.trim();

    console.log('Creating auth for:', { matricNumber: cleanMatricNumber, surname: cleanSurname });

    // Hash the password (surname) for security
    const hashedPassword = await hashPassword(cleanSurname);

    const authCredentials = await databases.createDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      ID.unique(),
      {
        username: cleanMatricNumber,
        password: hashedPassword,
        studentDocId: studentDocId,
        lastLogin: '',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    );

    console.log('Auth credentials created successfully');
    return { success: true, data: authCredentials };
  } catch (error) {
    console.error('Error creating student auth:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Student Login Function with better debugging
 */
export const studentLogin = async (matricNumber, password) => {
  try {
    // Clean inputs
    const cleanMatricNumber = matricNumber.trim();
    const cleanPassword = password.trim();

    console.log('Login attempt for:', cleanMatricNumber);

    // Find student auth by username (matric number)
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [
        Query.equal('username', cleanMatricNumber),
        Query.equal('isActive', true)
      ]
    );

    console.log('Auth records found:', response.documents.length);

    if (response.documents.length === 0) {
      console.log('No auth record found for:', cleanMatricNumber);
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    const authRecord = response.documents[0];
    console.log('Auth record found, verifying password...');

    // Verify password
    const isPasswordValid = await verifyPassword(cleanPassword, authRecord.password);

    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Password verification failed');
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    // Get full student details
    const studentResult = await getStudentById(authRecord.studentDocId);

    if (!studentResult.success) {
      console.log('Student record not found for ID:', authRecord.studentDocId);
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

    console.log('Login successful for:', cleanMatricNumber);

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

// ========================================
// DASHBOARD STATISTICS FUNCTIONS
// ========================================

/**
 * Get comprehensive dashboard statistics (UPDATED)
 */

export const getDashboardStats = async () => {
  try {
    // Get total students
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    // Get verified students (with fingerprints captured)
    const verifiedStudents = studentsResponse.documents.filter(
      student => student.fingerprintsCaptured === true
    );

    // Get active courses
    const coursesResponse = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('isActive', true)]
    );

    // Get pending course registrations
    const pendingRegistrations = await getPendingRegistrationsCount();

    return {
      success: true,
      data: {
        totalStudents: studentsResponse.total,
        activeCourses: coursesResponse.total,
        verifiedStudents: verifiedStudents.length,
        pendingRegistrations: pendingRegistrations.count
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        totalStudents: 0,
        activeCourses: 0,
        verifiedStudents: 0,
        pendingRegistrations: 0
      }
    };
  }
};
/**
 * Get recent activity from the database
 */

export const getRecentActivity = async (limit = 10) => {
  try {
    const activities = [];

    // Get recent students (created in last 24 hours or most recent)
    const recentStudents = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    // Add student creation activities
    recentStudents.documents.forEach(student => {
      activities.push({
        type: 'student_created',
        action: 'New student profile created',
        student: `${student.firstName} ${student.surname}`,
        time: formatTimeAgo(student.$createdAt),
        activityType: 'success',
        timestamp: new Date(student.$createdAt).getTime()
      });
    });

    // Get students who recently captured fingerprints
    const recentFingerprints = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.orderDesc('fingerprintsCapturedAt'),
        Query.limit(5)
      ]
    );

    recentFingerprints.documents.forEach(student => {
      if (student.fingerprintsCapturedAt) {
        activities.push({
          type: 'fingerprint_captured',
          action: 'Student fingerprints captured',
          student: `${student.firstName} ${student.surname}`,
          time: formatTimeAgo(student.fingerprintsCapturedAt),
          activityType: 'info',
          timestamp: new Date(student.fingerprintsCapturedAt).getTime()
        });
      }
    });

    // Get recent course registrations
    const recentRegistrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    recentRegistrations.documents.forEach(registration => {
      activities.push({
        type: 'course_registered',
        action: `Course registered: ${registration.courseCode}`,
        student: registration.matricNumber,
        time: formatTimeAgo(registration.registeredAt),
        activityType: 'info',
        timestamp: new Date(registration.registeredAt).getTime()
      });
    });

    // Get recent courses
    const recentCourses = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    recentCourses.documents.forEach(course => {
      activities.push({
        type: 'course_uploaded',
        action: `Course uploaded: ${course.courseCode}`,
        time: formatTimeAgo(course.$createdAt),
        activityType: 'success',
        timestamp: new Date(course.$createdAt).getTime()
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Return only the requested number of activities
    return {
      success: true,
      data: activities.slice(0, limit)
    };

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return { 
      success: false, 
      error: error.message,
      data: []
    };
  }
};
/**
 * Helper function to format time ago
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Get department-wise student count
 */
export const getDepartmentStats = async () => {
  try {
    const students = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const departmentCount = {};
    students.documents.forEach(student => {
      const dept = student.department || 'Unassigned';
      departmentCount[dept] = (departmentCount[dept] || 0) + 1;
    });

    return {
      success: true,
      data: departmentCount
    };
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Get level-wise student count
 */
export const getLevelStats = async () => {
  try {
    const students = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const levelCount = {};
    students.documents.forEach(student => {
      const level = student.level || 'Unassigned';
      levelCount[level] = (levelCount[level] || 0) + 1;
    });

    return {
      success: true,
      data: levelCount
    };
  } catch (error) {
    console.error('Error fetching level stats:', error);
    return { success: false, error: error.message, data: {} };
  }
};

// ========================================
// STUDENT DASHBOARD FUNCTIONS
// ========================================

/**
 * Get student courses by level and department
 * Fetches available courses for course registration
 */
export const getAvailableCoursesForStudent = async (level, department) => {
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

    return { 
      success: true, 
      data: response.documents 
    };
  } catch (error) {
    console.error('Error fetching available courses:', error);
    return { 
      success: false, 
      error: error.message, 
      data: [] 
    };
  }
};

/**
 * Get student by their authentication credentials
 */
export const getStudentByAuth = async (matricNumber) => {
  try {
    const studentResult = await getStudentByMatricNumber(matricNumber);
    
    if (!studentResult.success) {
      return { success: false, error: 'Student not found' };
    }

    return { success: true, data: studentResult.data };
  } catch (error) {
    console.error('Error fetching student by auth:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// COURSE REGISTRATION FUNCTIONS
// ========================================

/**
 * Create course registration collection document (FIXED - Proper batch handling)
 */

// export const registerStudentCourses = async (studentId, matricNumber, courses, academicYear, semester) => {
//   const registrations = [];
//   const errors = [];
//   const skipped = [];

//   // Process each course individually
//   for (let i = 0; i < courses.length; i++) {
//     const course = courses[i];
//     const courseNum = `[${i + 1}/${courses.length}]`;
    
//     console.log(`${courseNum} Processing: ${course.courseCode}...`);

//     try {
//       // FIRST: Check if already registered (to avoid unique constraint error)
//       const existingCheck = await databases.listDocuments(
//         config.databaseId,
//         config.courseRegistrationCollectionId,
//         [
//           Query.equal('matricNumber', matricNumber),
//           Query.equal('courseCode', course.courseCode),
//           Query.equal('isActive', true),
//           Query.limit(1)
//         ]
//       );

//       if (existingCheck.documents.length > 0) {
//         console.log(`  ⏭️  SKIPPED: Already registered`);
//         skipped.push({
//           course: course.courseCode,
//           reason: 'Already registered'
//         });
//         continue;
//       }

//       // If not registered, proceed with registration
//       console.log(`  📝 Creating registration...`);
      
//       const registration = await databases.createDocument(
//         config.databaseId,
//         config.courseRegistrationCollectionId,
//         ID.unique(), // Simple unique ID
//         {
//           studentId: studentId,
//           matricNumber: matricNumber,
//           courseId: course.$id,
//           courseCode: course.courseCode,
//           courseTitle: course.courseTitle,
//           courseUnit: parseInt(course.courseUnit),
//           semester: course.semester || semester,
//           status: 'Pending',
//           registeredAt: new Date().toISOString(),
//           approvedAt: '',
//           approvedBy: '',
//           isActive: true
//         }
//       );

//       registrations.push(registration);
//       console.log(`  ✅ SUCCESS: ${course.courseCode} registered\n`);

//     } catch (error) {
//       console.error(`  ❌ ERROR: ${error.message}`);

//       // Handle duplicate/unique constraint errors gracefully
//       const errorMsg = error.message?.toLowerCase() || '';
//       if (
//         errorMsg.includes('already exists') ||
//         errorMsg.includes('duplicate') ||
//         errorMsg.includes('unique') ||
//         error.code === 409
//       ) {
//         console.log(`  ⏭️  SKIPPED: Duplicate detected\n`);
//         skipped.push({
//           course: course.courseCode,
//           reason: 'Duplicate entry'
//         });
//       } else {
//         console.log(`  💥 FAILED: ${error.message}\n`);
//         errors.push({
//           course: course.courseCode,
//           error: error.message
//         });
//       }
//     }

//     // Small delay between registrations (prevent rate limiting)
//     if (i < courses.length - 1) {
//       await new Promise(resolve => setTimeout(resolve, 250));
//     }
//   }


//   // Build success message
//   const messageParts = [];
//   if (registrations.length > 0) messageParts.push(`${registrations.length} course(s) registered`);
//   if (skipped.length > 0) messageParts.push(`${skipped.length} already registered`);
//   if (errors.length > 0) messageParts.push(`${errors.length} failed`);

//   const finalMessage = messageParts.length > 0 
//     ? messageParts.join(', ')
//     : 'No courses processed';

//   // Determine success
//   const isSuccess = registrations.length > 0 || (skipped.length > 0 && errors.length === 0);

//   return {
//     success: isSuccess,
//     data: registrations,
//     errors: errors,
//     skipped: skipped,
//     message: finalMessage,
//     totalProcessed: courses.length
//   };
// };

/**
 * Get student's registered courses
 */
export const getStudentRegisteredCourses = async (matricNumber, semester = null) => {
  try {
    const queries = [
      Query.equal('matricNumber', matricNumber),
      Query.equal('isActive', true),
      Query.orderDesc('$createdAt')
    ];

    if (semester) {
      queries.push(Query.equal('semester', semester));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    return { 
      success: true, 
      data: response.documents,
      total: response.total 
    };
  } catch (error) {
    console.error('Error fetching registered courses:', error);
    return { 
      success: false, 
      error: error.message, 
      data: [] 
    };
  }
};


/**
 * Drop/Delete a course registration
 */
export const dropCourseRegistration = async (registrationId) => {
  try {
    // Check if registration is still pending
    const registration = await databases.getDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId
    );

    if (registration.status !== 'Pending') {
      return { 
        success: false, 
        error: 'Cannot drop approved courses. Contact administrator.' 
      };
    }

    // Soft delete
    await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      { isActive: false }
    );

    return { success: true, message: 'Course dropped successfully' };
  } catch (error) {
    console.error('Error dropping course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if course is already registered by student
 */
export const isCourseRegistered = async (matricNumber, courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true)
      ]
    );

    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking course registration:', error);
    return false;
  }
};

/**
 * Get student registration statistics
 */
export const getStudentRegistrationStats = async (matricNumber) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('isActive', true)
      ]
    );

    const totalRegistered = response.documents.length;
    const approved = response.documents.filter(r => r.status === 'Approved').length;
    const pending = response.documents.filter(r => r.status === 'Pending').length;
    const totalUnits = response.documents.reduce((sum, r) => sum + r.courseUnit, 0);

    return {
      success: true,
      data: {
        totalRegistered,
        approved,
        pending,
        totalUnits
      }
    };
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        totalRegistered: 0,
        approved: 0,
        pending: 0,
        totalUnits: 0
      }
    };
  }
};

/**
 * Register student courses - FIXED for many-to-many relationship
 * Multiple students can register the same course
 */
// ========================================
// FIXED COURSE REGISTRATION FUNCTIONS
// Many-to-Many: Multiple students can register same courses
// ========================================

/**
 * Register student courses - FIXED for proper many-to-many relationship
 * Multiple students can register the same course independently
 */
export const registerStudentCourses = async (studentId, matricNumber, courses, academicYear, semester) => {
  const registrations = [];
  const errors = [];
  const skipped = [];

  console.log(`\n📚 Starting course registration for ${matricNumber}`);
  console.log(`📋 Total courses to register: ${courses.length}\n`);

  // Process each course individually with proper error handling
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const courseNum = `[${i + 1}/${courses.length}]`;
    
    console.log(`${courseNum} Processing: ${course.courseCode}...`);

    try {
      // IMPORTANT: Check if THIS SPECIFIC STUDENT already registered THIS COURSE
      // This prevents duplicate registrations by the SAME student
      const existingCheck = await databases.listDocuments(
        config.databaseId,
        config.courseRegistrationCollectionId,
        [
          Query.equal('studentId', studentId),
          Query.equal('courseCode', course.courseCode),
          Query.equal('isActive', true),
          Query.limit(1)
        ]
      );

      if (existingCheck.documents.length > 0) {
        console.log(`  ⏭️  SKIPPED: Student already registered for ${course.courseCode}`);
        skipped.push({
          course: course.courseCode,
          reason: 'Already registered by this student'
        });
        continue;
      }

      // Create registration with completely unique document ID
      console.log(`  📝 Creating registration for ${matricNumber}...`);
      
      // Generate a more unique ID using timestamp + random string
      const uniqueDocId = `${studentId}_${course.$id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const registration = await databases.createDocument(
        config.databaseId,
        config.courseRegistrationCollectionId,
        uniqueDocId, // Use our custom unique ID instead of ID.unique()
        {
          studentId: studentId,
          matricNumber: matricNumber,
          courseId: course.$id,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          courseUnit: parseInt(course.courseUnit),
          semester: course.semester || semester,
          status: 'Pending',
          registeredAt: new Date().toISOString(),
          approvedAt: '',
          approvedBy: '',
          isActive: true
        }
      );

      registrations.push(registration);
      console.log(`  ✅ SUCCESS: ${course.courseCode} registered for ${matricNumber}\n`);

    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}`);

      const errorMsg = error.message?.toLowerCase() || '';
      
      // Handle duplicate errors gracefully
      if (
        errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('unique') ||
        error.code === 409
      ) {
        console.log(`  ⏭️  SKIPPED: Duplicate detected\n`);
        skipped.push({
          course: course.courseCode,
          reason: 'Duplicate entry detected'
        });
      } else {
        console.log(`  💥 FAILED: ${error.message}\n`);
        errors.push({
          course: course.courseCode,
          error: error.message
        });
      }
    }

    // Small delay to prevent rate limiting
    if (i < courses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Build summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 REGISTRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully registered: ${registrations.length}`);
  console.log(`⏭️  Already registered: ${skipped.length}`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log('='.repeat(50) + '\n');

  // Build success message
  const messageParts = [];
  if (registrations.length > 0) messageParts.push(`${registrations.length} course(s) registered`);
  if (skipped.length > 0) messageParts.push(`${skipped.length} already registered`);
  if (errors.length > 0) messageParts.push(`${errors.length} failed`);

  const finalMessage = messageParts.length > 0 
    ? messageParts.join(', ')
    : 'No courses processed';

  // Determine success
  const isSuccess = registrations.length > 0 || (skipped.length > 0 && errors.length === 0);

  return {
    success: isSuccess,
    data: registrations,
    errors: errors,
    skipped: skipped,
    message: finalMessage,
    totalProcessed: courses.length,
    summary: {
      registered: registrations.length,
      alreadyRegistered: skipped.length,
      failed: errors.length
    }
  };
};

/**
 * Check if a specific student has already registered a course
 * Prevents duplicate registrations by the same student
 */
export const isStudentCourseRegistered = async (studentId, courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('studentId', studentId),
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    return {
      isRegistered: response.documents.length > 0,
      registration: response.documents[0] || null
    };
  } catch (error) {
    console.error('Error checking registration:', error);
    return { isRegistered: false, registration: null };
  }
};

/**
 * Get all students who registered a specific course
 * Shows the many-to-many relationship in action
 */
export const getStudentsRegisteredForCourse = async (courseCode, filters = {}) => {
  try {
    const queries = [
      Query.equal('courseCode', courseCode),
      Query.equal('isActive', true)
    ];

    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }

    queries.push(Query.orderDesc('registeredAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    // Fetch full student details for each registration
    const studentsWithDetails = await Promise.all(
      response.documents.map(async (reg) => {
        const studentResult = await getStudentByMatricNumber(reg.matricNumber);
        return {
          ...reg,
          studentDetails: studentResult.success ? studentResult.data : null
        };
      })
    );

    return {
      success: true,
      data: studentsWithDetails,
      total: response.total,
      course: courseCode
    };
  } catch (error) {
    console.error('Error fetching students for course:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get course registration statistics per course
 * Shows how many students registered for each course
 */
export const getCourseRegistrationStatsByCourse = async (courseCode) => {
  try {
    const allRegistrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true)
      ]
    );

    const total = allRegistrations.total;
    const approved = allRegistrations.documents.filter(r => r.status === 'Approved').length;
    const pending = allRegistrations.documents.filter(r => r.status === 'Pending').length;
    const rejected = allRegistrations.documents.filter(r => r.status === 'Rejected').length;

    // Get unique students (should match total if no duplicates)
    const uniqueStudents = [...new Set(allRegistrations.documents.map(r => r.matricNumber))];

    return {
      success: true,
      data: {
        courseCode,
        totalRegistrations: total,
        uniqueStudents: uniqueStudents.length,
        approved,
        pending,
        rejected,
        students: uniqueStudents
      }
    };
  } catch (error) {
    console.error('Error fetching course stats:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * Validate course registration before processing
 * Checks unit limits and duplicate registrations
 */
export const validateCourseRegistration = async (studentId, matricNumber, courses, maxUnits = 24) => {
  const validationErrors = [];
  const validCourses = [];

  // Check current registered units
  const currentStats = await getStudentRegistrationStats(matricNumber);
  let currentUnits = currentStats.success ? currentStats.data.totalUnits : 0;

  for (const course of courses) {
    // Check if already registered by this student
    const checkResult = await isStudentCourseRegistered(studentId, course.courseCode);
    
    if (checkResult.isRegistered) {
      validationErrors.push({
        courseCode: course.courseCode,
        error: 'Already registered'
      });
      continue;
    }

    // Check unit limit
    const newTotal = currentUnits + course.courseUnit;
    if (newTotal > maxUnits) {
      validationErrors.push({
        courseCode: course.courseCode,
        error: `Would exceed unit limit (${newTotal}/${maxUnits} units)`
      });
      continue;
    }

    // Course is valid
    validCourses.push(course);
    currentUnits += course.courseUnit;
  }

  return {
    isValid: validCourses.length > 0,
    validCourses,
    errors: validationErrors,
    totalUnitsAfterRegistration: currentUnits
  };
};

/**
 * Batch check if courses are already registered by student
 * More efficient than checking one by one
 */
export const checkMultipleCoursesRegistration = async (studentId, courseCodes) => {
  try {
    const results = {};
    
    // Get all registrations for this student
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('studentId', studentId),
        Query.equal('isActive', true)
      ]
    );

    // Create a Set of registered course codes for fast lookup
    const registeredCourses = new Set(
      response.documents.map(reg => reg.courseCode)
    );

    // Check each course
    courseCodes.forEach(courseCode => {
      results[courseCode] = registeredCourses.has(courseCode);
    });

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error checking multiple courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all course registrations grouped by course
 * Useful for admin to see which courses are popular
 */
export const getAllCoursesWithRegistrationCount = async () => {
  try {
    // Get all active courses
    const coursesResult = await getAllCourses();
    
    if (!coursesResult.success) {
      return { success: false, error: 'Failed to fetch courses' };
    }

    // Get registration counts for each course
    const coursesWithCounts = await Promise.all(
      coursesResult.data.map(async (course) => {
        const stats = await getCourseRegistrationStatsByCourse(course.courseCode);
        
        return {
          ...course,
          registrationStats: stats.success ? stats.data : {
            totalRegistrations: 0,
            uniqueStudents: 0,
            approved: 0,
            pending: 0,
            rejected: 0
          }
        };
      })
    );

    return {
      success: true,
      data: coursesWithCounts,
      total: coursesWithCounts.length
    };
  } catch (error) {
    console.error('Error fetching courses with counts:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ========================================
// ADMIN - COURSE REGISTRATION MANAGEMENT
// ========================================

/**
 * Get all course registrations (for admin)
 */
export const getAllCourseRegistrations = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.matricNumber) {
      queries.push(Query.equal('matricNumber', filters.matricNumber));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get pending course registrations count
 */
export const getPendingRegistrationsCount = async () => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    return { success: true, count: response.total };
  } catch (error) {
    console.error('Error fetching pending count:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Approve course registration
 */
export const approveCourseRegistration = async (registrationId, adminId = 'admin') => {
  try {
    const registration = await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      {
        status: 'Approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId
      }
    );

    return { success: true, data: registration };
  } catch (error) {
    console.error('Error approving registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reject course registration
 */
export const rejectCourseRegistration = async (registrationId, adminId = 'admin') => {
  try {
    const registration = await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      {
        status: 'Rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId
      }
    );

    return { success: true, data: registration };
  } catch (error) {
    console.error('Error rejecting registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get course registration statistics for admin
 */
export const getCourseRegistrationStats = async () => {
  try {
    const allRegistrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [Query.equal('isActive', true)]
    );

    const pending = allRegistrations.documents.filter(r => r.status === 'Pending').length;
    const approved = allRegistrations.documents.filter(r => r.status === 'Approved').length;
    const rejected = allRegistrations.documents.filter(r => r.status === 'Rejected').length;

    return {
      success: true,
      data: {
        total: allRegistrations.total,
        pending,
        approved,
        rejected
      }
    };
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    };
  }
};


/**
 * Get all course registrations with student details (ENHANCED)
 */
export const getAllCourseRegistrationsWithStudents = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.matricNumber) {
      queries.push(Query.equal('matricNumber', filters.matricNumber));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    // Fetch student details for each unique matric number
    const uniqueMatricNumbers = [...new Set(response.documents.map(r => r.matricNumber))];
    const studentDetailsMap = {};

    for (const matricNumber of uniqueMatricNumbers) {
      const studentResult = await getStudentByMatricNumber(matricNumber);
      if (studentResult.success) {
        studentDetailsMap[matricNumber] = studentResult.data;
      }
    }

    // Enhance registrations with student details
    const enhancedRegistrations = response.documents.map(reg => ({
      ...reg,
      studentDetails: studentDetailsMap[reg.matricNumber] || null
    }));

    return { 
      success: true, 
      data: enhancedRegistrations, 
      total: response.total,
      studentDetailsMap: studentDetailsMap
    };
  } catch (error) {
    console.error('Error fetching registrations with students:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get registrations grouped by student
 */
export const getRegistrationsGroupedByStudent = async (filters = {}) => {
  try {
    const result = await getAllCourseRegistrations(filters);
    
    if (!result.success) {
      return result;
    }

    // Group registrations by matric number
    const grouped = result.data.reduce((acc, reg) => {
      if (!acc[reg.matricNumber]) {
        acc[reg.matricNumber] = {
          matricNumber: reg.matricNumber,
          registrations: [],
          totalCourses: 0,
          totalUnits: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        };
      }
      
      acc[reg.matricNumber].registrations.push(reg);
      acc[reg.matricNumber].totalCourses++;
      acc[reg.matricNumber].totalUnits += reg.courseUnit;
      
      if (reg.status === 'Pending') acc[reg.matricNumber].pendingCount++;
      if (reg.status === 'Approved') acc[reg.matricNumber].approvedCount++;
      if (reg.status === 'Rejected') acc[reg.matricNumber].rejectedCount++;
      
      return acc;
    }, {});

    return {
      success: true,
      data: grouped,
      totalStudents: Object.keys(grouped).length
    };
  } catch (error) {
    console.error('Error grouping registrations:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Bulk approve all pending registrations for a student
 */
export const bulkApproveCourses = async (matricNumber, adminId = 'admin') => {
  try {
    // Get all pending registrations for the student
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return { 
        success: false, 
        error: 'No pending registrations found' 
      };
    }

    const approvedCount = [];
    const errors = [];

    for (const registration of response.documents) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.courseRegistrationCollectionId,
          registration.$id,
          {
            status: 'Approved',
            approvedAt: new Date().toISOString(),
            approvedBy: adminId
          }
        );
        approvedCount.push(registration);
      } catch (error) {
        errors.push({
          courseCode: registration.courseCode,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      approvedCount: approvedCount.length,
      totalPending: response.documents.length,
      errors: errors,
      message: `${approvedCount.length} of ${response.documents.length} courses approved`
    };
  } catch (error) {
    console.error('Error bulk approving courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk reject all pending registrations for a student
 */
export const bulkRejectCourses = async (matricNumber, adminId = 'admin') => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return { 
        success: false, 
        error: 'No pending registrations found' 
      };
    }

    const rejectedCount = [];
    const errors = [];

    for (const registration of response.documents) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.courseRegistrationCollectionId,
          registration.$id,
          {
            status: 'Rejected',
            approvedAt: new Date().toISOString(),
            approvedBy: adminId
          }
        );
        rejectedCount.push(registration);
      } catch (error) {
        errors.push({
          courseCode: registration.courseCode,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      rejectedCount: rejectedCount.length,
      totalPending: response.documents.length,
      errors: errors,
      message: `${rejectedCount.length} of ${response.documents.length} courses rejected`
    };
  } catch (error) {
    console.error('Error bulk rejecting courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get registrations filtered by level and department
 */
export const getRegistrationsByLevelAndDepartment = async (level, department) => {
  try {
    // First get all active students from that level and department
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('level', level),
        Query.equal('department', department),
        Query.equal('isActive', true)
      ]
    );

    if (studentsResponse.documents.length === 0) {
      return { success: true, data: [], total: 0 };
    }

    // Get matric numbers
    const matricNumbers = studentsResponse.documents.map(s => s.matricNumber);

    // Get all registrations for these students
    const allRegistrations = [];
    
    for (const matricNumber of matricNumbers) {
      const regResponse = await databases.listDocuments(
        config.databaseId,
        config.courseRegistrationCollectionId,
        [
          Query.equal('matricNumber', matricNumber),
          Query.equal('isActive', true)
        ]
      );
      
      allRegistrations.push(...regResponse.documents);
    }

    return {
      success: true,
      data: allRegistrations,
      total: allRegistrations.length
    };
  } catch (error) {
    console.error('Error fetching registrations by level/department:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Export registrations to CSV format (returns data array)
 */

export const exportRegistrationsData = async (filters = {}) => {
  try {
    const result = await getAllCourseRegistrations(filters);
    
    if (!result.success) {
      return result;
    }

    const csvData = result.data.map(reg => ({
      'Matric Number': reg.matricNumber,
      'Course Code': reg.courseCode,
      'Course Title': reg.courseTitle,
      'Units': reg.courseUnit,
      'Semester': reg.semester,
      'Status': reg.status,
      'Registered Date': new Date(reg.registeredAt).toLocaleDateString(),
      'Approved Date': reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString() : 'N/A',
      'Approved By': reg.approvedBy || 'N/A'
    }));

    return {
      success: true,
      data: csvData
    };
  } catch (error) {
    console.error('Error exporting registrations:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// FACIAL RECOGNITION FUNCTIONS
// ========================================

/**
 * Save facial template to student record
 */
export const saveFaceTemplate = async (documentId, faceImageUrl, faceTemplateData = null) => {
  try {
    const updateData = {
      faceImageUrl: faceImageUrl,
      faceCaptured: true,
      faceCapturedAt: new Date().toISOString()
    };

    // If you have face template/embedding data from your Python service
    if (faceTemplateData) {
      updateData.faceTemplate = JSON.stringify(faceTemplateData);
    }

    const student = await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      updateData
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error saving face template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify face against stored images using facial recognition API
 */
export const verifyFaceRecognition = async (capturedImageFile) => {
  try {
    console.log('🔍 Starting face verification...');

    // Get all students with face images captured
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('faceCaptured', true),
        Query.equal('isActive', true)
      ]
    );

    console.log(`📋 Found ${response.documents.length} students with face images`);

    if (response.documents.length === 0) {
      return { 
        success: false, 
        matched: false,
        error: 'No registered face images found in database' 
      };
    }

    // Try to match against each student's face image
    for (const student of response.documents) {
      if (!student.faceImageUrl) continue;

      console.log(`🔄 Checking match for: ${student.firstName} ${student.surname} (${student.matricNumber})`);

      try {
        // Fetch the stored face image from Appwrite Storage
        const storedImageResponse = await fetch(student.faceImageUrl);
        const storedImageBlob = await storedImageResponse.blob();

        // Prepare FormData for facial recognition API
        const formData = new FormData();
        formData.append('referenceImage', storedImageBlob, 'reference.jpg');
        formData.append('targetImage', capturedImageFile, 'target.jpg');

        // Call your facial recognition API
        const verifyResponse = await fetch('/api/facial-recognition', {
          method: 'POST',
          body: formData,
        });

        const verifyResult = await verifyResponse.json();

        console.log(`📊 Verification result for ${student.matricNumber}:`, verifyResult);

        // Check if faces match (adjust threshold as needed)
        if (verifyResult.success && verifyResult.data?.match) {
          console.log(`✅ MATCH FOUND! Student: ${student.firstName} ${student.surname}`);
          
          return {
            success: true,
            matched: true,
            student: student,
            confidence: (verifyResult.data.similarityScore * 100).toFixed(1),
            matchTime: new Date().toLocaleTimeString(),
            verificationData: verifyResult.data
          };
        }
      } catch (matchError) {
        console.error(`❌ Error matching with student ${student.matricNumber}:`, matchError);
        // Continue to next student
        continue;
      }
    }

    console.log('❌ No matching face found');
    return { 
      success: true, 
      matched: false,
      message: 'No matching student found' 
    };

  } catch (error) {
    console.error('❌ Error in face verification:', error);
    return { 
      success: false, 
      matched: false,
      error: error.message 
    };
  }
};

/**
 * Save face image during student enrollment
 */
export const uploadFaceImage = async (imageFile) => {
  try {
    if (!imageFile) return null;

    const fileId = ID.unique();
    const response = await storage.createFile(
      config.bucketId,
      fileId,
      imageFile,
      [Permission.read(Role.any())]
    );

    const fileUrl = storage.getFileView(
      config.bucketId,
      response.$id
    );

    const finalUrl = fileUrl.href || fileUrl.toString();
    console.log('✅ Face image uploaded:', finalUrl);

    return {
      fileId: response.$id,
      fileUrl: finalUrl
    };
  } catch (error) {
    console.error('❌ Error uploading face image:', error);
    throw new Error('Failed to upload face image');
  }
};

/**
 * Update student with face image (use during enrollment)
 */
export const updateStudentWithFace = async (documentId, faceImageFile) => {
  try {
    // Upload face image
    const faceData = await uploadFaceImage(faceImageFile);

    if (!faceData) {
      return { success: false, error: 'Failed to upload face image' };
    }

    // Update student record
    const result = await saveFaceTemplate(documentId, faceData.fileUrl);

    return result;
  } catch (error) {
    console.error('Error updating student with face:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// ENHANCED FINGERPRINT VERIFICATION
// ========================================

/**
 * Verify fingerprint using actual fingerprint scanner
 * This assumes you have a fingerprint SDK that returns template data
 */
export const verifyFingerprintScanner = async (capturedTemplate) => {
  try {
    console.log('🔍 Starting fingerprint verification...');

    // Get all students with fingerprints
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.equal('isActive', true)
      ]
    );

    console.log(`📋 Found ${response.documents.length} students with fingerprints`);

    // In production: Use actual fingerprint matching SDK
    // Example: const matchResult = await fingerprintSDK.match(capturedTemplate, storedTemplates);
    
    for (const student of response.documents) {
      const storedFingerprints = [
        student.thumbTemplate,
        student.indexTemplate,
        student.middleTemplate,
        student.ringTemplate,
        student.pinkyTemplate
      ].filter(Boolean); // Remove empty templates

      // TODO: Replace with actual fingerprint matching algorithm
      // This is a placeholder - implement your fingerprint SDK logic here
      for (const storedTemplate of storedFingerprints) {
        // Example SDK call (replace with your actual SDK):
        // const matchScore = await fingerprintSDK.compareTemplates(capturedTemplate, storedTemplate);
        
        // Simulated match for demo (REPLACE THIS)
        if (capturedTemplate === storedTemplate) {
          console.log(`✅ Fingerprint matched for: ${student.firstName} ${student.surname}`);
          
          return {
            success: true,
            matched: true,
            student: student,
            confidence: 95.0,
            matchTime: new Date().toLocaleTimeString()
          };
        }
      }
    }

    console.log('❌ No matching fingerprint found');
    return { 
      success: true, 
      matched: false,
      message: 'No matching fingerprint found' 
    };

  } catch (error) {
    console.error('❌ Error verifying fingerprint:', error);
    return { 
      success: false, 
      matched: false,
      error: error.message 
    };
  }
};


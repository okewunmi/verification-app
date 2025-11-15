// // app/api/send-welcome-email/route.js
// // PRODUCTION-READY EMAIL ROUTE WITH ERROR HANDLING

// import nodemailer from 'nodemailer';
// import { NextResponse } from 'next/server';

// // Validate email configuration on startup
// const validateEmailConfig = () => {
//   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
//     console.error('❌ CRITICAL: Email credentials not configured!');
//     console.error('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
//     return false;
//   }
//   return true;
// };

// // Create reusable transporter
// let transporter = null;

// const getTransporter = () => {
//   if (!transporter) {
//     transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.GMAIL_USER,
//         pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
//       },
//       tls: {
//         rejectUnauthorized: false // For development
//       }
//     });
//   }
//   return transporter;
// };

// export async function POST(request) {
//   try {
//     console.log('\n📧 === EMAIL API CALLED ===');
    
//     // Validate configuration
//     if (!validateEmailConfig()) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Email service not configured. Please contact administrator.' 
//         },
//         { status: 500 }
//       );
//     }

//     // Parse request body
//     let body;
//     try {
//       body = await request.json();
//     } catch (parseError) {
//       console.error('❌ Invalid JSON:', parseError);
//       return NextResponse.json(
//         { success: false, error: 'Invalid request body' },
//         { status: 400 }
//       );
//     }

//     const { studentData, matricNumber, defaultPassword } = body;

//     // Validate required fields
//     if (!studentData || !matricNumber || !defaultPassword) {
//       console.error('❌ Missing required fields');
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Missing required fields: studentData, matricNumber, defaultPassword' 
//         },
//         { status: 400 }
//       );
//     }

//     if (!studentData.email) {
//       console.error('❌ Student email is missing');
//       return NextResponse.json(
//         { success: false, error: 'Student email is required' },
//         { status: 400 }
//       );
//     }

//     console.log('📧 Sending welcome email to:', studentData.email);
//     console.log('   Student:', `${studentData.firstName} ${studentData.surname}`);
//     console.log('   Matric:', matricNumber);

//     // Create email content
//     const emailHtml = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="utf-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <style>
//           body { 
//             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
//             line-height: 1.6; 
//             color: #333; 
//             max-width: 600px; 
//             margin: 0 auto; 
//             background: #f5f5f5;
//           }
//           .container { background: white; margin: 5px; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
//           .header { 
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//             color: white; 
//             padding: 10px; 
//             text-align: center; 
//           }
//           .header h1 { margin: 0; font-size: 32px; font-weight: 600; }
//           .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
//           .content { padding: 10px; }
//           .info-box { 
//             background: #f8f9fa; 
//             padding: 10px; 
//             margin: 10px 0; 
//             border-radius: 8px; 
//             border-left: 4px solid #667eea; 
//           }
//           .info-box h2 { margin-top: 0; color: #667eea; font-size: 20px; }
//           .info-row { padding: 8px 0; display: flex; }
//           .info-label { font-weight: 600; color: #555; min-width: 140px; }
//           .info-value { color: #333; }
//           .credentials { 
//             background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); 
//             padding: 10px; 
//             margin: 10px 0; 
//             border-radius: 8px; 
//             border: 2px solid #ffc107; 
//           }
//           .credentials h2 { margin-top: 0; color: #856404; font-size: 20px; }
//           .credential-item { 
//             background: white; 
//             padding: 15px; 
//             margin: 10px 0; 
//             border-radius: 5px; 
//             font-size: 16px;
//           }
//           .credential-label { font-weight: 600; color: #856404; display: block; margin-bottom: 5px; }
//           .credential-value { 
//             font-family: 'Courier New', monospace; 
//             font-size: 18px; 
//             color: #000; 
//             font-weight: bold;
//           }
//           .warning { 
//             background: #fff3f3; 
//             padding: 10px; 
//             margin: 10px 0; 
//             border-radius: 8px; 
//             border-left: 4px solid #dc3545; 
//           }
//           .warning h3 { margin-top: 0; color: #dc3545; font-size: 18px; }
//           .instructions { 
//             background: #e7f3ff; 
//             padding: 10px; 
//             margin: 10px 0; 
//             border-radius: 8px; 
//             border-left: 4px solid #0066cc;
//           }
//           .instructions h3 { margin-top: 0; color: #0066cc; font-size: 18px; }
//           .instructions ol { margin: 15px 0; padding-left: 25px; }
//           .instructions li { padding: 8px 0; color: #333; }
//           .button { 
//             display: inline-block; 
//             padding: 15px 40px; 
//             background: #667eea; 
//             color: white !important; 
//             text-decoration: none; 
//             border-radius: 5px; 
//             margin: 10px 0;
//             font-weight: 600;
//             text-align: center;
//           }
//           .footer { 
//             background: #f8f9fa; 
//             text-align: center; 
//             padding: 30px; 
//             color: #666; 
//             font-size: 13px; 
//             border-top: 1px solid #dee2e6;
//           }
//           .footer p { margin: 5px 0; }
//           strong { color: #667eea; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h2>🎓 Welcome to FTP!</h2>
//             <p>FEDERAL UNIVERSITY OYE EKITI - Student Portal</p>
//           </div>
          
//           <div class="content">
//             <p style="font-size: 16px;">Dear <strong>${studentData.firstName} ${studentData.surname}</strong>,</p>
            
//             <p>Congratulations! Your student account has been successfully created in the FTP Attendance System.</p>
            
//             <div class="info-box">
//               <h3>📋 Your Student Information</h3>
//               <div class="info-row">
//                 <span class="info-label">Full Name:</span>
//                 <span class="info-value">${studentData.firstName} ${studentData.middleName || ''} ${studentData.surname}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-label">Matric Number:</span>
//                 <span class="info-value"><strong>${matricNumber}</strong></span>
//               </div>
//               <div class="info-row">
//                 <span class="info-label">Department:</span>
//                 <span class="info-value">${studentData.department}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-label">Course:</span>
//                 <span class="info-value">${studentData.course}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-label">Level:</span>
//                 <span class="info-value">${studentData.level}</span>
//               </div>
//               <div class="info-row">
//                 <span class="info-label">Email:</span>
//                 <span class="info-value">${studentData.email}</span>
//               </div>
//             </div>
            
//             <div class="credentials">
//               <h3>🔐 Your Login Credentials</h3>
//               <p>Use these credentials to access the student portal:</p>
              
//               <div class="credential-item">
//                 <span class="credential-label">Username (Matric Number):</span>
//                 <span class="credential-value">${matricNumber}</span>
//               </div>
              
//               <div class="credential-item">
//                 <span class="credential-label">Default Password (Your Surname):</span>
//                 <span class="credential-value">${defaultPassword}</span>
//               </div>
//             </div>
            
//             <div class="warning">
//               <h3>⚠️ Important Security Notice</h3>
//               <p style="margin-bottom: 0;"><strong>You MUST change your password immediately after your first login!</strong></p>
//               <p style="margin-top: 10px; margin-bottom: 0;">Your default password is your surname, which is easily guessable. Please set a strong, unique password to protect your account.</p>
//             </div>
            
//             <div class="instructions">
//               <h3>📱 How to Access Your Account</h3>
//               <ol>
//                 <li><strong>Visit the student portal:</strong> <a href="https://ftpv.appwrite.network/student-login" style="color: #0066cc;">https://ftpv.appwrite.network/student-login</a></li>
//                 <li><strong>Enter your Matric Number:</strong> ${matricNumber}</li>
//                 <li><strong>Enter your Surname as password:</strong> ${defaultPassword}</li>
//                 <li><strong>Click "Login"</strong></li>
//                 <li><strong>Change your password</strong> in the settings after logging in</li>
//               </ol>
//             </div>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="https://ftpv.appwrite.network/student-login" class="button">
//                 Login to Student Portal →
//               </a>
//             </div>
            
//             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
//               <h4 style="margin-top: 0; color: #555;">📞 Need Help?</h4>
//               <p style="margin-bottom: 0;">If you have any questions or encounter any issues, please contact:</p>
//               <ul style="margin-top: 10px;">
//                 <li>IT Support: support@federalpolyilaro.edu.ng</li>
//                 <li>Your Department Office</li>
//                 <li>Student Affairs Office</li>
//               </ul>
//             </div>
            
//             <p style="margin-top: 40px; font-size: 15px;">
//               Best regards,<br>
//               <strong>FTP Administration Team</strong><br>
//               <span style="color: #666;">Federal Polytechnic Ilaro</span>
//             </p>
//           </div>
          
//           <div class="footer">
//             <p><strong>This is an automated message. Please do not reply to this email.</strong></p>
//             <p>If you did not create this account, please contact IT support immediately.</p>
//             <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} Federal Polytechnic Ilaro. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     // Send email
//     const transporter = getTransporter();
    
//     const info = await transporter.sendMail({
//       from: `"FTP Attendance System" <${process.env.GMAIL_USER}>`,
//       to: studentData.email,
//       subject: '🎓 Welcome to FTP - Your Account Has Been Created',
//       html: emailHtml,
//       priority: 'high'
//     });

//     console.log('✅ Email sent successfully!');
//     console.log('   Message ID:', info.messageId);
//     console.log('   Accepted:', info.accepted);
//     console.log('========================\n');

//     return NextResponse.json({
//       success: true,
//       messageId: info.messageId,
//       accepted: info.accepted,
//       message: 'Welcome email sent successfully'
//     });

//   } catch (error) {
//     console.error('\n❌ === EMAIL SENDING FAILED ===');
//     console.error('Error details:', error);
//     console.error('Error type:', error.name);
//     console.error('Error message:', error.message);
    
//     // Check for specific Gmail errors
//     if (error.code === 'EAUTH') {
//       console.error('Authentication failed - check Gmail credentials');
//     } else if (error.code === 'ESOCKET') {
//       console.error('Network error - check internet connection');
//     }
//     console.error('============================\n');

//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error.message,
//         errorType: error.name,
//         errorCode: error.code
//       },
//       { status: 500 }
//     );
//   }
// }

// // Health check endpoint
// export async function GET() {
//   const isConfigured = validateEmailConfig();
  
//   return NextResponse.json({
//     status: 'ok',
//     emailConfigured: isConfigured,
//     service: 'gmail',
//     message: isConfigured 
//       ? 'Email service is configured and ready' 
//       : 'Email service not configured - missing credentials'
//   });
// }

import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

// Enhanced logging
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// Validate email configuration
const validateEmailConfig = () => {
  log('INFO', 'Validating email configuration...');
  
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  log('DEBUG', 'Environment variables:', {
    hasGmailUser: !!user,
    hasGmailPassword: !!pass,
    userLength: user?.length || 0,
    passLength: pass?.length || 0,
    // Show first/last chars for debugging
    userPreview: user ? `${user.substring(0, 3)}...@${user.split('@')[1]}` : 'MISSING',
    passPreview: pass ? `${pass.substring(0, 3)}...${pass.substring(pass.length - 3)}` : 'MISSING'
  });
  
  if (!user || !pass) {
    log('ERROR', 'Email credentials not configured!');
    log('ERROR', 'Please set GMAIL_USER and GMAIL_APP_PASSWORD in your hosting environment');
    return false;
  }
  
  log('INFO', 'Email configuration validated successfully');
  return true;
};

// Create reusable transporter with enhanced config
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    log('INFO', 'Creating email transporter...');
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
      },
      tls: {
        rejectUnauthorized: false
      },
      // Add these for better reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 1,
      rateDelta: 1000,
      rateLimit: 1
    });
    
    log('INFO', 'Transporter created successfully');
  }
  return transporter;
};

export async function POST(request) {
  try {
    log('INFO', '📧 === EMAIL API CALLED ===');
    log('INFO', `Request URL: ${request.url}`);
    log('INFO', `Request method: ${request.method}`);
    
    // Validate configuration
    if (!validateEmailConfig()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email service not configured. Please contact administrator.',
          details: 'Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables'
        },
        { status: 500 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      log('DEBUG', 'Request body received:', {
        hasStudentData: !!body.studentData,
        hasMatricNumber: !!body.matricNumber,
        hasDefaultPassword: !!body.defaultPassword
      });
    } catch (parseError) {
      log('ERROR', 'Invalid JSON in request body', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { studentData, matricNumber, defaultPassword } = body;

    // Validate required fields
    if (!studentData || !matricNumber || !defaultPassword) {
      log('ERROR', 'Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: studentData, matricNumber, defaultPassword' 
        },
        { status: 400 }
      );
    }

    if (!studentData.email) {
      log('ERROR', 'Student email is missing');
      return NextResponse.json(
        { success: false, error: 'Student email is required' },
        { status: 400 }
      );
    }

    log('INFO', `Preparing to send email to: ${studentData.email}`);
    log('INFO', `Student: ${studentData.firstName} ${studentData.surname}`);
    log('INFO', `Matric: ${matricNumber}`);

    // Create email content (your existing HTML)
    // const emailHtml = `
    //   <!DOCTYPE html>
    //   <html>
    //   <head>
    //     <meta charset="utf-8">
    //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //     <style>
    //       body { 
    //         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    //         line-height: 1.6; 
    //         color: #333; 
    //         max-width: 600px; 
    //         margin: 0 auto; 
    //         background: #f5f5f5;
    //       }
    //       .container { background: white; margin: 5px; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    //       .header { 
    //         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
    //         color: white; 
    //         padding: 10px; 
    //         text-align: center; 
    //       }
    //       .header h1 { margin: 0; font-size: 32px; font-weight: 600; }
    //       .content { padding: 10px; }
    //       .credentials { 
    //         background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); 
    //         padding: 10px; 
    //         margin: 10px 0; 
    //         border-radius: 8px; 
    //         border: 2px solid #ffc107; 
    //       }
    //       .credential-value { 
    //         font-family: 'Courier New', monospace; 
    //         font-size: 18px; 
    //         color: #000; 
    //         font-weight: bold;
    //       }
    //       strong { color: #667eea; }
    //     </style>
    //   </head>
    //   <body>
    //     <div class="container">
    //       <div class="header">
    //         <h2>🎓 Welcome to FTP!</h2>
    //         <p>FEDERAL UNIVERSITY OYE EKITI - Student Portal</p>
    //       </div>
          
    //       <div class="content">
    //         <p>Dear <strong>${studentData.firstName} ${studentData.surname}</strong>,</p>
            
    //         <p>Your student account has been successfully created.</p>
            
    //         <div class="credentials">
    //           <h3>🔐 Your Login Credentials</h3>
    //           <p><strong>Username:</strong> <span class="credential-value">${matricNumber}</span></p>
    //           <p><strong>Password:</strong> <span class="credential-value">${defaultPassword}</span></p>
    //         </div>
            
    //         <p>Login at: <a href="https://ftpv.appwrite.network/student-login">https://ftpv.appwrite.network/student-login</a></p>
            
    //         <p><strong>⚠️ IMPORTANT:</strong> Change your password after first login!</p>
            
    //         <p>Best regards,<br><strong>FTP Administration Team</strong></p>
    //       </div>
    //     </div>
    //   </body>
    //   </html>
    // `;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 5px 0; 
            background: #ddddddff;
          }
          .container { background: white; margin: 5px; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 3px rgba(0,0,0,0.1); }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 10px; 
            text-align: center; 
          }
          .header h2 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
          .content { padding: 10px; }
          .info-box { 
            background: #e7e8e9ff; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid #667eea; 
          }
          .info-box h2 { margin-top: 0; color: #667eea; font-size: 20px; }
          .info-row { padding: 5px 0; display: flex; }
          .info-label { font-weight: 500; color: #555; min-width: 140px; }
          .info-value { color: #333; }
          .credentials { 
            background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border: 2px solid #ffc107; 
          }
          .credentials h2 { margin-top: 0; color: #856404; font-size: 20px; }
          .credential-item { 
            background: white; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px; 
            font-size: 16px;
          }
          .credential-label { font-weight: 600; color: #856404; display: block; margin-bottom: 5px; }
          .credential-value { 
            font-family: 'Courier New', monospace; 
            font-size: 18px; 
            color: #000; 
            font-weight: bold;
          }
          .warning { 
            background: #fff3f3; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid #dc3545; 
          }
          .warning h3 { margin-top: 0; color: #dc3545; font-size: 18px; }
          .instructions { 
            background: #e7f3ff; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid #0066cc;
          }
          .instructions h3 { margin-top: 0; color: #0066cc; font-size: 18px; }
          .instructions ol { margin: 15px 0; padding-left: 25px; }
          .instructions li { padding: 8px 0; color: #333; }
          .button { 
            display: inline-block; 
            padding: 15px 40px; 
            background: #667eea; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0;
            font-weight: 600;
            text-align: center;
          }
          .footer { 
            background: #f8f9fa; 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            font-size: 13px; 
            border-top: 1px solid #dee2e6;
          }
          .footer p { margin: 5px 0; }
          strong { color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎓 Welcome to FTP!</h2>
            <p>FEDERAL UNIVERSITY OYE EKITI - Student Portal</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${studentData.firstName} ${studentData.surname}</strong>,</p>
            
            <p>Congratulations! Your student account has been successfully created in the FTP Attendance System.</p>
            
            <div class="info-box">
              <h3>📋 Your Student Information</h3>
              <div class="info-row">
                <span class="info-label">Full Name:</span>
                <span class="info-value">${studentData.firstName} ${studentData.middleName || ''} ${studentData.surname}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Matric Number:</span>
                <span class="info-value"><strong>${matricNumber}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Department:</span>
                <span class="info-value">${studentData.department}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Course:</span>
                <span class="info-value">${studentData.course}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Level:</span>
                <span class="info-value">${studentData.level}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${studentData.email}</span>
              </div>
            </div>
            
            <div class="credentials">
              <h3>🔐 Your Login Credentials</h3>
              <p>Use these credentials to access the student portal:</p>
              
              <div class="credential-item">
                <span class="credential-label">Username (Matric Number):</span>
                <span class="credential-value">${matricNumber}</span>
              </div>
              
              <div class="credential-item">
                <span class="credential-label">Default Password (Your Surname):</span>
                <span class="credential-value">${defaultPassword}</span>
              </div>
            </div>
            
            <div class="warning">
              <h3>⚠️ Important Security Notice</h3>
              <p style="margin-bottom: 0;"><strong>You MUST change your password immediately after your first login!</strong></p>
              <p style="margin-top: 10px; margin-bottom: 0;">Your default password is your surname, which is easily guessable. Please set a strong, unique password to protect your account.</p>
            </div>
            
            <div class="instructions">
              <h3>📱 How to Access Your Account</h3>
              <ol>
                <li><strong>Visit the student portal:</strong> <a href="https://ftpv.appwrite.network/student-login" style="color: #0066cc;">https://ftpv.appwrite.network/student-login</a></li>
                <li><strong>Enter your Matric Number:</strong> ${matricNumber}</li>
                <li><strong>Enter your Surname as password:</strong> ${defaultPassword}</li>
                <li><strong>Click "Login"</strong></li>
                <li><strong>Change your password</strong> in the settings after logging in</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://ftpv.appwrite.network/student-login" class="button">
                Login to Student Portal →
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <h4 style="margin-top: 0; color: #555;">📞 Need Help?</h4>
              <p style="margin-bottom: 0;">If you have any questions or encounter any issues, please contact:</p>
              <ul style="margin-top: 10px;">
                <li>IT Support: support@federalpolyilaro.edu.ng</li>
                <li>Your Department Office</li>
                <li>Student Affairs Office</li>
              </ul>
            </div>
            
            <p style="margin-top: 40px; font-size: 15px;">
              Best regards,<br>
              <strong>FTP Administration Team</strong><br>
              <span style="color: #666;">Federal Polytechnic Ilaro</span>
            </p>
          </div>
          
          <div class="footer">
            <p><strong>This is an automated message. Please do not reply to this email.</strong></p>
            <p>If you did not create this account, please contact IT support immediately.</p>
            <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} FEDERAL UNIVERSITY OYE EKITI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    // Send email with retry logic
    const transporter = getTransporter();
    
    log('INFO', 'Attempting to send email...');
    
    const info = await transporter.sendMail({
      from: `"FTP Attendance System" <${process.env.GMAIL_USER}>`,
      to: studentData.email,
      subject: '🎓 Welcome to FTP - Your Account Has Been Created',
      html: emailHtml,
      priority: 'high'
    });

    log('INFO', '✅ Email sent successfully!', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      message: 'Welcome email sent successfully'
    });

  } catch (error) {
    log('ERROR', '❌ EMAIL SENDING FAILED', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });

    // Provide more specific error messages
    let userMessage = error.message;
    
    if (error.code === 'EAUTH') {
      userMessage = 'Email authentication failed. Please check Gmail credentials.';
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      userMessage = 'Network error. Check if SMTP is allowed on your hosting provider.';
    } else if (error.code === 'ECONNREFUSED') {
      userMessage = 'Connection refused. SMTP port may be blocked.';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: userMessage,
        errorType: error.name,
        errorCode: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const isConfigured = validateEmailConfig();
  
  return NextResponse.json({
    status: 'ok',
    emailConfigured: isConfigured,
    service: 'gmail',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: isConfigured 
      ? 'Email service is configured and ready' 
      : 'Email service not configured - missing credentials'
  });
}
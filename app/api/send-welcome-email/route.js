// app/api/send-welcome-email/route.js
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentData, matricNumber, defaultPassword } = body;

    console.log('📧 API: Sending welcome email to:', studentData.email);

    // Validate inputs
    if (!studentData || !matricNumber || !defaultPassword) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Gmail credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') // Remove any spaces
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"FTP Attendance System" <${process.env.GMAIL_USER}>`,
      to: studentData.email,
      subject: '🎓 Welcome to FTP - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .credentials { background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #ffc107; }
            .warning { background: #f8d7da; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc3545; color: #721c24; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 28px; }
            h2 { color: #667eea; margin-top: 0; }
            strong { color: #667eea; }
            .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎓 Welcome to FTP!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Federal Polytechnic Ilaro</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${studentData.firstName} ${studentData.surname}</strong>,</p>
            
            <p>Your student account has been successfully created! Welcome to the FTP Attendance System.</p>
            
            <div class="info-box">
              <h2>📋 Your Information</h2>
              <p><strong>Full Name:</strong> ${studentData.firstName} ${studentData.middleName || ''} ${studentData.surname}</p>
              <p><strong>Matric Number:</strong> ${matricNumber}</p>
              <p><strong>Department:</strong> ${studentData.department}</p>
              <p><strong>Course:</strong> ${studentData.course}</p>
              <p><strong>Level:</strong> ${studentData.level}</p>
              <p><strong>Email:</strong> ${studentData.email}</p>
            </div>
            
            <div class="credentials">
              <h2>🔐 Your Login Credentials</h2>
              <p><strong>Username:</strong> ${matricNumber}</p>
              <p><strong>Default Password:</strong> ${defaultPassword}</p>
            </div>
            
            <div class="warning">
              <h3 style="margin-top: 0;">⚠️ Important Security Notice</h3>
              <p style="margin-bottom: 0;"><strong>Please change your password immediately after your first login for security reasons!</strong></p>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #0066cc;">📱 How to Login</h3>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <a href="https://ftpv.appwrite.network/student-login"> <li>Visit the student portal </li> </a>
                
                <li>Enter your <strong>Matric Number</strong> (${matricNumber}) as username</li>
                <li>Enter your <strong>Surname</strong> (${defaultPassword}) as password</li>
                <li>After login, click "Change Password" to set a new secure password</li>
              </ol>
            </div>
            
            <p>If you have any questions or need assistance, please contact the system administrator.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>FTP Administration Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Federal Polytechnic Ilaro. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Welcome email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
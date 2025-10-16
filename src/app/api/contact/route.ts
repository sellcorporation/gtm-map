import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message, inquiryType } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Send email using a service like SendGrid, Resend, or Nodemailer
    // 2. Store the message in a database
    // 3. Send notifications to your team
    
    // For now, we'll just log the message and return success
    console.log('Contact form submission:', {
      name,
      email,
      company,
      inquiryType,
      message: message.substring(0, 100) + '...', // Log first 100 chars
      timestamp: new Date().toISOString()
    });

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // await sendEmail({
    //   to: 'support@gtmmap.com',
    //   subject: `New ${inquiryType} inquiry from ${name}`,
    //   html: `
    //     <h2>New Contact Inquiry</h2>
    //     <p><strong>Name:</strong> ${name}</p>
    //     <p><strong>Email:</strong> ${email}</p>
    //     <p><strong>Company:</strong> ${company || 'Not provided'}</p>
    //     <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
    //     <p><strong>Message:</strong></p>
    //     <p>${message.replace(/\n/g, '<br>')}</p>
    //   `
    // });

    return NextResponse.json(
      { 
        success: true, 
        message: "Thank you for your message! We'll get back to you soon." 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process your message. Please try again.' },
      { status: 500 }
    );
  }
}


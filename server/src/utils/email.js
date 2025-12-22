const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text }) => {
  // For development, use Gmail SMTP
  // In production, use your preferred email service
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app password for Gmail
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text
  });
};

module.exports = sendEmail;

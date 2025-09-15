const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendKeyEmail(to, subject, body) {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: body
  });
  return info;
}

module.exports = { sendKeyEmail };

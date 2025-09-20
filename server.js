// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✔ set' : '❌ not set');

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/send-email', async (req, res) => {
  const { to, name, loginEmail, loginLink } = req.body;

  const subject = "🎉 Welcome to ONDO- Your Agency Account is Ready!";

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #4CAF50;">🎉 Welcome to HTAMS!</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Congratulations! You have been successfully confirmed as an agency in the <strong>HTAMS</strong> system.</p>
      
      <p>Here are your login details:</p>
      <ul style="line-height: 1.6;">
        <li><strong>Email:</stro  ng> ${loginEmail}</li>
         <img src="./Public/htams-logo.png" alt="ONDOLogo" style="max-width: 150px; margin-bottom: 20px;" />
        <li><strong>Password:</strong> Your phone number (please change it after first login)</li>
      </ul>

      <p>You can log in using the link below:</p>
      <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Login to HTAMS</a>

      <p>If you have any questions, feel free to contact our support team.</p>

      <hr />
      <p style="font-size: 12px; color: #555;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent to:', to);
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});


const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Email server running at http://localhost:${PORT}`);
});

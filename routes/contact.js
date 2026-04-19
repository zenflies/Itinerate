const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── POST /api/contact ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body;

  if (!firstName || !email || !message) {
    return res.status(400).json({ error: 'firstName, email, and message are required.' });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const mailOptions = {
    from: `"Itinerate Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `[Itinerate] ${subject || 'Contact Form Message'} — from ${fullName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1B4F72;border-bottom:2px solid #E5E7EB;padding-bottom:12px">
          New Contact Form Message
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#6B7280;width:100px">Name</td><td style="padding:8px 0;font-weight:600">${fullName}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6B7280">Subject</td><td style="padding:8px 0">${subject || '—'}</td></tr>
        </table>
        <h3 style="color:#1F2937;margin-bottom:8px">Message</h3>
        <div style="background:#F9FAFB;border-radius:8px;padding:16px;color:#374151;line-height:1.7;white-space:pre-wrap">${message}</div>
        <p style="margin-top:24px;color:#9CA3AF;font-size:0.85rem">
          Sent via the Itinerate contact form · Reply directly to respond to ${fullName}
        </p>
      </div>`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact email error:', err.message);
    return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;

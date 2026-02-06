const nodemailer = require('nodemailer');

// Placeholder for SMTP config - normally this would come from env vars
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});

const sendChatTranscript = async (toEmail, chat, messages) => {
  if (!toEmail) return false;

  try {
    const formattedDate = new Date(chat.createdAt).toLocaleDateString();
    
    // Simple HTML Template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Chat Transcript</h2>
        <p>Date: ${formattedDate}</p>
        <p>Chat ID: ${chat._id}</p>
        <hr/>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${messages.map(msg => `
            <div style="margin-bottom: 10px;">
              <strong>${msg.senderType === 'agent' ? 'Support Agent' : 'You'}:</strong>
              <span style="color: #555;">${msg.content}</span>
              <div style="font-size: 10px; color: #999;">${new Date(msg.sentAt).toLocaleTimeString()}</div>
            </div>
          `).join('')}
        </div>
        <hr/>
        <p style="font-size: 12px; color: #777;">Thank you for contacting support.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Support Team" <support@example.com>',
      to: toEmail,
      subject: `Chat Transcript - ${formattedDate}`,
      html: htmlContent,
    });

    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending transcript email:', error);
    return false;
  }
};

module.exports = {
  sendChatTranscript,
};

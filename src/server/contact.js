import express from 'express';
import { Resend } from 'resend';

const app = express();
app.use(express.json());

const resend = new Resend('re_Eq6vMpGL_AC175T5qwG4JQjMNWit6BYzC');

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await resend.emails.send({
      from: 'lou@novitagroup.com',
      to: ['lou@novitagroup.com'],
      subject: 'Contact Us Form Submission',
      html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
    });
    res.json({ success: true });
   catch (error) {
     console.error('Resend error:', error); // <-- Add this line!
     res.status(500).json({ error: 'Failed to send email.' });
   }
});

app.listen(3001, () => console.log('Server running on port 3001'));
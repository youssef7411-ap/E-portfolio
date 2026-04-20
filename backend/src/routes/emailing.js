import express from 'express';
import Subject from '../models/Subject.js';
import TeacherEmail from '../models/TeacherEmail.js';
import EmailLog from '../models/EmailLog.js';
import authenticate from '../middleware/authenticate.js';
import { getOrCreateSiteSettings, mergeSiteSettings } from '../utils/siteSettings.js';
import { getMailerStatus, sendAppEmail } from '../utils/mailer.js';

const router = express.Router();

const dedupe = (items) => [...new Set(items.filter(Boolean).map((item) => String(item).trim().toLowerCase()))];

const buildPublicBaseUrl = () => {
  const raw = process.env.PUBLIC_SITE_URL
    || process.env.CLIENT_URL
    || process.env.CORS_ORIGIN
    || 'http://localhost:3000';

  return String(raw).split(',')[0].trim().replace(/\/+$/, '');
};

const buildSubjectLink = (subjectId) => `${buildPublicBaseUrl()}/subject/${subjectId}`;

const applyTemplate = (template, context) => (
  String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => String(context[key] ?? ''))
);

const resolveSubjectRecipient = (teacherEmail, settings) => (
  String(teacherEmail || '').trim().toLowerCase()
  || String(settings.emailing.defaultRecipientEmail || '').trim().toLowerCase()
);

router.get('/directory', authenticate, async (req, res) => {
  try {
    const [subjects, emails, settingsDoc] = await Promise.all([
      Subject.find().sort({ order: 1, createdAt: -1 }).lean(),
      TeacherEmail.find().lean(),
      getOrCreateSiteSettings(),
    ]);

    const settings = mergeSiteSettings(settingsDoc.toObject());
    const emailLookup = new Map(
      emails.map((entry) => [String(entry.subject), String(entry.email || '').trim().toLowerCase()]),
    );

    const rows = subjects.map((subject) => ({
      _id: subject._id,
      name: subject.name,
      visible: subject.visible !== false,
      teacherEmail: emailLookup.get(String(subject._id)) || '',
      preview: subject.preview || {},
      fallbackEmail: settings.emailing.defaultRecipientEmail,
    }));

    const recipients = dedupe(rows.map((row) => row.teacherEmail).concat(settings.emailing.defaultRecipientEmail));

    res.json({
      rows,
      summary: {
        subjects: rows.length,
        recipients: recipients.length,
        smtpConfigured: getMailerStatus().configured,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load emailing directory' });
  }
});

router.post('/send-subject/:subjectId', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId).lean();
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const [teacherEmailDoc, settingsDoc] = await Promise.all([
      TeacherEmail.findOne({ subject: subject._id }).lean(),
      getOrCreateSiteSettings(),
    ]);

    const settings = mergeSiteSettings(settingsDoc.toObject());
    const recipient = resolveSubjectRecipient(teacherEmailDoc?.email, settings);
    if (!recipient) {
      return res.status(400).json({ message: 'No teacher email or default recipient is configured for this subject.' });
    }

    const context = {
      subjectName: subject.name,
      subjectLink: buildSubjectLink(subject._id),
      teacherEmail: recipient,
    };

    const emailSubject = applyTemplate(
      req.body?.subject || settings.emailing.defaultSubject,
      context,
    ).trim();
    const emailMessage = applyTemplate(
      req.body?.message || settings.emailing.defaultMessage,
      context,
    ).trim();

    if (!emailSubject || !emailMessage) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    await sendAppEmail({
      to: recipient,
      subject: emailSubject,
      text: emailMessage,
      fromEmail: settings.emailing.senderEmail,
      fromName: settings.emailing.senderName || settings.brand.siteTitle,
      replyTo: settings.emailing.replyToEmail,
      notificationEmail: settings.emailing.notificationEmail,
    });

    await EmailLog.create({
      subject: subject._id,
      teacherEmail: recipient,
      status: 'success',
      message: emailSubject,
    });

    res.json({
      message: 'Email sent successfully.',
      recipient,
    });
  } catch (error) {
    await EmailLog.create({
      subject: req.params.subjectId,
      teacherEmail: '',
      status: 'fail',
      error: String(error.message || 'Email send failed').slice(0, 300),
      message: String(req.body?.subject || '').slice(0, 180),
    }).catch(() => {});

    res.status(400).json({
      message: error.message || 'Failed to send email',
      mailer: getMailerStatus(),
    });
  }
});

router.post('/send-all', authenticate, async (req, res) => {
  try {
    const [subjects, teacherEmails, settingsDoc] = await Promise.all([
      Subject.find().sort({ order: 1, createdAt: -1 }).lean(),
      TeacherEmail.find().lean(),
      getOrCreateSiteSettings(),
    ]);

    const settings = mergeSiteSettings(settingsDoc.toObject());
    const recipientLookup = new Map(
      teacherEmails.map((entry) => [String(entry.subject), String(entry.email || '').trim().toLowerCase()]),
    );
    const recipients = dedupe([
      ...subjects.map((subject) => recipientLookup.get(String(subject._id)) || ''),
      settings.emailing.defaultRecipientEmail,
    ]);

    if (!recipients.length) {
      return res.status(400).json({ message: 'No recipients found. Add teacher emails or a default recipient first.' });
    }

    const emailSubject = String(req.body?.subject || settings.emailing.defaultSubject || '').trim();
    const emailMessage = String(req.body?.message || settings.emailing.defaultMessage || '').trim();

    if (!emailSubject || !emailMessage) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    for (const recipient of recipients) {
      await sendAppEmail({
        to: recipient,
        subject: emailSubject,
        text: emailMessage,
        fromEmail: settings.emailing.senderEmail,
        fromName: settings.emailing.senderName || settings.brand.siteTitle,
        replyTo: settings.emailing.replyToEmail,
        notificationEmail: settings.emailing.notificationEmail,
      });
    }

    await EmailLog.create({
      teacherEmail: recipients.join(', '),
      status: 'success',
      message: emailSubject,
    });

    res.json({
      message: `Broadcast sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`,
      count: recipients.length,
    });
  } catch (error) {
    await EmailLog.create({
      teacherEmail: '',
      status: 'fail',
      error: String(error.message || 'Broadcast failed').slice(0, 300),
      message: String(req.body?.subject || '').slice(0, 180),
    }).catch(() => {});

    res.status(400).json({
      message: error.message || 'Failed to send broadcast',
      mailer: getMailerStatus(),
    });
  }
});

export default router;

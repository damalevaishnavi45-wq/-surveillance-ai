const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const SEVERITY_COLOR = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444'
};

const buildEmailHTML = (alert) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#0f172a;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;">
    <div style="background:${SEVERITY_COLOR[alert.severity]};padding:16px 24px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">${alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
      <div>
        <p style="margin:0;color:#fff;font-weight:700;font-size:18px;">${alert.severity.toUpperCase()} ALERT</p>
        <p style="margin:0;color:#fff;opacity:0.85;font-size:13px;">${alert.type.replace(/_/g,' ').toUpperCase()}</p>
      </div>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;width:120px;">Camera</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;">${alert.cameraName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Location</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;">${alert.location}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Confidence</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;">${(alert.confidence * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Time</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;">${new Date(alert.createdAt).toLocaleString()}</td>
        </tr>
        ${alert.description ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">Details</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;">${alert.description}</td></tr>` : ''}
      </table>
      ${alert.snapshotUrl ? `<img src="${alert.snapshotUrl}" style="width:100%;border-radius:8px;margin-top:16px;" alt="Alert snapshot"/>` : ''}
      <div style="margin-top:24px;text-align:center;">
        <a href="${process.env.FRONTEND_URL}/alerts/${alert.alertId}" 
           style="background:${SEVERITY_COLOR[alert.severity]};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Alert →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">SurveillanceAI — Automated Alert System</p>
    </div>
  </div>
</body>
</html>
`;

const sendAlertEmail = async (alert) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'supervisor'] },
      'notificationPrefs.email': true,
      isActive: true
    });

    if (!admins.length) return;

    const recipients = admins.map(u => u.email).join(',');

    await transporter.sendMail({
      from: `"SurveillanceAI" <${process.env.EMAIL_USER}>`,
      to: recipients,
      subject: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.type.replace(/_/g,' ')} at ${alert.location}`,
      html: buildEmailHTML(alert)
    });

    await require('../models/Alert').findOneAndUpdate(
      { alertId: alert.alertId },
      { notificationSent: true, notificationChannels: ['email'] }
    );

    console.log(`📧 Alert email sent to ${admins.length} recipients`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

module.exports = { sendAlertEmail };

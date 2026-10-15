import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const router = Router();
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const WEB_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.warn('Auth disabled until JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are configured.');
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 3, maxlength: 24, unique: true, match: /^[a-zA-Z0-9_]+$/ },
  displayName: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  role: { type: String, enum: ['user', 'super_admin', 'moderator'], default: 'user' },
  suspendedAt: { type: Date, default: null },
  suspensionReason: { type: String, default: '', maxlength: 240 },
  bio: { type: String, default: '', maxlength: 160 },
  status: { type: String, default: 'Available', maxlength: 60 },
  avatarPath: { type: String, default: '' },
  verificationTokenHash: { type: String, select: false },
  verificationExpiresAt: Date,
  resetTokenHash: { type: String, select: false },
  resetExpiresAt: Date,
  refreshTokenHash: { type: String, select: false },
}, { timestamps: true });

const User = mongoose.models.ChatWorldUser || mongoose.model('ChatWorldUser', userSchema);
const auditSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatWorldUser', required: true },
  actorRole: { type: String, required: true }, action: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }, ip: { type: String, maxlength: 80 },
}, { timestamps: true });
auditSchema.index({ createdAt: -1 });
const AuditEvent = mongoose.models.ChatWorldAuditEvent || mongoose.model('ChatWorldAuditEvent', auditSchema);
async function audit(req, action, targetId = null, details = {}) {
  await AuditEvent.create({ actorId: req.user.id, actorRole: req.user.role, action, targetId, details, ip: String(req.ip || '').slice(0, 80) });
}
const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null;

function requireConfig(res) {
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    res.status(503).json({ message: 'Authentication is not configured. Set JWT secrets in server/.env.' });
    return false;
  }
  return true;
}
function sendVerificationEmail(email, token) {
  if (!transporter || !process.env.MAIL_FROM) throw new Error('Email delivery is not configured (SMTP_HOST and MAIL_FROM required).');
  const url = `${WEB_ORIGIN}/?verify=${token}`;
  return transporter.sendMail({ from: process.env.MAIL_FROM, to: email, subject: 'Verify your ChatWorld email', text: `Verify your ChatWorld email using this link (expires in 30 minutes): ${url}` });
}
function sendResetEmail(email, token) {
  if (!transporter || !process.env.MAIL_FROM) throw new Error('Email delivery is not configured (SMTP_HOST and MAIL_FROM required).');
  const url = `${WEB_ORIGIN}/?reset=${token}`;
  return transporter.sendMail({ from: process.env.MAIL_FROM, to: email, subject: 'Reset your ChatWorld password', text: `Reset your password using this one-time link (expires in 15 minutes): ${url}` });
}
function issueAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '10m', issuer: 'chatworld' });
}
function setRefreshCookie(res, token) {
  res.cookie('cw_refresh', token, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict', path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 });
}
async function currentUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = jwt.verify(token, ACCESS_SECRET, { issuer: 'chatworld' });
    const user = await User.findById(payload.sub);
    if (!user || user.approvalStatus !== 'approved' || !user.emailVerifiedAt) return res.status(403).json({ message: 'Account is not approved and verified.' });
    if (user.suspendedAt) return res.status(403).json({ message: 'This account is suspended. Contact ChatWorld support.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ message: 'Please sign in again.' }); }
}
function requireAdmin(req, res, next) {
  if (!['super_admin', 'moderator'].includes(req.user?.role)) return res.status(403).json({ message: 'Administrator access required.' });
  next();
}
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ message: 'Super Admin access required.' });
  next();
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

router.post('/register', async (req, res, next) => {
  try {
    if (!requireConfig(res)) return;
    const username = String(req.body.username || '').trim();
    const displayName = String(req.body.displayName || username).trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ message: 'Username must be 3–24 letters, numbers or underscores.' });
    if (displayName.length < 1 || displayName.length > 40) return res.status(400).json({ message: 'Display name must be 1–40 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 12 || password.length > 128) return res.status(400).json({ message: 'Password must be 12–128 characters.' });
    const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email }] });
    if (exists) return res.status(409).json({ message: 'That username or email is already registered.' });
    const rawToken = randomToken();
    const user = await User.create({
      username: username.toLowerCase(), displayName, email,
      passwordHash: await bcrypt.hash(password, 12),
      verificationTokenHash: tokenHash(rawToken), verificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    try { await sendVerificationEmail(email, rawToken); }
    catch (error) {
      await User.findByIdAndDelete(user.id);
      return res.status(503).json({ message: error.message });
    }
    res.status(201).json({ message: 'Verification email sent. Your account will remain pending until email verification and admin approval.' });
  } catch (error) { next(error); }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    if (!token) return res.status(400).json({ message: 'Verification token is required.' });
    const user = await User.findOne({ verificationTokenHash: tokenHash(token), verificationExpiresAt: { $gt: new Date() } }).select('+verificationTokenHash');
    if (!user) return res.status(400).json({ message: 'Verification link is invalid or expired.' });
    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = undefined;
    user.verificationExpiresAt = undefined;
    await user.save();
    res.json({ message: 'Email verified. Your account is waiting for admin approval.' });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    if (!requireConfig(res)) return;
    const identity = String(req.body.identity || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ $or: [{ email: identity }, { username: identity }] }).select('+passwordHash +refreshTokenHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials.' });
    if (user.suspendedAt) return res.status(403).json({ message: 'This account is suspended. Contact ChatWorld support.' });
    if (!user.emailVerifiedAt) return res.status(403).json({ message: 'Please verify your email before signing in.' });
    if (user.approvalStatus !== 'approved') return res.status(403).json({ message: 'Your account is awaiting admin approval.' });
    const refresh = randomToken();
    user.refreshTokenHash = tokenHash(refresh);
    await user.save();
    setRefreshCookie(res, refresh);
    res.json({ accessToken: issueAccess(user), user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, role: user.role, bio: user.bio, status: user.status, avatarPath: user.avatarPath } });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    if (!requireConfig(res)) return;
    const refresh = req.cookies?.cw_refresh;
    if (!refresh) return res.status(401).json({ message: 'Refresh session missing.' });
    const user = await User.findOne({ refreshTokenHash: tokenHash(refresh) }).select('+refreshTokenHash');
    if (!user || !user.emailVerifiedAt || user.approvalStatus !== 'approved' || user.suspendedAt) return res.status(401).json({ message: 'Refresh session expired.' });
    const nextRefresh = randomToken();
    user.refreshTokenHash = tokenHash(nextRefresh);
    await user.save();
    setRefreshCookie(res, nextRefresh);
    res.json({ accessToken: issueAccess(user), user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, bio: user.bio, status: user.status, avatarPath: user.avatarPath } });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res) => {
  const refresh = req.cookies?.cw_refresh;
  if (refresh) await User.updateOne({ refreshTokenHash: tokenHash(refresh) }, { $unset: { refreshTokenHash: 1 } });
  res.clearCookie('cw_refresh', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict', path: '/api/auth' });
  res.json({ message: 'Signed out.' });
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email, emailVerifiedAt: { $ne: null } });
    if (user) {
      const token = randomToken();
      user.resetTokenHash = tokenHash(token);
      user.resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      try { await sendResetEmail(email, token); } catch { /* Do not disclose account existence. */ }
    }
    res.json({ message: 'If that verified email is registered, a reset link will be sent.' });
  } catch (error) { next(error); }
});
router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (password.length < 12 || password.length > 128) return res.status(400).json({ message: 'Password must be 12–128 characters.' });
    const user = await User.findOne({ resetTokenHash: tokenHash(token), resetExpiresAt: { $gt: new Date() } }).select('+resetTokenHash +refreshTokenHash');
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired.' });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetExpiresAt = undefined;
    user.refreshTokenHash = undefined;
    await user.save();
    res.json({ message: 'Password reset. Please sign in again.' });
  } catch (error) { next(error); }
});

router.get('/me', currentUser, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username, displayName: req.user.displayName, email: req.user.email, role: req.user.role, bio: req.user.bio, status: req.user.status, avatarPath: req.user.avatarPath } }));
router.patch('/profile', currentUser, async (req, res, next) => {
  try {
    const displayName = String(req.body.displayName ?? req.user.displayName).trim();
    const bio = String(req.body.bio ?? req.user.bio).trim();
    const status = String(req.body.status ?? req.user.status).trim();
    if (!displayName || displayName.length > 40 || bio.length > 160 || status.length > 60) return res.status(400).json({ message: 'Profile fields exceed allowed lengths.' });
    req.user.displayName = displayName; req.user.bio = bio; req.user.status = status;
    await req.user.save();
    res.json({ user: { displayName, bio, status, username: req.user.username, avatarPath: req.user.avatarPath } });
  } catch (error) { next(error); }
});
router.post('/profile/avatar', currentUser, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose an image file.' });
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !['image/png', 'image/jpeg', 'image/webp'].includes(type.mime)) return res.status(400).json({ message: 'Only valid PNG, JPEG or WebP images are allowed.' });
    // Avatar storage provider is intentionally not assumed; persist via configured storage in a later deployment step.
    res.status(501).json({ message: 'Image validation passed, but avatar storage is not configured yet.' });
  } catch (error) { next(error); }
});

router.get('/admin/dashboard', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const [totalUsers, pending, verified, onlineApprox, suspended, recentAudit] = await Promise.all([
      User.countDocuments({ role: 'user' }), User.countDocuments({ approvalStatus: 'pending', emailVerifiedAt: { $ne: null }, role: 'user' }),
      User.countDocuments({ emailVerifiedAt: { $ne: null }, role: 'user' }), Promise.resolve(null),
      User.countDocuments({ suspendedAt: { $ne: null }, role: 'user' }),
      AuditEvent.find().sort({ createdAt: -1 }).limit(20).populate('actorId', 'username displayName').lean(),
    ]);
    res.json({ stats: { totalUsers, pendingApprovals: pending, verifiedUsers: verified, onlineUsers: onlineApprox, suspendedUsers: suspended }, audit: recentAudit });
  } catch (error) { next(error); }
});
router.get('/admin/pending', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ approvalStatus: 'pending', emailVerifiedAt: { $ne: null }, role: 'user' })
      .select('username displayName email emailVerifiedAt createdAt').sort({ createdAt: 1 }).lean();
    res.json({ users });
  } catch (error) { next(error); }
});
router.get('/admin/users', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim().slice(0, 80);
    const filter = { role: 'user' };
    if (search) filter.$or = [
      { username: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\router.get('/admin/pending', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ approvalStatus: 'pending' }).select('username displayName email emailVerifiedAt createdAt');
    res.json({ users });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/approval', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.emailVerifiedAt) return res.status(409).json({ message: 'User must verify their email before admin approval.' });
    user.approvalStatus = status;
    await user.save();
    res.json({ message: `Account ${status}.` });
  } catch (error) { next(error); }
});'), $options: 'i' } },
      { displayName: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\router.get('/admin/pending', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ approvalStatus: 'pending' }).select('username displayName email emailVerifiedAt createdAt');
    res.json({ users });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/approval', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.emailVerifiedAt) return res.status(409).json({ message: 'User must verify their email before admin approval.' });
    user.approvalStatus = status;
    await user.save();
    res.json({ message: `Account ${status}.` });
  } catch (error) { next(error); }
});'), $options: 'i' } },
      { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\router.get('/admin/pending', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ approvalStatus: 'pending' }).select('username displayName email emailVerifiedAt createdAt');
    res.json({ users });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/approval', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.emailVerifiedAt) return res.status(409).json({ message: 'User must verify their email before admin approval.' });
    user.approvalStatus = status;
    await user.save();
    res.json({ message: `Account ${status}.` });
  } catch (error) { next(error); }
});'), $options: 'i' } },
    ];
    const users = await User.find(filter).select('username displayName email emailVerifiedAt approvalStatus suspendedAt createdAt').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ users });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/approval', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'user') return res.status(404).json({ message: 'User not found.' });
    if (!user.emailVerifiedAt) return res.status(409).json({ message: 'User must verify their email before admin approval.' });
    user.approvalStatus = status;
    if (status === 'rejected') user.refreshTokenHash = undefined;
    await user.save();
    await audit(req, `account_${status}`, user._id, { targetUsername: user.username });
    if (status === 'rejected' && transporter && process.env.MAIL_FROM) {
      try { await transporter.sendMail({ from: process.env.MAIL_FROM, to: user.email, subject: 'ChatWorld registration update', text: 'Thank you for your interest in ChatWorld. We are unable to approve your registration at this time.' }); } catch { /* Generic response remains; log email delivery separately in deployment monitoring. */ }
    }
    res.json({ message: status === 'rejected' ? 'Account rejected. A generic notification will be sent when email delivery is configured.' : 'Account approved.' });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/suspension', currentUser, requireAdmin, async (req, res, next) => {
  try {
    const suspend = req.body.suspended;
    if (typeof suspend !== 'boolean') return res.status(400).json({ message: 'suspended must be true or false.' });
    const user = await User.findById(req.params.id).select('+refreshTokenHash');
    if (!user || user.role !== 'user') return res.status(404).json({ message: 'User not found.' });
    user.suspendedAt = suspend ? new Date() : null;
    user.suspensionReason = suspend ? String(req.body.reason || '').trim().slice(0, 240) : '';
    if (suspend) user.refreshTokenHash = undefined;
    await user.save();
    await audit(req, suspend ? 'account_suspended' : 'account_reactivated', user._id, { targetUsername: user.username, reasonRecorded: Boolean(user.suspensionReason) });
    res.json({ message: suspend ? 'Account suspended.' : 'Account reactivated.' });
  } catch (error) { next(error); }
});
router.get('/admin/audit', currentUser, requireAdmin, async (_req, res, next) => {
  try {
    const events = await AuditEvent.find().sort({ createdAt: -1 }).limit(100).populate('actorId', 'username displayName').lean();
    res.json({ events });
  } catch (error) { next(error); }
});
router.post('/admin/users/:id/role', currentUser, requireSuperAdmin, async (req, res, next) => {
  try {
    const role = req.body.role;
    if (!['user', 'moderator', 'super_admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (target.id === req.user.id && role !== 'super_admin') return res.status(409).json({ message: 'You cannot demote your own Super Admin account.' });
    if (target.role === 'super_admin' && role !== 'super_admin') {
      const count = await User.countDocuments({ role: 'super_admin' });
      if (count <= 1) return res.status(409).json({ message: 'The last Super Admin cannot be demoted.' });
    }
    target.role = role;
    await target.save();
    await audit(req, 'administrator_role_changed', target._id, { newRole: role });
    res.json({ message: 'Administrator role updated.' });
  } catch (error) { next(error); }
});

export async function createInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !username || !password) return;
  if (password.length < 16) throw new Error('INITIAL_ADMIN_PASSWORD must be at least 16 characters.');
  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) return;
  const raw = await User.findOne({ $or: [{ email }, { username }] });
  if (raw) throw new Error('Initial admin email/username already belongs to a non-admin account; resolve it manually.');
  await User.create({
    username, displayName: process.env.INITIAL_ADMIN_DISPLAY_NAME || 'ChatWorld Admin', email,
    passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date(), approvalStatus: 'approved', role: 'super_admin',
  });
  console.log('Initial ChatWorld admin created from environment configuration.');
}

export default router;

/* =========================================================
   Easy Approve: Front-End Prototype
   Vanilla JavaScript (ES6+). LocalStorage-backed state.

   Sections:
   1  Configuration
   2  Utilities
   3  Storage & Rich Mock Seed Data
   4  Authentication & App State
   5  Permissions & Request Helpers
   6  Workflow Engine
   7  Notifications
   8  UI Helpers, Badges, Modals, Toasts
   9  Floating 3-Dot Action Menu
   10 Table Builders & Client-Side Pagination
   11 Pages (Dashboard, My Requests, Approvals, Users, Profile, Request Details, Modify)
   12 Decision Actions & Modals
   13 Event Delegation
   14 Router & Start-up
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     1. CONFIGURATION
     ======================================================= */
  const CONFIG = {
    APPROVED_DOMAINS: ['srmtech.com', 'srmtechnologies.com'],
    MIN_DEADLINE_DAYS: 2,
    MAX_REASSIGN: 2,
    MAX_ATTACHMENTS: 4,
    MAX_FILE_BYTES: 10 * 1024 * 1024,
    ALLOWED_EXT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'],
    VERTICALS: [
      'Automotive & Mobility',
      'Digital & Enterprise IT',
      'Industrial & Semiconductor',
      'Healthcare & Life Sciences',
      'Corporate Functions'
    ],
    APPROVAL_TYPES: ['Expense Request', 'Travel Request', 'Process Change', 'Creative Approval', 'Other'],
    BUDGET_OPTIONS: ['Yes', 'No', 'Partially'],
    ROLES: ['user', 'admin'],
    PAGE_SIZE: 6
  };
  const DOMAIN_TEXT = CONFIG.APPROVED_DOMAINS.map(d => '@' + d).join(' or ');
  const DAY = 864e5;

  const approversByGroup = {
    "SRM Hospital": [
      {
        name: "Dr. Arun Kumar",
        email: "arun.kumar.hospital@example.com"
      },
      {
        name: "Dr. Priya Nair",
        email: "priya.nair.hospital@example.com"
      }
    ],

    "SRM University": [
      {
        name: "Priya Raman",
        email: "priya.raman.university@example.com"
      },
      {
        name: "Sanjay Kumar",
        email: "sanjay.kumar.university@example.com"
      }
    ],

    "Global Holdings": [
      {
        name: "Rajesh Menon",
        email: "rajesh.menon.global@example.com"
      },
      {
        name: "Ananya Shah",
        email: "ananya.shah.global@example.com"
      }
    ],

    "SRM Tech": [
      {
        name: "Karthik Subramanian",
        email: "karthik.subramanian@srmtech.com"
      },
      {
        name: "Demo User",
        email: "user@srmtech.com"
      },
      {
        name: "Vignesh Raj",
        email: "vignesh.raj@srmtech.com"
      }
    ],

    "Puthiya Thalaimurai": [
      {
        name: "Suresh Balaji",
        email: "suresh.balaji.pt@example.com"
      },
      {
        name: "Divya Mohan",
        email: "divya.mohan.pt@example.com"
      }
    ],

    "SRM MHS": [
      {
        name: "Meena Krishnan",
        email: "meena.krishnan.mhs@example.com"
      },
      {
        name: "Ravi Shankar",
        email: "ravi.shankar.mhs@example.com"
      }
    ]
  };

  const GROUPS = Object.keys(approversByGroup);

  const KEYS = {
    users: 'srm_ap_users',
    requests: 'srm_ap_requests',
    notifications: 'srm_ap_notifications',
    settings: 'srm_ap_settings',
    session: 'srm_ap_session',
    emails: 'srm_ap_emails',
    tokens: 'srm_ap_tokens',
    otps: 'srm_ap_otps'
  };

  const STATUS = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING APPROVAL',
    MOD_REQUIRED: 'MODIFICATION REQUIRED',
    CLARIFY_REQUIRED: 'CLARIFICATION REQUIRED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN'
  };

  const ACTIVE_STATUSES = ['PENDING APPROVAL', 'Pending', 'Re-assigned'];
  const OPEN_STATUSES = ['PENDING APPROVAL', 'Pending', 'Re-assigned', 'MODIFICATION REQUIRED', 'Under Modification', 'CLARIFICATION REQUIRED', 'Clarification Required'];

  const STATUS_CONFIG = {
    'PENDING APPROVAL': { cls: 'badge-pending', icon: 'fa-regular fa-clock', label: 'Pending Approval' },
    'MODIFICATION REQUIRED': { cls: 'badge-modify', icon: 'fa-solid fa-pen-to-square', label: 'Modification Required' },
    'CLARIFICATION REQUIRED': { cls: 'badge-clarify', icon: 'fa-solid fa-circle-question', label: 'Clarification Required' },
    'APPROVED': { cls: 'badge-approved', icon: 'fa-solid fa-circle-check', label: 'Approved' },
    'REJECTED': { cls: 'badge-rejected', icon: 'fa-solid fa-circle-xmark', label: 'Rejected' },
    'WITHDRAWN': { cls: 'badge-withdrawn', icon: 'fa-solid fa-ban', label: 'Withdrawn' },
    'DRAFT': { cls: 'badge-draft', icon: 'fa-regular fa-file', label: 'Draft' },

    // Backward-compatibility aliases
    'Pending': { cls: 'badge-pending', icon: 'fa-regular fa-clock', label: 'Pending Approval' },
    'Approved': { cls: 'badge-approved', icon: 'fa-solid fa-circle-check', label: 'Approved' },
    'Rejected': { cls: 'badge-rejected', icon: 'fa-solid fa-circle-xmark', label: 'Rejected' },
    'Clarification Required': { cls: 'badge-clarify', icon: 'fa-solid fa-circle-question', label: 'Clarification Required' },
    'Re-assigned': { cls: 'badge-reassigned', icon: 'fa-solid fa-user-gear', label: 'Pending (Delegated)' },
    'Withdrawn': { cls: 'badge-withdrawn', icon: 'fa-solid fa-ban', label: 'Withdrawn' },
    'Under Modification': { cls: 'badge-modify', icon: 'fa-solid fa-pen-to-square', label: 'Modification Required' }
  };

  const ADMIN_PAGES = ['users', 'profile-card', 'settings'];
  const PAGE_TITLES = {
    dashboard: 'Executive Dashboard',
    notifications: 'Notifications & Alerts',
    create: 'Create Approval Request',
    'my-requests': 'My Requests',
    approvals: 'Approval List',
    users: 'Groups & User Directory',
    'profile-card': 'Admin Profile Card',
    profile: 'User Profile & Preferences',
    request: 'Request Details',
    modify: 'Modify Approval Request',
    'view-request': 'Secure View-Only Request',
    'take-action': 'Approver Identity Verification'
  };

  /* =======================================================
     2. UTILITIES
     ======================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uniq = a => Array.from(new Set(a));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fmtINR = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isApprovedEmail = v => CONFIG.APPROVED_DOMAINS.includes(String(v).split('@')[1]);
  const parseEmails = text => uniq(String(text || '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean));
  const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  // Sandbox demo "today" can be advanced from Dashboard
  const now = () => new Date(Date.now() + (DB.settings.dayOffset || 0) * DAY);
  const ts = () => now().getTime();
  const isoDate = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const todayISO = () => isoDate(now());
  const parseISO = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const addDaysISO = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY);
  const minDeadlineISO = () => addDaysISO(todayISO(), CONFIG.MIN_DEADLINE_DAYS);
  const fmtDate = s => {
    if (!s) return '';
    try {
      const d = typeof s === 'number' ? new Date(s) : parseISO(s);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(s);
    }
  };
  const fmtDateTime = t => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function randomCode(n) {
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < n; i++) {
      let r;
      try { const a = new Uint32Array(1); crypto.getRandomValues(a); r = a[0]; } catch (e) { r = Math.floor(Math.random() * 4294967295); }
      out += A[r % A.length];
    }
    return out;
  }
  const newApprovalRef = () => 'APR-' + randomCode(4) + '-' + randomCode(4);

  /* =======================================================
     SECURITY & TOKEN SERVICE (Time-limited Signed Tokens)
     ======================================================= */
  const SecurityService = {
    createToken(type, payload, expiresInMs = 7 * DAY) {
      const tokenObj = {
        id: 'tok_' + uid(),
        type: type, // 'VIEW_REQUEST', 'TAKE_ACTION', 'VIEW_ATTACHMENT'
        payload: payload,
        createdAt: ts(),
        expiresAt: ts() + expiresInMs,
        revoked: false
      };
      DB.tokens = DB.tokens || [];
      DB.tokens.push(tokenObj);
      persist();
      try {
        return btoa(unescape(encodeURIComponent(JSON.stringify({ id: tokenObj.id, type, exp: tokenObj.expiresAt }))));
      } catch (e) {
        return tokenObj.id;
      }
    },

    verifyToken(tokenStr, expectedType) {
      if (!tokenStr) return { ok: false, error: 'Missing security token.' };
      try {
        let tokenId = tokenStr;
        let decodedType = expectedType;
        let exp = null;

        try {
          const parsed = JSON.parse(decodeURIComponent(escape(atob(tokenStr))));
          if (parsed && parsed.id) {
            tokenId = parsed.id;
            decodedType = parsed.type || decodedType;
            exp = parsed.exp;
          }
        } catch (e) {
          tokenId = tokenStr;
        }

        if (exp && ts() > exp) {
          return { ok: false, error: 'This security link has expired.' };
        }

        DB.tokens = DB.tokens || [];
        const found = DB.tokens.find(t => t.id === tokenId);
        if (!found) {
          return { ok: false, error: 'Invalid or unrecognized security link.' };
        }
        if (found.revoked) {
          return { ok: false, error: 'This action link has been revoked or superseded by a newer revision.' };
        }
        if (found.expiresAt && ts() > found.expiresAt) {
          return { ok: false, error: 'Security link has expired.' };
        }
        if (expectedType && found.type !== expectedType) {
          return { ok: false, error: 'Token scope does not grant access to this action.' };
        }
        return { ok: true, payload: found.payload, tokenObj: found };
      } catch (e) {
        return { ok: false, error: 'Invalid security link format.' };
      }
    },

    revokeTokensForRequest(requestId, types = ['TAKE_ACTION']) {
      DB.tokens = DB.tokens || [];
      DB.tokens.forEach(t => {
        if (t.payload && t.payload.requestId === requestId && types.includes(t.type)) {
          t.revoked = true;
        }
      });
      persist();
    }
  };

  /* =======================================================
     OTP SERVICE (Approver 2FA & Verification)
     ======================================================= */
  const OTPService = {
    MAX_ATTEMPTS: 3,
    EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
    COOLDOWN_MS: 30 * 1000, // 30 seconds

    generateForApprover(approverEmail, req) {
      DB.otps = DB.otps || {};
      const nowMs = ts();
      const existing = DB.otps[approverEmail + '_' + req.id];
      if (existing && existing.cooldownUntil && nowMs < existing.cooldownUntil) {
        const waitSec = Math.ceil((existing.cooldownUntil - nowMs) / 1000);
        return { ok: false, error: 'Please wait ' + waitSec + 's before requesting another OTP.' };
      }

      let code = '';
      try {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        code = String(1000 + (arr[0] % 9000));
      } catch (e) {
        code = String(Math.floor(1000 + Math.random() * 9000));
      }

      const otpRecord = {
        email: approverEmail,
        requestId: req.id,
        version: req.version,
        code: code,
        attempts: 0,
        createdAt: nowMs,
        expiresAt: nowMs + this.EXPIRY_MS,
        cooldownUntil: nowMs + this.COOLDOWN_MS,
        verified: false
      };

      DB.otps[approverEmail + '_' + req.id] = otpRecord;
      persist();

      // Send OTP delivery notification via EmailService
      EmailService.sendEmail({
        to: approverEmail,
        subject: 'Security Code: ' + code + ' for EasyApprove Action on ' + req.number,
        template: 'otp_delivery',
        data: {
          request: req,
          approverEmail: approverEmail,
          approverName: req.approverName,
          otpCode: code,
          expiresInMinutes: 10
        }
      });

      return { ok: true, code: code, expiresAt: otpRecord.expiresAt };
    },

    verify(approverEmail, requestId, enteredCode, currentReqVersion) {
      DB.otps = DB.otps || {};
      const key = approverEmail + '_' + requestId;
      const rec = DB.otps[key];
      const nowMs = ts();

      // Configurable demo test code
      const isDemoMasterCode = (enteredCode === '1111');

      if (!rec && !isDemoMasterCode) {
        return { ok: false, error: 'No active OTP verification session found. Click "Send OTP" to receive a code.' };
      }

      if (rec) {
        if (currentReqVersion && rec.version !== currentReqVersion) {
          return { ok: false, error: 'This OTP was issued for an older revision. Please request a new OTP.' };
        }
        if (rec.verified) {
          return { ok: false, error: 'This OTP code has already been verified and consumed.' };
        }
        if (nowMs > rec.expiresAt) {
          return { ok: false, error: 'This OTP code has expired. Please request a fresh code.' };
        }
        if (rec.attempts >= this.MAX_ATTEMPTS) {
          return { ok: false, error: 'Maximum attempts exceeded for this code. Please request a new OTP.' };
        }

        if (rec.code !== enteredCode && !isDemoMasterCode) {
          rec.attempts += 1;
          persist();
          const left = this.MAX_ATTEMPTS - rec.attempts;
          return { ok: false, error: 'Invalid verification code. ' + (left > 0 ? left + ' attempt(s) remaining.' : 'Attempts locked.') };
        }

        rec.verified = true;
        persist();
      }

      return { ok: true };
    }
  };

  /* =======================================================
     EMAIL NOTIFICATION SERVICE (Audit-Compliant Dispatcher)
     ======================================================= */
  const EmailService = {
    sendEmail(opts) {
      const { to, cc, subject, template, data } = opts;
      if (!to) return { ok: false, error: 'Recipient email required' };

      const emailId = 'em_' + uid();
      const sentTime = ts();
      const req = data.request || null;

      // Generate secure view link
      const viewToken = req ? SecurityService.createToken('VIEW_REQUEST', {
        requestId: req.id,
        email: to,
        version: req.version
      }) : '';

      // Generate special take action link ONLY for assigned approver
      const actionToken = (req && to === req.approverEmail) ? SecurityService.createToken('TAKE_ACTION', {
        requestId: req.id,
        email: to,
        version: req.version
      }) : '';

      const viewUrl = req ? location.origin + location.pathname + '#/view-request/' + req.id + '?token=' + encodeURIComponent(viewToken) : '';
      const actionUrl = actionToken ? location.origin + location.pathname + '#/take-action/' + req.id + '?token=' + encodeURIComponent(actionToken) : '';

      const renderedHtml = EmailService.renderTemplate(template, Object.assign({}, data, {
        viewUrl, actionUrl, sentTime, subject, to, cc
      }));

      const emailRecord = {
        id: emailId,
        to: to,
        cc: cc || '',
        subject: subject,
        template: template,
        requestId: req ? req.id : null,
        requestNumber: req ? req.number : null,
        requestTitle: req ? req.title : null,
        viewUrl: viewUrl,
        actionUrl: actionUrl,
        html: renderedHtml,
        status: 'Delivered',
        sentAt: sentTime,
        retries: 0
      };

      DB.emails = DB.emails || [];
      DB.emails.unshift(emailRecord);
      persist();

      const outboxCountEl = $('#outbox-count');
      if (outboxCountEl) {
        outboxCountEl.textContent = DB.emails.length;
        outboxCountEl.classList.remove('hidden');
      }

      return { ok: true, email: emailRecord };
    },

    renderTemplate(template, d) {
      const r = d.request || {};
      const formatAmount = r.amount ? fmtINR(r.amount) : 'N/A';
      const deadlineFormatted = r.deadline ? fmtDate(r.deadline) : 'N/A';

      const commonHeader = `
        <div style="background:#0F172A;padding:24px 32px;border-radius:12px 12px 0 0;text-align:left;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="background:#2563EB;color:#fff;width:34px;height:34px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;">EA</div>
            <span style="color:#FFFFFF;font-family:Inter,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Easy Approve</span>
          </div>
          <p style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:6px 0 0 0;font-family:Inter,sans-serif;">SRM Technologies Enterprise Workflow Suite</p>
        </div>
      `;

      const commonFooter = `
        <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;border-radius:0 0 12px 12px;font-family:Inter,sans-serif;font-size:11px;color:#64748B;line-height:1.6;">
          <p style="margin:0;">This is an automated regulatory audit notification from SRM EasyApprove. Please do not reply directly to this message.</p>
          <p style="margin:4px 0 0 0;">&copy; 2026 SRM Technologies. All activity is logged and retained under ISO-27001 audit standards.</p>
        </div>
      `;

      const detailsTable = r.id ? `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;font-size:13px;">
            <tr>
              <td style="padding:6px 0;color:#64748B;width:35%;font-weight:500;">Proposal Number:</td>
              <td style="padding:6px 0;color:#0F172A;font-weight:700;font-family:monospace;">${esc(r.number)} (Rev v${r.version || 1})</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;font-weight:500;">Request Title:</td>
              <td style="padding:6px 0;color:#0F172A;font-weight:600;">${esc(r.title)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;font-weight:500;">Requester:</td>
              <td style="padding:6px 0;color:#0F172A;">${esc(r.requesterName)} &lt;${esc(r.requesterEmail)}&gt;</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;font-weight:500;">Assigned Approver:</td>
              <td style="padding:6px 0;color:#0F172A;">${esc(r.approverName)} &lt;${esc(r.approverEmail)}&gt;</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;font-weight:500;">Expected Amount:</td>
              <td style="padding:6px 0;color:#0F172A;font-weight:700;font-family:monospace;">${formatAmount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;font-weight:500;">Decision Deadline:</td>
              <td style="padding:6px 0;color:#B45309;font-weight:600;">${deadlineFormatted}</td>
            </tr>
            ${r.ccEmail ? `<tr><td style="padding:6px 0;color:#64748B;font-weight:500;">Marked CC:</td><td style="padding:6px 0;color:#475569;">${esc(r.ccEmail)}</td></tr>` : ''}
            ${r.stakeholders && r.stakeholders.length ? `<tr><td style="padding:6px 0;color:#64748B;font-weight:500;">Stakeholders:</td><td style="padding:6px 0;color:#475569;">${esc(r.stakeholders.join(', '))}</td></tr>` : ''}
            ${r.attachments && r.attachments.length ? `<tr><td style="padding:6px 0;color:#64748B;font-weight:500;">Attachments:</td><td style="padding:6px 0;color:#2563EB;">${esc(r.attachments.map(a => a.name).join(', '))}</td></tr>` : ''}
          </table>
        </div>
      ` : '';

      let bodyContent = '';

      if (template === 'otp_delivery') {
        bodyContent = `
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 12px 0;">Security Verification Code (OTP)</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px 0;">
            A sign-off action has been initiated for <b>${esc(r.title)}</b> (${esc(r.number)}). Enter the one-time security code below to authorize your approver session:
          </p>
          <div style="background:#EFF6FF;border:2px dashed #3B82F6;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-family:monospace;font-size:32px;font-weight:800;letter-spacing:0.35em;color:#1E40AF;">${esc(d.otpCode)}</span>
            <p style="margin:8px 0 0 0;font-size:12px;color:#60A5FA;">Valid for ${d.expiresInMinutes || 10} minutes · Single-use authentication</p>
          </div>
          <p style="font-size:12px;color:#64748B;line-height:1.5;">If you did not initiate this approval action, please notify corporate security immediately at security@srmtech.com.</p>
        `;
      } else if (template === 'submission' || template === 'resubmitted') {
        const isResub = template === 'resubmitted';
        bodyContent = `
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">
            ${isResub ? 'Request Resubmitted for Approval (Revision v' + (r.version || 2) + ')' : 'New Approval Request Submitted'}
          </h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            ${isResub ? 'Requester ' + esc(r.requesterName) + ' has submitted a revised proposal with updated records and changes.' : 'A formal request has been placed into your approval chain and requires governance review.'}
          </p>
          ${detailsTable}
          <div style="margin:24px 0;text-align:left;">
            ${d.actionUrl ? `
              <a href="${esc(d.actionUrl)}" style="background:#2563EB;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;margin-right:12px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                TAKE ACTION (Approver OTP) &rarr;
              </a>
            ` : ''}
            <a href="${esc(d.viewUrl)}" style="background:#F1F5F9;color:#334155;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;border:1px solid #CBD5E1;">
              View Request (Read-Only)
            </a>
          </div>
        `;
      } else if (template === 'reminder') {
        bodyContent = `
          <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
            <b style="color:#92400E;font-size:13px;">High-Priority Approval Reminder</b>
          </div>
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Approver Reminder: ${esc(r.number)}</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            This is a sign-off reminder from <b>${esc(r.requesterName)}</b> regarding proposal <b>${esc(r.title)}</b>. Your decision is requested before <b>${deadlineFormatted}</b>.
          </p>
          ${detailsTable}
          <div style="margin:24px 0;">
            ${d.actionUrl ? `
              <a href="${esc(d.actionUrl)}" style="background:#2563EB;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;margin-right:12px;">
                TAKE ACTION NOW &rarr;
              </a>
            ` : ''}
            <a href="${esc(d.viewUrl)}" style="background:#F1F5F9;color:#334155;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;border:1px solid #CBD5E1;">
              View Details (Read-Only)
            </a>
          </div>
        `;
      } else if (template === 'modify_reopened') {
        bodyContent = `
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Request Reopened for Modification</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Request <b>${esc(r.number)}</b> (${esc(r.title)}) was reopened by <b>${esc(r.requesterName)}</b> for modifications.
          </p>
          <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;color:#92400E;">
            <b>Workflow Status:</b> Active approval review is paused. The proposal will return to the approver once the requester submits revised records.
          </div>
          ${detailsTable}
          <a href="${esc(d.viewUrl)}" style="background:#2563EB;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;margin-top:10px;">
            View Request Record
          </a>
        `;
      } else if (template === 'withdraw') {
        bodyContent = `
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Request Withdrawn by Requester</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Requester <b>${esc(r.requesterName)}</b> has formally withdrawn proposal <b>${esc(r.number)}</b> (${esc(r.title)}).
          </p>
          <div style="background:#F1F5F9;border-left:4px solid #64748B;padding:14px;border-radius:4px;margin:16px 0;">
            <b style="color:#0F172A;font-size:13px;">Mandatory Withdrawal Reason:</b>
            <p style="color:#475569;font-size:13px;margin:6px 0 0 0;font-style:italic;">"${esc(d.reason || r.withdrawReason || 'No reason specified.')}"</p>
          </div>
          ${detailsTable}
          <a href="${esc(d.viewUrl)}" style="background:#64748B;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">
            View Archived Record
          </a>
        `;
      } else if (template === 'approved') {
        bodyContent = `
          <div style="background:#DCFCE7;border-left:4px solid #16A34A;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
            <b style="color:#15803D;font-size:13px;">Official Authorization Confirmation</b>
          </div>
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Request Approved: ${esc(r.number)}</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Proposal <b>${esc(r.title)}</b> has been officially approved by <b>${esc(d.approverName || r.approverName)}</b>.
          </p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:16px 0;">
            <div style="font-family:monospace;font-size:14px;font-weight:700;color:#166534;margin-bottom:8px;">Unique Approval Number: ${esc(d.approvalNumber || r.approvalRef)}</div>
            <div style="font-size:13px;color:#15803D;"><b>Approval Reason:</b> "${esc(d.reason || 'Approved as submitted.')}"</div>
          </div>
          ${detailsTable}
          <a href="${esc(d.viewUrl)}" style="background:#16A34A;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">
            View Approved Record &rarr;
          </a>
        `;
      } else if (template === 'clarification') {
        bodyContent = `
          <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
            <b style="color:#92400E;font-size:13px;">Clarification Required from Approver</b>
          </div>
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Clarification Requested: ${esc(r.number)}</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Approver <b>${esc(d.approverName || r.approverName)}</b> has reviewed proposal <b>${esc(r.title)}</b> and requested additional clarification:
          </p>
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin:16px 0;">
            <b style="color:#92400E;font-size:13px;">Approver Inquiry &amp; Comments:</b>
            <p style="color:#78350F;font-size:13px;margin:6px 0 0 0;line-height:1.5;">${esc(d.clarificationText || '')}</p>
          </div>
          ${detailsTable}
          <a href="${esc(d.viewUrl)}" style="background:#D97706;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">
            Open Request to Respond &amp; Resubmit
          </a>
        `;
      } else if (template === 'rejected') {
        bodyContent = `
          <div style="background:#FEE2E2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
            <b style="color:#991B1B;font-size:13px;">Proposal Decision: Rejected</b>
          </div>
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Proposal Rejected: ${esc(r.number)}</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Proposal <b>${esc(r.title)}</b> was rejected by <b>${esc(d.approverName || r.approverName)}</b>.
          </p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:16px 0;">
            <b style="color:#991B1B;font-size:13px;">Rejection Justification:</b>
            <p style="color:#7F1D1D;font-size:13px;margin:6px 0 0 0;line-height:1.5;">${esc(d.reason || 'Proposal rejected.')}</p>
            ${d.files && d.files.length ? `
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #FECACA;font-size:12px;color:#991B1B;">
                <b>Supporting Documentation Enclosed (${d.files.length}):</b>
                <ul style="margin:4px 0 0 0;padding-left:18px;">
                  ${d.files.map(f => '<li>' + esc(f.name) + ' (' + fmtSize(f.size) + ')</li>').join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          ${detailsTable}
          <a href="${esc(d.viewUrl)}" style="background:#64748B;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">
            View Rejection Record
          </a>
        `;
      } else if (template === 'reassigned') {
        bodyContent = `
          <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px 0;">Approval Authority Reassigned</h2>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
            Approval responsibility for proposal <b>${esc(r.title)}</b> has been delegated to <b>${esc(d.toName)}</b> &lt;${esc(d.toEmail)}&gt;.
          </p>
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:8px;padding:16px;margin:16px 0;">
            <div style="font-size:13px;color:#3730A3;"><b>Revised Proposal Reference:</b> <span style="font-family:monospace;font-weight:bold;">${esc(d.newNumber || r.number)}</span></div>
            <div style="font-size:13px;color:#3730A3;margin-top:4px;"><b>Revised Cutoff Deadline:</b> ${fmtDate(d.newDeadline)}</div>
            <div style="font-size:13px;color:#4338CA;margin-top:8px;"><b>Reassignment Justification:</b> "${esc(d.reason || 'Delegated responsibility')}"</div>
          </div>
          ${detailsTable}
          <div style="margin:20px 0;">
            ${d.actionUrl ? `
              <a href="${esc(d.actionUrl)}" style="background:#4F46E5;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;margin-right:12px;">
                TAKE ACTION (New Approver Link) &rarr;
              </a>
            ` : ''}
            <a href="${esc(d.viewUrl)}" style="background:#F1F5F9;color:#334155;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;border:1px solid #CBD5E1;">
              View Details
            </a>
          </div>
        `;
      }

      return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(d.subject)}</title></head><body style="margin:0;padding:24px;background:#F1F5F9;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;"><div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8F0;overflow:hidden;">${commonHeader}<div style="padding:32px 32px 24px 32px;font-family:Inter,system-ui,sans-serif;">${bodyContent}</div>${commonFooter}</div></body></html>`;
    }
  };

  /* =======================================================
     3. STORAGE & RICH MOCK SEED DATA
     ======================================================= */
  const DB = {
    users: [],
    requests: [],
    notifications: [],
    emails: [],
    tokens: [],
    otps: {},
    settings: { seq: 0, dayOffset: 0, seeded: false, v: 4 }
  };

  const readKey = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  function persist() {
    try {
      localStorage.setItem(KEYS.users, JSON.stringify(DB.users));
      localStorage.setItem(KEYS.requests, JSON.stringify(DB.requests));
      localStorage.setItem(KEYS.notifications, JSON.stringify(DB.notifications));
      localStorage.setItem(KEYS.settings, JSON.stringify(DB.settings));
      localStorage.setItem(KEYS.emails, JSON.stringify(DB.emails));
      localStorage.setItem(KEYS.tokens, JSON.stringify(DB.tokens));
      localStorage.setItem(KEYS.otps, JSON.stringify(DB.otps));
    } catch (e) {
      toast('Could not save to localStorage. Changes will be lost on reload.', 'error');
    }
  }

  function loadDB() {
    DB.users = readKey(KEYS.users, []);
    DB.requests = readKey(KEYS.requests, []);
    DB.notifications = readKey(KEYS.notifications, []);
    DB.emails = readKey(KEYS.emails, []);
    DB.tokens = readKey(KEYS.tokens, []);
    DB.otps = readKey(KEYS.otps, {});
    DB.settings = Object.assign({ seq: 0, dayOffset: 0, seeded: false, v: 4 }, readKey(KEYS.settings, {}));
    if (!DB.users.length || !DB.requests.length || (DB.settings.v || 0) < 4) {
      seedDemoData();
    }
  }


  function seedDemoData() {
    state.isSeeding = true;
    const mkUser = (id, name, email, designation, vertical, role) => ({ id, name, email, password: '123', designation, vertical, role, active: true, altEmail: '' });
    DB.users = [
      mkUser('u_user', 'Demo User', 'user@srmtech.com', 'Senior Business Analyst', CONFIG.VERTICALS[1], 'user'),
      mkUser('u_admin', 'Demo Admin', 'admin@srmtech.com', 'VP & Head of Operations', CONFIG.VERTICALS[4], 'admin'),
      mkUser('u_priya', 'Priya Nair', 'priya.nair@srmtech.com', 'Senior Project Manager', CONFIG.VERTICALS[0], 'user'),
      mkUser('u_karthik', 'Karthik Raman', 'karthik.raman@srmtech.com', 'Corporate Finance Controller', CONFIG.VERTICALS[4], 'admin'),
      mkUser('u_rajesh', 'Dr. Rajesh Varma', 'rajesh.varma@srmtech.com', 'Lead Clinical Systems Specialist', CONFIG.VERTICALS[3], 'user'),
      mkUser('u_ananya', 'Ananya Deshmukh', 'ananya.deshmukh@srmtech.com', 'Semiconductor Engineering Lead', CONFIG.VERTICALS[2], 'admin'),
      mkUser('u_vikram', 'Vikram Seth', 'vikram.seth@srmtech.com', 'Senior DevOps & Cloud Architect', CONFIG.VERTICALS[1], 'user'),
      mkUser('u_meera', 'Meera Krishnan', 'meera.krishnan@srmtech.com', 'Head of Brand & Digital Marketing', CONFIG.VERTICALS[4], 'user')
    ];
    DB.requests = [];
    DB.notifications = [];
    DB.settings = { seq: 100, dayOffset: 0, seeded: true, v: 4 };

    const byEmail = e => DB.users.find(u => u.email === e) || { name: e.split('@')[0], vertical: 'Corporate Functions' };
    const actor = e => ({ name: byEmail(e).name, email: e });
    const base = (requester, approver, o) => Object.assign({
      requesterName: byEmail(requester).name, requesterEmail: requester, vertical: byEmail(requester).vertical, ccEmail: '',
      approverEmail: approver, approverName: byEmail(approver).name, stakeholders: [], attachments: [], budgeted: 'Yes', amountBudgeted: 0, extraReason: ''
    }, o);
    const T = n => addDaysISO(todayISO(), n);

    // 1. Pending - High-Performance Laptops
    wfCreate(base('user@srmtech.com', 'admin@srmtech.com', {
      title: 'High-Performance Developer Workstations (2 Units)',
      type: 'Expense Request', amount: 185000, budgeted: 'Partially', amountBudgeted: 150000,
      extraReason: 'Custom order equipped with 32GB Unified RAM & 1TB NVMe SSD for deep learning workflow.',
      deadline: T(5), stakeholders: ['priya.nair@srmtech.com', 'vikram.seth@srmtech.com'],
      details: 'Two 15-inch Apple Silicon workstations for new data science hires onboarding next month. Official hardware quotation enclosed.',
      reason: 'Standard issue hardware is insufficient for parallel dockerized data pipeline compilation.',
      attachments: [{ name: 'macbook-vendor-quote.pdf', size: 245000 }, { name: 'hardware-spec-sheet.xlsx', size: 82000 }]
    }), actor('user@srmtech.com'));

    // 2. Pending - Automotive CAN Bus Diagnostic Toolkits
    wfCreate(base('priya.nair@srmtech.com', 'admin@srmtech.com', {
      title: 'Automotive CAN Bus Hardware Diagnostic Toolkits',
      type: 'Expense Request', amount: 340000, budgeted: 'Yes', amountBudgeted: 350000,
      deadline: T(4), stakeholders: ['user@srmtech.com'],
      details: 'Four Vector VN1630A network interface diagnostic devices for high-speed CAN FD vehicle telemetry integration.',
      reason: 'OEM tier-1 client testbench validation begins in 3 weeks and mandates calibrated test equipment.',
      attachments: [{ name: 'vector-quote-2026.pdf', size: 310000 }]
    }), actor('priya.nair@srmtech.com'));

    // 3. Pending - Dedicated Cloud Host Provisioning (Due soon)
    wfCreate(base('vikram.seth@srmtech.com', 'ananya.deshmukh@srmtech.com', {
      title: 'AWS Dedicated Cloud Host Provisioning (Q4-Q1)',
      type: 'Expense Request', amount: 290000, budgeted: 'Yes', amountBudgeted: 300000,
      deadline: T(2), stakeholders: ['admin@srmtech.com'],
      details: 'Reserved dedicated EC2 c6i instances for isolated compliance testing under SOC2 Type II audit guidelines.',
      reason: 'Mandatory isolated compute requirements for upcoming client enterprise pilot deployment.'
    }), actor('vikram.seth@srmtech.com'));

    // 4. Pending - Discovery Workshop, Pune (Overdue)
    const s4 = wfCreate(base('priya.nair@srmtech.com', 'admin@srmtech.com', {
      title: 'Client Onsite Architectural Discovery Workshop, Pune',
      type: 'Travel Request', amount: 58400, budgeted: 'Yes', amountBudgeted: 60000,
      deadline: T(1), stakeholders: ['karthik.raman@srmtech.com'],
      details: 'Airfare, 3-night hotel accommodations, and local transit for lead architect to conduct onsite feasibility assessment.',
      reason: 'Mandatory contractual customer requirement prior to Phase 2 sign-off.',
      attachments: [{ name: 'travel-itinerary.pdf', size: 125000 }]
    }), actor('priya.nair@srmtech.com'));
    // Make this overdue to demonstrate overdue warnings & audits
    DB.requests[0].deadline = T(-1);

    // 5. Approved - Figma UX Tool Annual License
    const s5 = wfCreate(base('user@srmtech.com', 'admin@srmtech.com', {
      title: 'Enterprise Figma & UX Design Tool Annual License Renewal',
      type: 'Expense Request', amount: 118000, budgeted: 'Yes', amountBudgeted: 120000,
      deadline: T(6),
      details: 'Annual enterprise tier renewal covering 12 UX/UI design seats and shared corporate design system tokens.',
      reason: 'Current billing period expires at end of quarter. Critical for ongoing digital delivery.'
    }), actor('user@srmtech.com'));
    wfApprove(s5, 'Approved. All line items are within the quarterly allocated software budget.', actor('admin@srmtech.com'));

    // 6. Approved - SEMI Standards Compliance Verification Suite
    const s6 = wfCreate(base('ananya.deshmukh@srmtech.com', 'admin@srmtech.com', {
      title: 'SEMI Standards Compliance Verification Tooling Suite',
      type: 'Expense Request', amount: 875000, budgeted: 'Yes', amountBudgeted: 900000,
      deadline: T(7),
      details: 'Subscription for automated semiconductor cleanroom protocol and wafer fabrication compliance checking software.',
      reason: 'Required for ISO/SEMI S2 safety verification certification for cleanroom deployment.'
    }), actor('ananya.deshmukh@srmtech.com'));
    wfApprove(s6, 'Verified against industrial equipment capital allocation. Authorized for procurement.', actor('admin@srmtech.com'));

    // 7. Approved - ISO-13485 Medical Device Audit Readiness Consultancy
    const s7 = wfCreate(base('rajesh.varma@srmtech.com', 'karthik.raman@srmtech.com', {
      title: 'ISO-13485 Medical Device Audit Readiness Consultancy',
      type: 'Expense Request', amount: 420000, budgeted: 'Yes', amountBudgeted: 450000,
      deadline: T(8),
      details: 'External pre-audit inspection services by TUV SUD certified quality specialists for FDA 510(k) pathway readiness.',
      reason: 'Prevents non-conformance findings during upcoming FDA accreditation audit.'
    }), actor('rajesh.varma@srmtech.com'));
    wfApprove(s7, 'Approved. Critical regulatory gate for Life Sciences vertical.', actor('karthik.raman@srmtech.com'));

    // 8. Approved - Detroit Auto Tech Expo Flight Bookings
    const s8 = wfCreate(base('priya.nair@srmtech.com', 'admin@srmtech.com', {
      title: 'International Travel & Delegate Passes: Detroit Auto Tech Expo',
      type: 'Travel Request', amount: 312000, budgeted: 'Partially', amountBudgeted: 280000,
      extraReason: 'Additional booth representation fee included due to speaking opportunity.',
      deadline: T(10),
      details: 'Roundtrip flights, conference passes, and 4 nights hotel for two team delegates presenting connected vehicle security paper.',
      reason: 'Key automotive industry forum for executive client networking and partnership meetings.'
    }), actor('priya.nair@srmtech.com'));
    wfApprove(s8, 'Approved with minor travel buffer variance. Strategic client opportunity.', actor('admin@srmtech.com'));

    // 9. Rejected - Annual Team Strategy Offsite
    const s9 = wfCreate(base('user@srmtech.com', 'karthik.raman@srmtech.com', {
      title: 'Annual Team Strategy Offsite at Luxury Beach Resort',
      type: 'Expense Request', amount: 450000, budgeted: 'No', amountBudgeted: 0,
      extraReason: 'Unplanned requirement initiated after post-merger integration mandate.',
      deadline: T(7),
      details: 'Two-day residential conference for 30 cross-functional leaders at Radisson Resort, Mahabalipuram.',
      reason: 'In-person team alignment needed to finalize 2026 product roadmaps.'
    }), actor('user@srmtech.com'));
    wfReject(s9, 'Corporate discretionary offsite spending is temporarily frozen until Q1 budget review. Please reconsider virtual alternatives or resubmit next fiscal.', [], actor('karthik.raman@srmtech.com'));

    // 10. Rejected - Micro-Lab Oscilloscope (Rejected by Non-Action)
    const s10 = wfCreate(base('ananya.deshmukh@srmtech.com', 'admin@srmtech.com', {
      title: 'Standalone Micro-Lab Mixed Signal Oscilloscope (4 Channels)',
      type: 'Expense Request', amount: 165000, budgeted: 'Yes', amountBudgeted: 180000,
      deadline: T(-3),
      details: 'Keysight InfiniiVision 100MHz digital storage oscilloscope for micro-soldering bench test repairs.',
      reason: 'Old oscilloscope displays intermittent trigger noise.'
    }), actor('ananya.deshmukh@srmtech.com'));
    s10.status = 'Rejected';
    s10.nonAction = true;
    s10.decision = { type: 'Rejected', by: 'System Auditor', email: '', at: ts() - 2 * DAY, reason: 'Automatically closed due to non-action before the deadline (' + fmtDate(T(-3)) + ').', files: [] };
    addTimeline(s10, { name: 'System Auditor' }, 'Rejected by Non-Action', 'Sign-off deadline elapsed with no formal approver decision.');

    // 11. Clarification Required - Q4 Regional Brand Campaign
    const s11 = wfCreate(base('meera.krishnan@srmtech.com', 'admin@srmtech.com', {
      title: 'Q4 Regional Brand Campaign & Media Creative Assets Package',
      type: 'Creative Approval', amount: 175000, budgeted: 'Partially', amountBudgeted: 140000,
      extraReason: 'Added multi-language voiceovers for Kannada and Telugu regional distributions.',
      deadline: T(4),
      details: 'Production package including master 4K commercial cut, six social carousel assets, and programmatic display banners.',
      reason: 'Broadcast media slot booked for next week.',
      attachments: [{ name: 'creative-storyboard.pdf', size: 1420000 }]
    }), actor('meera.krishnan@srmtech.com'));
    wfClarify(s11, 'Please attach the specific cost breakdown from the external audio studio for the regional localized cuts before final sign-off.', actor('admin@srmtech.com'));

    // 12. Clarification Required - Cloud Multi-Region Failover Setup
    const s12 = wfCreate(base('vikram.seth@srmtech.com', 'ananya.deshmukh@srmtech.com', {
      title: 'Cloud Database High-Availability Multi-Region Failover Architecture',
      type: 'Process Change', amount: 560000, budgeted: 'Yes', amountBudgeted: 600000,
      deadline: T(5),
      details: 'Migrate single-region Aurora PostgreSQL clusters to Global Database setup with cross-region replication to Mumbai and Singapore.',
      reason: 'Enhance disaster recovery RTO from 4 hours down to under 5 minutes.'
    }), actor('vikram.seth@srmtech.com'));
    wfClarify(s12, 'Please provide the estimated network egress replication bandwidth cost model alongside the primary database instance charges.', actor('ananya.deshmukh@srmtech.com'));

    // 13. Reassigned / Delegated - Cleanroom Wafer Handling Safety Equipment
    const s13 = wfCreate(base('ananya.deshmukh@srmtech.com', 'admin@srmtech.com', {
      title: 'Cleanroom Wafer Handling Electrostatic Safety Rig Equipment',
      type: 'Expense Request', amount: 680000, budgeted: 'Yes', amountBudgeted: 700000,
      deadline: T(6),
      details: 'Anti-static conductive nitrogen dry storage cabinets and vacuum pick-up wands for Class 100 fab lab cleanrooms.',
      reason: 'Essential to prevent particulate contamination and ESD damage on 300mm silicon test wafers.'
    }), actor('ananya.deshmukh@srmtech.com'));
    wfReassign(s13, {
      name: 'Karthik Raman', email: 'karthik.raman@srmtech.com',
      deadline: T(7), reason: 'Capital expenditure exceeding ₹5L requires secondary Finance Controller sign-off.'
    }, actor('admin@srmtech.com'));

    // 14. Reassigned / Delegated - Automotive Embedded Linux Firmware Testing Rig
    const s14 = wfCreate(base('priya.nair@srmtech.com', 'admin@srmtech.com', {
      title: 'Automotive Embedded Linux Firmware Automated Testing Testbench',
      type: 'Expense Request', amount: 225000, budgeted: 'Yes', amountBudgeted: 250000,
      deadline: T(5),
      details: 'Automated Hardware-in-the-Loop (HIL) testbench with Raspberry Pi Compute Modules and logic analyzers for nightly regression runs.',
      reason: 'Manual regression tests take 18 engineering hours per release sprint.'
    }), actor('priya.nair@srmtech.com'));
    wfReassign(s14, {
      name: 'Ananya Deshmukh', email: 'ananya.deshmukh@srmtech.com',
      deadline: T(6), reason: 'Reassigned to Semiconductor & Embedded Systems Engineering Lead for technical verification.'
    }, actor('admin@srmtech.com'));

    // 15. Under Modification - Sprint Review Thursday Shift
    const s15 = wfCreate(base('user@srmtech.com', 'karthik.raman@srmtech.com', {
      title: 'Shift Global Sprint Review & Retro Cycles to Thursdays',
      type: 'Process Change', amount: 0, budgeted: 'No', amountBudgeted: 0,
      deadline: T(3),
      details: 'Transition sprint demos and retrospectives from Friday afternoons to Thursday mornings across all engineering teams.',
      reason: 'Prevents Friday release crunches and allows hotfix deployment buffer before the weekend.'
    }), actor('user@srmtech.com'));
    wfStartModify(s15, actor('user@srmtech.com'));

    // 16. Withdrawn - Legacy Oracle Database Connector Upgrade
    const s16 = wfCreate(base('vikram.seth@srmtech.com', 'admin@srmtech.com', {
      title: 'Legacy Oracle Database Connector Driver License Renewal',
      type: 'Expense Request', amount: 120000, budgeted: 'Yes', amountBudgeted: 130000,
      deadline: T(8),
      details: 'Commercial ODBC driver maintenance license for connecting legacy billing database with modern analytics lakehouse.',
      reason: 'Maintain backward data synchronization.'
    }), actor('vikram.seth@srmtech.com'));
    wfWithdraw(s16, 'Decommissioning of legacy billing server was brought forward to this month; connector is no longer required.', actor('vikram.seth@srmtech.com'));

    // Add varied notifications for rich activity
    DB.notifications.unshift({
      id: 'n_demo_1', to: 'user@srmtech.com', type: 'assigned',
      message: 'New approval request submitted: High-Performance Developer Workstations (2 Units) (SRM-2026-0101).',
      requestId: s4.id, number: 'SRM-2026-0101', at: ts() - 3600000, read: false
    });
    DB.notifications.unshift({
      id: 'n_demo_2', to: 'admin@srmtech.com', type: 'assigned',
      message: 'New action required: Automotive CAN Bus Hardware Diagnostic Toolkits from Priya Nair. Deadline ' + fmtDate(T(4)) + '.',
      requestId: DB.requests[1].id, number: DB.requests[1].number, at: ts() - 7200000, read: false
    });
    DB.notifications.unshift({
      id: 'n_demo_3', to: 'user@srmtech.com', type: 'approved',
      message: 'Request SRM-2026-0105 was officially APPROVED by Demo Admin. Reference: ' + s5.approvalRef + '.',
      requestId: s5.id, number: s5.number, at: ts() - 14400000, read: true
    });
    DB.notifications.unshift({
      id: 'n_demo_4', to: 'admin@srmtech.com', type: 'reminder',
      message: 'Deadline alert: Client Onsite Architectural Discovery Workshop, Pune is overdue.',
      requestId: s4.id, number: s4.number, at: ts() - 1800000, read: false
    });

    state.isSeeding = false;
    persist();
  }

  /* =======================================================
     4. AUTHENTICATION & APP STATE
     ======================================================= */
  const authProviders = {
    password: {
      login(email, password) {
        const u = DB.users.find(x => x.email === email);
        if (!u || u.password !== password) return { ok: false, error: 'Invalid email address or password.' };
        if (!u.active) return { ok: false, error: 'This corporate account has been deactivated. Please contact your IT administrator.' };
        return { ok: true, user: u };
      }
    }
  };

  const state = {
    sessionEmail: null,
    sessionVertical: '',
    pendingLogin: null,
    actingApprover: null,
    navState: { page: 'approvals' },
    activeMenuBtn: null,
    myFilters: { tab: 'all', q: '', page: 1 },
    apprFilters: { q: '', status: 'awaiting', type: '', page: 1 },
    userSearch: '',
    notifFilter: 'all',
    drafts: { create: { stakeholders: [], ccEmails: [], files: [] }, modify: { stakeholders: [], ccEmails: [], files: [] } },
    modal: null,
    route: { page: 'dashboard' },
    verifiedActionSessions: {}, // { [requestId]: { version: number, at: timestamp } }
    viewOnlyMode: false,
    isSeeding: false
  };

  const currentUser = () => DB.users.find(u => u.email === state.sessionEmail && u.active) || null;
  const isAdmin = () => { const u = currentUser(); return !!u && u.role === 'admin'; };
  const actorOf = u => ({ name: u.name, email: u.email });
  const me = () => actorOf(currentUser());

  function restoreSession() {
    const s = readKey(KEYS.session, null);
    if (s && DB.users.some(u => u.email === s.email && u.active)) {
      state.sessionEmail = s.email;
      state.sessionVertical = s.vertical || '';
    }
  }

  function startSession(user, vertical) {
    state.sessionEmail = user.email;
    state.sessionVertical = vertical;
    state.actingApprover = null;
    try { localStorage.setItem(KEYS.session, JSON.stringify({ email: user.email, vertical: vertical })); } catch (e) { /* ignore */ }
  }

  function endSession() {
    state.sessionEmail = null;
    state.actingApprover = null;
    state.verifiedActionSessions = {};
    state.viewOnlyMode = false;
    try { localStorage.removeItem(KEYS.session); } catch (e) { /* ignore */ }
  }

  function showOtpScreen(email) {
    const credPanel = $('#login-credentials-panel');
    const otpPanel = $('#login-otp-panel');
    if (credPanel) credPanel.classList.add('hidden');
    if (otpPanel) otpPanel.classList.remove('hidden');
    const targetEmail = $('#otp-target-email');
    if (targetEmail) targetEmail.textContent = email;
    const otpErr = $('#otp-error');
    if (otpErr) {
      otpErr.classList.add('hidden');
      otpErr.textContent = '';
    }
    const otpInput = $('#login-otp');
    if (otpInput) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 50);
    }
  }

  function showCredentialsScreen() {
    state.pendingLogin = null;
    const credPanel = $('#login-credentials-panel');
    const otpPanel = $('#login-otp-panel');
    if (otpPanel) otpPanel.classList.add('hidden');
    if (credPanel) credPanel.classList.remove('hidden');
    const otpErr = $('#otp-error');
    if (otpErr) {
      otpErr.classList.add('hidden');
      otpErr.textContent = '';
    }
    const otpInput = $('#login-otp');
    if (otpInput) otpInput.value = '';
  }

  /* =======================================================
     5. PERMISSIONS & REQUEST HELPERS
     ======================================================= */
  const identityEmails = email => { const u = DB.users.find(x => x.email === email); return uniq([email, u && u.altEmail].filter(Boolean)); };
  const findReq = id => DB.requests.find(r => r.id === id);

  const isPending = r => r && (r.status === 'PENDING APPROVAL' || r.status === 'Pending' || r.status === 'Re-assigned');
  const isUnderMod = r => r && (r.status === 'MODIFICATION REQUIRED' || r.status === 'Under Modification');
  const isClarify = r => r && (r.status === 'CLARIFICATION REQUIRED' || r.status === 'Clarification Required');
  const isApproved = r => r && (r.status === 'APPROVED' || r.status === 'Approved');
  const isRejected = r => r && (r.status === 'REJECTED' || r.status === 'Rejected');
  const isWithdrawn = r => r && (r.status === 'WITHDRAWN' || r.status === 'Withdrawn');
  const isDraft = r => r && (r.status === 'DRAFT' || r.status === 'Draft');

  // ONLY requests with status PENDING APPROVAL are active for approver decisions
  const isActive = r => isPending(r);

  const daysLeft = r => daysBetween(todayISO(), r.deadline);
  const isOverdue = r => isActive(r) && r.deadline < todayISO();
  const isDueSoon = r => isActive(r) && daysLeft(r) >= 0 && daysLeft(r) <= CONFIG.MIN_DEADLINE_DAYS;
  const isOwner = r => { const u = currentUser(); return !!u && identityEmails(u.email).includes(r.requesterEmail); };
  const actingEmail = () => (currentUser() && currentUser().email);
  const isMyApproval = r => {
    const u = currentUser();
    if (!u || !r) return false;
    return identityEmails(u.email).includes(r.approverEmail);
  };

  // Check if approver has verified OTP for this request and current revision
  const isActionOtpVerified = r => {
    if (!r) return false;
    const sess = state.verifiedActionSessions && state.verifiedActionSessions[r.id];
    return !!(sess && sess.version === r.version);
  };

  // Full approval decision permissions granted only if assigned approver and OTP verified
  const canAct = r => isActive(r) && isMyApproval(r) && isActionOtpVerified(r);

  // Authorization validator functions (Backend role-based checks)
  function checkApproverAuthorization(req, actor) {
    if (state.isSeeding) return { ok: true };
    if (!req) return { ok: false, error: 'Request not found in database.' };
    if (!isActive(req)) return { ok: false, error: 'Request is not currently pending an approval decision (Status: ' + req.status + ').' };
    const u = currentUser();
    if (!u) return { ok: false, error: 'Authentication required: You must be logged in.' };
    const authEmails = identityEmails(u.email);
    if (!authEmails.includes(req.approverEmail)) {
      return { ok: false, error: 'Authorization error: You are not the assigned approver for this request.' };
    }
    if (!isActionOtpVerified(req)) {
      return { ok: false, error: 'Security verification required: Approver must verify OTP before executing decisions.' };
    }
    return { ok: true };
  }

  function checkOwnerAuthorization(req, actor) {
    if (state.isSeeding) return { ok: true };
    if (!req) return { ok: false, error: 'Request not found in database.' };
    const u = currentUser();
    if (!u || !identityEmails(u.email).includes(req.requesterEmail)) {
      return { ok: false, error: 'Access denied: Only the original requester can modify, remind, or withdraw this request.' };
    }
    return { ok: true };
  }

  const involved = (r, u) => {
    const em = identityEmails(u.email);
    const ccList = parseEmails(r.ccEmail || '');
    return em.includes(r.requesterEmail) || em.includes(r.approverEmail) || ccList.some(c => em.includes(c)) ||
      (r.stakeholders || []).some(s => em.includes(s)) || (r.reassignments || []).some(x => em.includes(x.fromEmail));
  };
  const canView = r => { const u = currentUser(); return !!u && (u.role === 'admin' || involved(r, u)); };
  const scopedRequests = () => { const u = currentUser(); return isAdmin() ? DB.requests.slice() : DB.requests.filter(r => involved(r, u)); };
  const awaitingMine = () => DB.requests.filter(r => isActive(r) && isMyApproval(r));
  const sortRecent = a => a.slice().sort((x, y) => y.updatedAt - x.updatedAt);

  /* =======================================================
     6. WORKFLOW ENGINE (With Versioning & Email Notifications)
     ======================================================= */
  const nextNumber = () => {
    DB.settings.seq = (DB.settings.seq || 0) + 1;
    return 'SRM-' + now().getFullYear() + '-' + String(DB.settings.seq).padStart(4, '0');
  };

  function addTimeline(req, actor, action, note) {
    req.timeline.push({ at: ts(), by: actor.name || actor.email, action: action, note: note || '', status: req.status });
    req.updatedAt = ts();
  }

  function wfCreate(d, actor) {
    const t = ts(), number = nextNumber();
    const req = {
      id: 'r_' + uid(), number: number, baseNumber: number, numberHistory: [],
      title: d.title, type: d.type, amount: Number(d.amount), budgeted: d.budgeted, amountBudgeted: Number(d.amountBudgeted) || 0, extraReason: d.extraReason || '',
      requesterName: d.requesterName, requesterEmail: d.requesterEmail, group: d.group || '', vertical: d.vertical || '', ccEmail: d.ccEmail || '',
      approverEmail: d.approverEmail, approverName: d.approverName, deadline: d.deadline, stakeholders: d.stakeholders || [],
      details: d.details, reason: d.reason, attachments: d.attachments || [],
      status: STATUS.PENDING, version: 1, revisions: {}, reassignCount: 0, reassignments: [],
      versions: [
        {
          version: 1,
          at: t,
          by: actor.name || actor.email,
          note: 'Initial submission into approval chain',
          data: {
            title: d.title, type: d.type, amount: Number(d.amount), budgeted: d.budgeted,
            amountBudgeted: Number(d.amountBudgeted) || 0, extraReason: d.extraReason || '',
            approverName: d.approverName, approverEmail: d.approverEmail, deadline: d.deadline,
            details: d.details, reason: d.reason, ccEmail: d.ccEmail || '',
            stakeholders: (d.stakeholders || []).slice(), attachments: (d.attachments || []).slice()
          }
        }
      ],
      approvalRef: null, decision: null, clarification: null, withdrawReason: '', nonAction: false, reminderSent: false, locked: true,
      createdAt: t, updatedAt: t, timeline: []
    };
    DB.requests.unshift(req);
    addTimeline(req, actor, 'Request submitted', 'Submitted into approval chain (Version 1). The request record is locked.');

    // Dispatches submission notification email to approver, requester, CC recipients, and stakeholders
    EmailService.sendEmail({
      to: req.approverEmail,
      cc: req.ccEmail,
      subject: 'Action Required: ' + req.title + ' (' + req.number + ') from ' + req.requesterName,
      template: 'submission',
      data: { request: req }
    });

    EmailService.sendEmail({
      to: req.requesterEmail,
      cc: req.ccEmail,
      subject: 'Submission Confirmation: ' + req.title + ' (' + req.number + ')',
      template: 'submission',
      data: { request: req }
    });

    const ccList = parseEmails(req.ccEmail || '');
    ccList.forEach(cc => {
      EmailService.sendEmail({
        to: cc,
        subject: 'CC Notification: ' + req.title + ' (' + req.number + ')',
        template: 'submission',
        data: { request: req }
      });
    });

    (req.stakeholders || []).forEach(st => {
      EmailService.sendEmail({
        to: st,
        subject: 'Stakeholder Notice: ' + req.title + ' (' + req.number + ')',
        template: 'submission',
        data: { request: req }
      });
    });

    notifyRequest(req, 'submitted', e =>
      e === req.requesterEmail ? 'Approval request submitted: ' + req.title + ' (' + req.number + ').' :
        e === req.approverEmail ? 'New action required: ' + req.title + ' (' + req.number + ') from ' + req.requesterName + '. Deadline: ' + fmtDate(req.deadline) + '.' :
          ccList.includes(e) ? 'You were marked CC on approval request ' + req.number + ': ' + req.title + '.' :
            'You were added as a stakeholder on ' + req.number + ': ' + req.title + '.');

    persist();
    return req;
  }

  function wfRemind(req, actor) {
    const auth = checkOwnerAuthorization(req, actor);
    if (!auth.ok && !isAdmin()) {
      toast(auth.error, 'error');
      return false;
    }

    addTimeline(req, actor, 'Approver reminder triggered', 'High-priority notification sent to ' + req.approverEmail + '.');

    // Dispatches reminder email with TAKE ACTION and view-only links
    EmailService.sendEmail({
      to: req.approverEmail,
      subject: 'Reminder: Action Required for ' + req.number + ' before ' + fmtDate(req.deadline),
      template: 'reminder',
      data: { request: req }
    });

    notifyRequest(req, 'reminder', e =>
      e === req.approverEmail ? 'Reminder from ' + req.requesterName + ': ' + req.number + ' requires your sign-off before ' + fmtDate(req.deadline) + '.' :
        e === req.requesterEmail ? 'You sent an approval reminder to ' + req.approverName + ' for ' + req.number + '.' : null);

    persist();
    return true;
  }

  function wfStartModify(req, actor) {
    const auth = checkOwnerAuthorization(req, actor);
    if (!auth.ok && !isAdmin()) {
      toast(auth.error, 'error');
      return false;
    }

    req.statusBeforeModify = req.status;
    req.status = STATUS.MOD_REQUIRED;

    // Invalidate current approver action sessions
    delete state.verifiedActionSessions[req.id];
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);

    addTimeline(req, actor, 'Reopened for modification', 'Approval review is paused until revisions are submitted.');

    EmailService.sendEmail({
      to: req.approverEmail,
      subject: 'Request Reopened for Modification: ' + req.number + ' (' + req.title + ')',
      template: 'modify_reopened',
      data: { request: req }
    });

    notifyRequest(req, 'modified', e =>
      e === req.approverEmail ? req.number + ' was reopened by the requester for updates. Approvals are temporarily on hold.' :
        e === req.requesterEmail ? 'You reopened ' + req.number + ' for modification.' : req.number + ' was reopened for modification.');

    persist();
    return true;
  }

  function wfResubmit(req, changes, addStake, addFiles, note, actor) {
    const auth = checkOwnerAuthorization(req, actor);
    if (!auth.ok && !isAdmin()) {
      toast(auth.error, 'error');
      return false;
    }

    // Capture old snapshot for full audit retention
    const previousSnapshot = {
      version: req.version,
      at: ts(),
      by: actor.name || actor.email,
      note: note || '',
      changes: changes,
      data: {
        title: req.title, type: req.type, amount: req.amount, budgeted: req.budgeted,
        amountBudgeted: req.amountBudgeted, extraReason: req.extraReason,
        approverName: req.approverName, approverEmail: req.approverEmail, deadline: req.deadline,
        details: req.details, reason: req.reason, ccEmail: req.ccEmail,
        stakeholders: req.stakeholders.slice(), attachments: req.attachments.slice()
      }
    };
    req.versions = req.versions || [];
    req.versions.push(previousSnapshot);

    // Record field-by-field diffs for strikethrough audit trail
    Object.keys(changes).forEach(k => {
      (req.revisions[k] = req.revisions[k] || []).push({
        oldVal: req[k],
        newVal: changes[k],
        version: req.version + 1,
        at: ts()
      });
      req[k] = changes[k];
    });

    if (addStake && addStake.length) req.stakeholders = req.stakeholders.concat(addStake);
    if (addFiles && addFiles.length) req.attachments = req.attachments.concat(addFiles);

    const labels = MOD_FIELDS.filter(m => Object.prototype.hasOwnProperty.call(changes, m.k)).map(m => m.l);
    if (addStake && addStake.length) labels.push('Stakeholders');
    if (addFiles && addFiles.length) labels.push('Attachments');

    req.version += 1;
    req.status = STATUS.PENDING;
    req.reminderSent = false;
    if (req.clarification && !req.clarification.answeredAt) req.clarification.answeredAt = ts();

    // Revoke old action tokens and clear verified sessions
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    addTimeline(req, actor, 'Resubmitted (Version ' + req.version + ')', (labels.length ? 'Modified fields: ' + labels.join(', ') + '. ' : '') + (note || ''));

    // Dispatch resubmission emails with fresh TAKE ACTION link
    EmailService.sendEmail({
      to: req.approverEmail,
      cc: req.ccEmail,
      subject: 'Revised Proposal: ' + req.number + ' (v' + req.version + ') ready for review',
      template: 'resubmitted',
      data: { request: req }
    });

    EmailService.sendEmail({
      to: req.requesterEmail,
      cc: req.ccEmail,
      subject: 'Resubmission Successful: ' + req.number + ' (v' + req.version + ')',
      template: 'resubmitted',
      data: { request: req }
    });

    const resubmitCcList = parseEmails(req.ccEmail || '');
    resubmitCcList.forEach(cc => {
      EmailService.sendEmail({
        to: cc,
        subject: 'CC Notification: ' + req.number + ' (v' + req.version + ') Resubmitted',
        template: 'resubmitted',
        data: { request: req }
      });
    });

    notifyRequest(req, 'modified', e =>
      e === req.approverEmail ? req.number + ' has been resubmitted (v' + req.version + ') and is ready for your review.' :
        e === req.requesterEmail ? 'You successfully resubmitted ' + req.number + ' (v' + req.version + ').' : req.number + ' was updated and resubmitted.');

    persist();
    return true;
  }

  function wfWithdraw(req, reason, actor) {
    const auth = checkOwnerAuthorization(req, actor);
    if (!auth.ok && !isAdmin()) {
      toast(auth.error, 'error');
      return false;
    }

    req.status = STATUS.WITHDRAWN;
    req.withdrawReason = reason;

    // Invalidate outstanding action sessions & links
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    addTimeline(req, actor, 'Withdrawn by requester', reason);

    EmailService.sendEmail({
      to: req.approverEmail,
      cc: req.ccEmail,
      subject: 'Request Withdrawn: ' + req.number + ' (' + req.title + ')',
      template: 'withdraw',
      data: { request: req, reason: reason }
    });

    EmailService.sendEmail({
      to: req.requesterEmail,
      subject: 'Withdrawal Confirmation: ' + req.number,
      template: 'withdraw',
      data: { request: req, reason: reason }
    });

    notifyRequest(req, 'withdrawn', () => req.requesterName + ' withdrew request ' + req.number + '. Reason: ' + reason);
    persist();
    return true;
  }

  function wfApprove(req, reason, actor) {
    const auth = checkApproverAuthorization(req, actor);
    if (!auth.ok) {
      toast(auth.error, 'error');
      return false;
    }

    req.status = STATUS.APPROVED;
    req.approvalRef = newApprovalRef();
    req.decision = { type: 'Approved', by: actor.name, email: actor.email, at: ts(), reason: reason, approvalRef: req.approvalRef, revision: req.version, files: [] };

    addTimeline(req, actor, 'Request Approved', reason + ' (Audit Reference: ' + req.approvalRef + ')');

    // Invalidate action tokens
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    // Dispatch approval confirmation emails
    EmailService.sendEmail({
      to: req.requesterEmail,
      cc: req.ccEmail,
      subject: 'APPROVED: ' + req.number + ' - ' + req.title + ' [Ref: ' + req.approvalRef + ']',
      template: 'approved',
      data: { request: req, approverName: actor.name, reason: reason, approvalNumber: req.approvalRef }
    });

    EmailService.sendEmail({
      to: req.approverEmail,
      subject: 'Approval Recorded: ' + req.number + ' [Ref: ' + req.approvalRef + ']',
      template: 'approved',
      data: { request: req, approverName: actor.name, reason: reason, approvalNumber: req.approvalRef }
    });

    notifyRequest(req, 'approved', () => 'Request ' + req.number + ' was officially APPROVED by ' + actor.name + '. Audit Ref: ' + req.approvalRef + '.');
    persist();
    return true;
  }

  function wfReject(req, reason, files, actor) {
    const auth = checkApproverAuthorization(req, actor);
    if (!auth.ok) {
      toast(auth.error, 'error');
      return false;
    }

    req.status = STATUS.REJECTED;
    req.decision = { type: 'Rejected', by: actor.name, email: actor.email, at: ts(), reason: reason, revision: req.version, files: files || [] };

    addTimeline(req, actor, 'Request Rejected', reason);

    // Invalidate action tokens
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    EmailService.sendEmail({
      to: req.requesterEmail,
      cc: req.ccEmail,
      subject: 'REJECTED: ' + req.number + ' - ' + req.title,
      template: 'rejected',
      data: { request: req, approverName: actor.name, reason: reason, files: files }
    });

    EmailService.sendEmail({
      to: req.approverEmail,
      subject: 'Rejection Recorded: ' + req.number,
      template: 'rejected',
      data: { request: req, approverName: actor.name, reason: reason, files: files }
    });

    notifyRequest(req, 'rejected', () => 'Request ' + req.number + ' was REJECTED by ' + actor.name + '. Reason: ' + reason);
    persist();
    return true;
  }

  function wfClarify(req, text, actor) {
    const auth = checkApproverAuthorization(req, actor);
    if (!auth.ok) {
      toast(auth.error, 'error');
      return false;
    }

    req.status = STATUS.CLARIFY_REQUIRED;
    req.clarification = { by: actor.name, email: actor.email, at: ts(), text: text, revision: req.version, answeredAt: null };

    addTimeline(req, actor, 'Clarification Requested', text);

    // Invalidate action tokens until revised
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    EmailService.sendEmail({
      to: req.requesterEmail,
      cc: req.ccEmail,
      subject: 'Clarification Needed: ' + req.number + ' - ' + req.title,
      template: 'clarification',
      data: { request: req, approverName: actor.name, clarificationText: text }
    });

    notifyRequest(req, 'clarification', e =>
      e === req.requesterEmail ? actor.name + ' requested clarification on ' + req.number + ': ' + text :
        actor.name + ' requested clarification on ' + req.number + '.');

    persist();
    return true;
  }

  function wfReassign(req, d, actor) {
    const auth = checkApproverAuthorization(req, actor);
    if (!auth.ok) {
      toast(auth.error, 'error');
      return false;
    }

    if (req.reassignCount >= CONFIG.MAX_REASSIGN) {
      toast('This request has reached the maximum delegation limit of ' + CONFIG.MAX_REASSIGN + '.', 'error');
      return false;
    }

    const old = { name: req.approverName, email: req.approverEmail }, oldNumber = req.number;
    req.reassignCount += 1;
    req.numberHistory.push(oldNumber);
    req.number = req.baseNumber + '-R' + req.reassignCount;

    req.reassignments.push({
      at: ts(), fromName: old.name, fromEmail: old.email,
      toName: d.name, toEmail: d.email, toGroup: d.group || '', reason: d.reason,
      oldNumber: oldNumber, newNumber: req.number, deadline: d.deadline
    });

    req.approverEmail = d.email;
    req.approverName = d.name;
    if (d.group) req.group = d.group;
    else if (findGroupForEmail(d.email)) req.group = findGroupForEmail(d.email);
    req.deadline = d.deadline;
    req.reminderSent = false;
    req.status = STATUS.PENDING;

    // Append to original request reason without overwriting
    req.reason = req.reason + '\n\n[Delegated by ' + old.name + ' on ' + fmtDate(todayISO()) + ': ' + d.reason + ']';

    // Invalidate old approver tokens & sessions
    SecurityService.revokeTokensForRequest(req.id, ['TAKE_ACTION']);
    delete state.verifiedActionSessions[req.id];

    addTimeline(req, actor, 'Approval Delegated to ' + d.name, 'Generated ID ' + req.number + '. Revised deadline: ' + fmtDate(d.deadline) + '. ' + d.reason);

    // Dispatches reassignment emails to new approver (with new TAKE ACTION link) and stakeholders
    EmailService.sendEmail({
      to: d.email,
      subject: 'Approval Authority Assigned: ' + req.number + ' (' + req.title + ')',
      template: 'reassigned',
      data: { request: req, toName: d.name, toEmail: d.email, newDeadline: d.deadline, reason: d.reason, newNumber: req.number }
    });

    EmailService.sendEmail({
      to: old.email,
      subject: 'Delegation Notice: ' + req.number + ' transferred to ' + d.name,
      template: 'reassigned',
      data: { request: req, toName: d.name, toEmail: d.email, newDeadline: d.deadline, reason: d.reason, newNumber: req.number }
    });

    EmailService.sendEmail({
      to: req.requesterEmail,
      subject: 'Approver Reassigned: ' + req.number + ' now assigned to ' + d.name,
      template: 'reassigned',
      data: { request: req, toName: d.name, toEmail: d.email, newDeadline: d.deadline, reason: d.reason, newNumber: req.number }
    });

    notifyRequest(req, 'reassigned', e =>
      e === d.email ? 'Approval authority transferred: ' + req.number + ' (' + req.title + ') was delegated to you. Deadline ' + fmtDate(d.deadline) + '.' :
        req.number + ' was delegated from ' + old.name + ' to ' + d.name + '. New deadline: ' + fmtDate(d.deadline) + '.', [old.email]);

    persist();
    return true;
  }

  function runDeadlineCheck() {
    let reminders = 0, closed = 0;
    const system = { name: 'System Auditor', email: 'audit@srmtech.com' };
    DB.requests.forEach(r => {
      if (!isActive(r)) return;
      if (isOverdue(r)) {
        r.status = STATUS.REJECTED;
        r.nonAction = true;
        r.decision = { type: 'Rejected', by: system.name, email: '', at: ts(), reason: 'Automatically closed due to non-action before the deadline (' + fmtDate(r.deadline) + ').', files: [] };
        addTimeline(r, system, 'Rejected by Non-Action', 'The approval deadline passed without a formal decision.');

        EmailService.sendEmail({
          to: r.requesterEmail,
          subject: 'Request Automatically Closed: ' + r.number + ' (Non-Action Deadline Passed)',
          template: 'rejected',
          data: { request: r, approverName: system.name, reason: 'Deadline expired with no decision.' }
        });

        notifyRequest(r, 'rejected', () => r.number + ' was automatically rejected due to expired deadline (' + fmtDate(r.deadline) + ').');
        closed++;
      } else if (isDueSoon(r) && !r.reminderSent) {
        r.reminderSent = true;
        addTimeline(r, system, 'Automated Deadline Reminder', 'System alert triggered for approaching sign-off cutoff.');
        const when = daysLeft(r) === 0 ? 'today' : 'in ' + daysLeft(r) + ' day(s)';

        EmailService.sendEmail({
          to: r.approverEmail,
          subject: 'Automated Deadline Alert: ' + r.number + ' is due ' + when,
          template: 'reminder',
          data: { request: r }
        });

        notifyRequest(r, 'reminder', e => (e === r.approverEmail || e === r.requesterEmail) ? 'Deadline alert: ' + r.number + ' is due ' + when + ' (' + fmtDate(r.deadline) + ').' : null);
        reminders++;
      }
    });
    persist();
    return { reminders: reminders, closed: closed };
  }


  /* =======================================================
     7. NOTIFICATIONS
     ======================================================= */
  const NOTIF_LABEL = {
    submitted: 'Request Submitted', assigned: 'New Approval Assigned', approved: 'Decision: Approved', rejected: 'Decision: Rejected',
    clarification: 'Clarification Needed', reassigned: 'Approval Delegated', reminder: 'Deadline Reminder', withdrawn: 'Request Withdrawn', modified: 'Request Revised'
  };

  function notifyRequest(req, type, fn, extraRecipients) {
    const ccList = parseEmails(req.ccEmail || '');
    const to = uniq([req.requesterEmail, req.approverEmail].concat(ccList, req.stakeholders || [], extraRecipients || []).filter(Boolean));
    to.forEach(email => {
      const message = fn(email);
      if (!message) return;
      const kind = (type === 'submitted' && email === req.approverEmail) ? 'assigned' : (type === 'reassigned' && email === req.approverEmail ? 'assigned' : type);
      DB.notifications.unshift({ id: 'n_' + uid(), to: email, type: kind, message: message, requestId: req.id, number: req.number, at: ts(), read: false });
    });
  }
  const myNotifications = () => { const u = currentUser(); const em = identityEmails(u.email); return DB.notifications.filter(n => em.includes(n.to)); };
  const unreadCount = () => currentUser() ? myNotifications().filter(n => !n.read).length : 0;

  /* =======================================================
     8. UI HELPERS, BADGES, MODALS, TOASTS
     ======================================================= */
  const icon = (n, s) => {
    const icons = {
      dashboard: 'fa-solid fa-table-columns',
      bell: 'fa-solid fa-bell',
      plus: 'fa-solid fa-plus',
      file: 'fa-solid fa-file-invoice',
      check: 'fa-solid fa-circle-check',
      users: 'fa-solid fa-users',
      list: 'fa-solid fa-list-check',
      x: 'fa-solid fa-xmark',
      clip: 'fa-solid fa-paperclip',
      back: 'fa-solid fa-arrow-left',
      search: 'fa-solid fa-magnifying-glass',
      clock: 'fa-solid fa-clock',
      alert: 'fa-solid fa-triangle-exclamation',
      swap: 'fa-solid fa-arrow-right-arrow-left',
      help: 'fa-solid fa-circle-question'
    };
    return '<i class="' + (icons[n] || 'fa-solid fa-circle') + '" style="font-size:' + (s || 16) + 'px" aria-hidden="true"></i>';
  };

  const statusBadge = r => {
    const conf = STATUS_CONFIG[r.status] || { cls: 'badge-withdrawn', icon: 'fa-solid fa-circle' };
    const label = r.status === 'Rejected' && r.nonAction ? 'Rejected (No Action)' : r.status;
    return '<span class="badge ' + conf.cls + '"><i class="' + conf.icon + ' text-[10px]"></i>' + esc(label) + '</span>';
  };

  function deadlineCell(r) {
    let extra = '';
    if (isOverdue(r)) extra = '<div class="mt-1"><span class="chip chip-danger !text-[11px]"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Overdue by ' + Math.abs(daysLeft(r)) + ' d</span></div>';
    else if (isDueSoon(r)) {
      const d = daysLeft(r);
      extra = '<div class="mt-1"><span class="chip chip-warn !text-[11px]"><i class="fa-solid fa-clock text-[10px]"></i> ' + (d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : 'Due in ' + d + ' d') + '</span></div>';
    }
    return '<div class="font-medium text-slate-700">' + fmtDate(r.deadline) + '</div>' + extra;
  }

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.setAttribute('role', 'status');
    const ic = type === 'success' ? 'fa-circle-check text-emerald-400' :
      type === 'error' ? 'fa-circle-exclamation text-rose-400' :
        type === 'warn' ? 'fa-triangle-exclamation text-amber-400' : 'fa-circle-info text-blue-400';
    t.innerHTML = '<i class="fa-solid ' + ic + '"></i><span>' + esc(msg) + '</span>';
    $('#toast-root').appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      t.style.transition = 'all 0.2s ease';
      setTimeout(() => t.remove(), 250);
    }, 4200);
  }

  function openModal(o) {
    state.modal = { onSubmit: o.onSubmit || null };
    $('#modal-root').innerHTML =
      '<div class="modal-backdrop"><div class="modal-card ' + (o.large ? 'modal-lg' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<form id="modal-form" novalidate>' +
      '<div class="modal-head"><h2 id="modal-title" class="text-lg font-bold text-slate-900">' + esc(o.title) + '</h2>' +
      '<button type="button" class="icon-btn text-slate-400 hover:text-slate-700" data-action="modal-close" aria-label="Close">' + icon('x', 14) + '</button></div>' +
      '<div class="modal-body">' + (o.body || '') + '<p class="err" id="modal-error" role="alert"></p></div>' +
      (o.hideFooter ? '' :
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-action="modal-close">' + esc(o.cancelText || 'Cancel') + '</button>' +
        '<button type="submit" class="btn ' + (o.btnClass || 'btn-primary') + '">' + esc(o.confirmText || 'Confirm') + '</button></div>') +
      '</form></div></div>';
    const f = $('#modal-form input:not([type=file]):not([readonly]), #modal-form textarea, #modal-form select');
    if (f) f.focus();
  }
  function closeModal() { state.modal = null; $('#modal-root').innerHTML = ''; }
  const modalReason = (label, ph) => field('m-reason', label, '<textarea id="m-reason" name="m-reason" class="form-control" placeholder="' + esc(ph || '') + '"></textarea>', { required: true });

  function field(id, label, control, o) {
    o = o || {};
    return '<div class="field' + (o.span ? ' sm:col-span-2' : '') + '"' + (o.wrapId ? ' id="' + o.wrapId + '"' : '') + (o.hidden ? ' hidden' : '') + '>' +
      '<label for="' + id + '" class="lbl">' + label + (o.required ? '<span class="req" aria-hidden="true">*</span>' : (o.optional ? '<span class="opt">Optional</span>' : '')) + '</label>' +
      control + (o.hint ? '<p class="hint">' + o.hint + '</p>' : '') + '<p class="err" data-err="' + id + '" role="alert"></p></div>';
  }
  const inputCtl = (id, o) => { o = o || {}; return '<input id="' + id + '" name="' + id + '" type="' + (o.type || 'text') + '" class="form-control" value="' + esc(o.value == null ? '' : o.value) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.attrs ? ' ' + o.attrs : '') + '>'; };
  const selectCtl = (id, list, o) => { o = o || {}; return '<select id="' + id + '" name="' + id + '" class="form-control"' + (o.attrs ? ' ' + o.attrs : '') + '>' + (o.placeholder ? '<option value="">' + esc(o.placeholder) + '</option>' : '') + list.map(x => '<option value="' + esc(x) + '"' + (x === o.value ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>'; };
  const textareaCtl = (id, o) => { o = o || {}; return '<textarea id="' + id + '" name="' + id + '" class="form-control"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.attrs ? ' ' + o.attrs : '') + '>' + esc(o.value == null ? '' : o.value) + '</textarea>'; };

  function showErrors(prefix, errs) {
    $$('[data-err^="' + prefix + '"]').forEach(e => { e.textContent = ''; });
    $$('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    let first = null;
    Object.keys(errs).forEach(k => {
      const e = $('[data-err="' + prefix + k + '"]'); if (e) e.textContent = errs[k];
      const c = $('#' + prefix + k); if (c) { c.setAttribute('aria-invalid', 'true'); if (!first) first = c; }
    });
    if (first) first.focus();
  }

  function fileCard(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    let iconClass = 'fa-file-lines text-slate-500';
    let badgeColor = 'bg-slate-100 text-slate-700';
    if (['pdf'].includes(ext)) { iconClass = 'fa-file-pdf text-rose-500'; badgeColor = 'bg-rose-50 text-rose-700 border-rose-200'; }
    else if (['xls', 'xlsx', 'csv'].includes(ext)) { iconClass = 'fa-file-excel text-emerald-600'; badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
    else if (['doc', 'docx'].includes(ext)) { iconClass = 'fa-file-word text-blue-600'; badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'; }
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) { iconClass = 'fa-file-image text-purple-600'; badgeColor = 'bg-purple-50 text-purple-700 border-purple-200'; }

    return `
      <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-all">
        <div class="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 text-lg border border-slate-100">
            <i class="fa-solid ${iconClass}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-slate-800 truncate" title="${esc(f.name)}">${esc(f.name)}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${badgeColor}">${esc(ext)}</span>
              <span class="text-[11px] text-slate-400 font-mono">${f.size ? fmtSize(f.size) : 'Attachment'}</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline !text-xs !py-1 !px-2.5 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-600" data-action="sim-download" data-name="${esc(f.name)}" title="Download Attachment">
          <i class="fa-solid fa-download text-xs"></i> Download
        </button>
      </div>
    `;
  }

  /* =======================================================
     9. FLOATING 3-DOT ACTION MENU
     ======================================================= */
  function showActionDropdown(btn, reqId) {
    const r = findReq(reqId);
    if (!r) return;
    const menu = $('#action-dropdown');
    if (!menu) return;

    if (state.activeMenuBtn === btn && menu.classList.contains('active')) {
      hideActionDropdown();
      return;
    }

    const rect = btn.getBoundingClientRect();
    const menuWidth = 224;
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    let top = rect.bottom + 6;

    if (top + 280 > window.innerHeight) {
      top = rect.top - 280;
      if (top < 10) top = 10;
    }

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    const isApprovalList = btn.dataset.source === 'approvals' || state.route.page === 'approvals';

    if (isApprovalList) {
      // In Approval List, hamburger dropdown contains only View
      menu.innerHTML = `
        <div class="px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-lg mb-1">
          <p class="text-[11px] font-mono font-semibold text-slate-500">${esc(r.number)}</p>
          <p class="text-xs font-semibold text-slate-900 truncate mt-0.5">${esc(r.title)}</p>
        </div>

        <!-- Action: View -->
        <button type="button" class="dropdown-item" data-action="view-request" data-id="${r.id}">
          <i class="fa-solid fa-eye text-blue-600 w-4 text-center"></i>
          <span class="font-semibold text-slate-800">View</span>
        </button>
      `;
    } else {
      const active = isActive(r);
      const owner = isOwner(r);
      const canWithdraw = owner && !isApproved(r) && !isRejected(r) && !isWithdrawn(r);
      const canModify = owner && (isPending(r) || isClarify(r) || isUnderMod(r));
      const canRemind = owner && isPending(r);

      menu.innerHTML = `
        <div class="px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-lg mb-1">
          <p class="text-[11px] font-mono font-semibold text-slate-500">${esc(r.number)}</p>
          <p class="text-xs font-semibold text-slate-900 truncate mt-0.5">${esc(r.title)}</p>
        </div>

        <!-- Action: View Details -->
        <button type="button" class="dropdown-item" data-action="view-request" data-id="${r.id}">
          <i class="fa-solid fa-eye text-blue-600 w-4 text-center"></i>
          <span class="font-semibold text-slate-800">View Details</span>
        </button>

        <!-- Requester Specific Actions -->
        ${(canRemind || canModify || canWithdraw) ? `
          <div class="dropdown-divider"></div>
          ${canRemind ? `
            <button type="button" class="dropdown-item text-slate-600" data-action="remind" data-id="${r.id}">
              <i class="fa-regular fa-bell text-slate-500 w-4 text-center"></i>
              <span>Remind Approver</span>
            </button>
          ` : ''}
          ${canModify ? `
            <button type="button" class="dropdown-item text-blue-600" data-action="open-modify" data-id="${r.id}">
              <i class="fa-solid fa-pen-to-square text-blue-500 w-4 text-center"></i>
              <span>Modify Request</span>
            </button>
          ` : ''}
          ${canWithdraw ? `
            <button type="button" class="dropdown-item text-rose" data-action="withdraw" data-id="${r.id}">
              <i class="fa-solid fa-ban text-rose-500 w-4 text-center"></i>
              <span>Withdraw Request</span>
            </button>
          ` : ''}
        ` : ''}
      `;
    }

    menu.classList.remove('hidden');
    requestAnimationFrame(() => {
      menu.classList.add('active');
    });

    if (state.activeMenuBtn) state.activeMenuBtn.classList.remove('active');
    state.activeMenuBtn = btn;
    btn.classList.add('active');
  }

  function hideActionDropdown() {
    const menu = $('#action-dropdown');
    if (!menu) return;
    menu.classList.remove('active');
    menu.classList.add('hidden');
    if (state.activeMenuBtn) {
      state.activeMenuBtn.classList.remove('active');
      state.activeMenuBtn = null;
    }
  }

  /* =======================================================
     10. TABLE BUILDERS & CLIENT-SIDE PAGINATION
     ======================================================= */
  const COL = {
    number: {
      h: 'Request No.',
      cell: r => '<button type="button" class="link mono font-semibold text-blue-600 hover:text-blue-800" data-action="view-request" data-id="' + r.id + '" title="View complete details">' + esc(r.number) + '</button>'
    },
    title: {
      h: 'Request Title',
      cell: r => '<div class="font-semibold text-slate-800" style="min-width:11rem">' + esc(r.title) + '</div>'
    },
    type: {
      h: 'Type',
      cell: r => '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">' + esc(r.type) + '</span>'
    },
    requester: {
      h: 'Requester',
      cell: r => '<div><div class="font-medium text-slate-800">' + esc(r.requesterName) + '</div><div class="sub text-xs text-slate-500 font-mono">' + esc(r.requesterEmail) + '</div></div>'
    },
    requesterName: { h: 'Requester', cell: r => '<span class="font-medium text-slate-800">' + esc(r.requesterName) + '</span>' },
    requesterEmail: { h: 'Requester Email', cell: r => '<span class="sub text-xs font-mono">' + esc(r.requesterEmail) + '</span>' },
    approver: {
      h: 'Approver',
      cell: r => '<div><div class="font-medium text-slate-800">' + esc(r.approverName) + '</div><div class="sub text-xs text-slate-500 font-mono">' + esc(r.approverEmail) + '</div></div>'
    },
    amount: { h: 'Expected Amount', cls: 'mono whitespace-nowrap font-bold text-slate-900', cell: r => fmtINR(r.amount) },
    submitted: {
      h: 'Submission Date',
      cls: 'whitespace-nowrap text-xs text-slate-600',
      cell: r => '<span class="font-mono text-xs text-slate-600">' + fmtDate(r.createdAt) + '</span>'
    },
    deadline: { h: 'Deadline', cls: 'whitespace-nowrap', cell: deadlineCell },
    status: { h: 'Status', cell: statusBadge },
    actions: {
      h: 'Actions',
      cls: 'text-right whitespace-nowrap',
      cell: r => '<button type="button" class="action-kebab-btn" data-action="toggle-action-menu" data-id="' + r.id + '" aria-label="Actions for ' + esc(r.number) + '" title="Actions">' +
        '<i class="fa-solid fa-ellipsis-vertical text-slate-500"></i></button>'
    },
    viewAction: {
      h: 'Action',
      cls: 'text-right whitespace-nowrap',
      cell: r => '<button type="button" class="action-kebab-btn hamburger-btn" data-action="toggle-action-menu" data-source="approvals" data-id="' + r.id + '" aria-label="Actions for ' + esc(r.number) + '" title="Actions">' +
        '<i class="fa-solid fa-bars text-slate-600 text-sm"></i></button>'
    }
  };

  function buildTable(rows, cols, emptyText, options = {}) {
    if (!rows.length) return '<div class="empty">' + esc(emptyText) + '</div>';

    let displayRows = rows;
    let paginationHtml = '';

    if (options.paginate) {
      const pageSize = options.pageSize || CONFIG.PAGE_SIZE;
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      const curPage = Math.min(Math.max(1, options.page || 1), totalPages);
      const startIdx = (curPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, rows.length);
      displayRows = rows.slice(startIdx, endIdx);

      const pageButtons = [];
      for (let p = 1; p <= totalPages; p++) {
        pageButtons.push(`
          <button type="button" class="page-btn ${p === curPage ? 'active' : ''}" data-action="page-change" data-target="${options.target}" data-p="${p}">
            ${p}
          </button>
        `);
      }

      paginationHtml = `
        <div class="pagination-bar">
          <div class="pagination-info">
            Showing <span class="font-semibold text-slate-800">${startIdx + 1}</span> to <span class="font-semibold text-slate-800">${endIdx}</span> of <span class="font-semibold text-slate-800">${rows.length}</span> records
          </div>
          <div class="pagination-controls">
            <button type="button" class="page-btn" data-action="page-change" data-target="${options.target}" data-p="${curPage - 1}" ${curPage <= 1 ? 'disabled' : ''} title="Previous Page">
              <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            ${pageButtons.join('')}
            <button type="button" class="page-btn" data-action="page-change" data-target="${options.target}" data-p="${curPage + 1}" ${curPage >= totalPages ? 'disabled' : ''} title="Next Page">
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      `;
    }

    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      cols.map(c => '<th scope="col" class="' + (c.cls || '') + '">' + c.h + '</th>').join('') +
      '</tr></thead><tbody>' +
      displayRows.map(r => '<tr>' + cols.map(c => '<td class="' + (c.cls || '') + '">' + c.cell(r) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' + paginationHtml;
  }

  function navigateToRequest(reqId) {
    hideActionDropdown();
    const curPage = state.route.page;
    if (curPage === 'dashboard') {
      state.navState = { page: 'dashboard' };
    } else if (curPage === 'my-requests') {
      state.navState = { page: 'my-requests', tab: state.myFilters.tab, q: state.myFilters.q, p: state.myFilters.page };
    } else if (curPage === 'approvals') {
      state.navState = { page: 'approvals', status: state.apprFilters.status, type: state.apprFilters.type, q: state.apprFilters.q, p: state.apprFilters.page };
    } else if (curPage === 'notifications') {
      state.navState = { page: 'notifications', filter: state.notifFilter };
    } else {
      state.navState = { page: 'approvals', status: state.apprFilters.status, type: state.apprFilters.type, q: state.apprFilters.q, p: state.apprFilters.page };
    }
    try {
      sessionStorage.setItem('ea_nav_source', JSON.stringify(state.navState));
    } catch (_) { }
    go('request/' + reqId);
  }

  /* =======================================================
     11. PAGES
     ======================================================= */
  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns', admin: true },
    { key: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell' },
    { key: 'create', label: 'Create Request', icon: 'fa-solid fa-circle-plus' },
    { key: 'my-requests', label: 'My Requests', icon: 'fa-solid fa-file-invoice' },
    { key: 'approvals', label: 'Approval List', icon: 'fa-solid fa-list-check' }
  ];

  function renderChrome(route) {
    const u = currentUser();
    const active = (route.page === 'request' || route.page === 'modify') ? (state.navState.page || 'my-requests') : route.page;
    const items = NAV.filter(n => !n.admin || u.role === 'admin');
    const unread = unreadCount();

    const isSettingsPage = route.page === 'users' || route.page === 'profile-card';
    if (state.settingsMenuOpen === undefined) {
      state.settingsMenuOpen = isSettingsPage;
    } else if (isSettingsPage) {
      state.settingsMenuOpen = true;
    }

    let navHtml = items.map(n =>
      '<button type="button" class="nav-link" data-action="go" data-page="' + n.key + '"' + (active === n.key ? ' aria-current="page"' : '') + '>' +
      '<i class="' + n.icon + ' text-base w-5 text-center"></i>' +
      '<span class="flex-1">' + n.label + '</span>' +
      (n.key === 'notifications' && unread ? '<span class="count">' + unread + '</span>' : '') +
      (n.key === 'approvals' && awaitingMine().length ? '<span class="count">' + awaitingMine().length + '</span>' : '') +
      '</button>').join('');

    // Admin Settings Menu with expandable Submenus
    if (u.role === 'admin') {
      const isExpanded = !!state.settingsMenuOpen;
      const isChildActive = active === 'users' || active === 'profile-card';
      navHtml += `
        <div class="settings-menu-group pt-1">
          <button type="button" class="nav-link ${isChildActive && !isExpanded ? '!text-white !bg-white/10' : ''}" data-action="toggle-settings-menu" aria-expanded="${isExpanded}">
            <i class="fa-solid fa-gear text-base w-5 text-center"></i>
            <span class="flex-1">Settings</span>
            <i class="fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[11px] text-slate-400"></i>
          </button>
          ${isExpanded ? `
            <div class="settings-subnav space-y-1 mt-1 pl-4">
              <button type="button" class="nav-sublink" data-action="go" data-page="users" ${active === 'users' ? 'aria-current="page"' : ''}>
                <i class="fa-solid fa-users-gear text-xs w-4 text-center"></i>
                <span>Group &amp; Users</span>
              </button>
              <button type="button" class="nav-sublink" data-action="go" data-page="profile-card" ${active === 'profile-card' ? 'aria-current="page"' : ''}>
                <i class="fa-solid fa-id-card text-xs w-4 text-center"></i>
                <span>Profile Card</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    $('#sidebar-nav').innerHTML = navHtml;

    $('#sidebar-user-name').textContent = u.name;
    $('#sidebar-user-email').textContent = u.email;
    const roleBadge = $('#sidebar-user-role');
    roleBadge.textContent = u.role === 'admin' ? 'Administrator' : 'Employee';
    roleBadge.className = 'inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ' +
      (u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300');
    $('#sidebar-user-avatar').textContent = initials(u.name);

    $('#page-title').textContent = PAGE_TITLES[route.page] || 'Dashboard';
    const bell = $('#bell-count');
    bell.textContent = unread;
    bell.classList.toggle('hidden', !unread);

    $('#account-btn').innerHTML =
      '<span class="avatar">' + esc(initials(u.name)) + '</span>' +
      '<span class="hidden truncate text-xs font-semibold sm:inline">' + esc(u.name) + '</span>';

    const chip = $('#demo-date-chip');
    chip.hidden = !DB.settings.dayOffset;
    chip.textContent = 'Simulated: ' + fmtDate(todayISO());
  }

  // --- Page: Dashboard ---
  function statCard(label, value, tone, ic) {
    return `
      <div class="stat-card">
        <span class="stat-icon ${tone}">
          <i class="${ic}"></i>
        </span>
        <div>
          <div class="stat-value">${value}</div>
          <div class="sub text-xs font-medium text-slate-500 mt-0.5">${label}</div>
        </div>
      </div>
    `;
  }

  function pageDashboard() {
    const reqs = scopedRequests(), u = currentUser();
    const due = reqs.filter(r => isOverdue(r) || isDueSoon(r)).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5);
    const recent = sortRecent(reqs).slice(0, 6);

    return `
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight text-slate-900">Welcome, ${esc(u.name)}</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">${u.role === 'admin' ? 'Monitoring real-time governance, approval backlogs, and multi-tier sign-offs.' : 'Track your submitted requests and pending sign-offs in real time.'}</p>
        </div>
        <div class="flex items-center gap-2.5">
          <button type="button" class="btn btn-primary shadow-sm" data-action="go" data-page="create">
            <i class="fa-solid fa-circle-plus mr-1"></i> Create New Request
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        ${statCard('Total Requests', reqs.length, 'blue', 'fa-solid fa-file-invoice')}
        ${statCard('Pending Approvals', reqs.filter(r => OPEN_STATUSES.includes(r.status)).length, 'amber', 'fa-regular fa-clock')}
        ${statCard('Approved Requests', reqs.filter(r => r.status === 'Approved').length, 'green', 'fa-solid fa-circle-check')}
        ${statCard('Rejected Requests', reqs.filter(r => r.status === 'Rejected').length, 'red', 'fa-solid fa-circle-xmark')}
        ${statCard('Awaiting My Action', awaitingMine().length, 'violet', 'fa-solid fa-list-check')}
      </div>

      <!-- Deadline alerts if any -->
      ${due.length ? `
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 mt-6">
          <div class="flex items-center gap-2 font-bold text-amber-900 text-sm mb-2">
            <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
            <span>Approaching / Overdue Sign-off Deadlines</span>
          </div>
          <ul class="grid gap-2 text-xs sm:text-sm text-amber-800">
            ${due.map(r => `
              <li class="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-amber-200/50 last:border-0">
                <div class="flex items-center gap-2">
                  <button type="button" class="link mono font-bold text-amber-950" data-action="view-request" data-id="${r.id}">${esc(r.number)}</button>
                  <span class="font-medium">${esc(r.title)}</span>
                </div>
                <div>
                  ${isOverdue(r) ? '<span class="chip chip-danger !text-xs font-bold">Overdue by ' + Math.abs(daysLeft(r)) + ' day(s)</span>' :
        (daysLeft(r) === 0 ? '<span class="chip chip-warn !text-xs font-bold">Due Today</span>' : '<span class="chip chip-warn !text-xs font-bold">Due in ' + daysLeft(r) + ' day(s)</span>')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Recent Requests Table Card -->
      <section class="card mt-6">
        <div class="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div>
            <h3 class="card-title text-base font-bold text-slate-900">Recent Approval Requests</h3>
            <p class="text-xs text-slate-500 mt-0.5">Showing latest submitted records. Click the three dots (⋮) in Actions to open details page or make decisions.</p>
          </div>
          <button type="button" class="btn btn-sm btn-outline !text-xs font-medium" data-action="go" data-page="my-requests">
            View All <i class="fa-solid fa-arrow-right text-[10px] ml-1"></i>
          </button>
        </div>
        ${buildTable(recent, [COL.number, COL.title, COL.type, COL.requester, COL.approver, COL.amount, COL.deadline, COL.status, COL.actions], 'No requests submitted yet.')}
      </section>

      <!-- Demo Simulator Utilities -->
      <section class="card p-5 mt-6 bg-slate-50/50 border-dashed">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <i class="fa-solid fa-clock-rotate-left text-blue-600"></i> Interactive Demo Sandbox Controls
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">Test overdue logic, auto-escalations, and simulate calendar progression.</p>
          </div>
          <span class="font-mono text-xs font-bold px-2.5 py-1 rounded bg-white border border-slate-200">
            System Date: ${fmtDate(todayISO())} ${DB.settings.dayOffset ? '(+' + DB.settings.dayOffset + 'd)' : ''}
          </span>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="demo-advance" data-n="1"><i class="fa-solid fa-forward-step mr-1"></i> +1 Day</button>
          <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="demo-advance" data-n="2"><i class="fa-solid fa-forward mr-1"></i> +2 Days</button>
          <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="demo-reset-date"><i class="fa-solid fa-rotate-left mr-1"></i> Reset Date</button>
          <button type="button" class="btn btn-sm btn-primary !text-xs" data-action="demo-check"><i class="fa-solid fa-shield-halved mr-1"></i> Run Deadline Auditor</button>
          <button type="button" class="btn btn-sm btn-danger-outline !text-xs ml-auto" data-action="demo-reset-data"><i class="fa-solid fa-trash-can mr-1"></i> Reset Sample Data</button>
        </div>
      </section>
    `;
  }

  // --- Page: Notifications ---
  function pageNotifications() {
    let list = myNotifications();
    const unread = list.filter(n => !n.read).length;
    if (state.notifFilter === 'unread') list = list.filter(n => !n.read);

    return `
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Notifications & Audit Alerts</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Chronological activity logs and workflow status updates.</p>
        </div>
        <button type="button" class="btn btn-outline !text-xs font-medium" data-action="mark-all-read" ${unread ? '' : 'disabled'}>
          <i class="fa-solid fa-check-double mr-1"></i> Mark All as Read
        </button>
      </div>

      <div class="tabs mb-4" role="tablist">
        <button type="button" class="tab" role="tab" data-action="notif-filter" data-filter="all" aria-selected="${state.notifFilter === 'all'}">
          All Notifications
        </button>
        <button type="button" class="tab" role="tab" data-action="notif-filter" data-filter="unread" aria-selected="${state.notifFilter === 'unread'}">
          Unread Alerts <span class="n">${unread}</span>
        </button>
      </div>

      <section class="card">
        ${list.length ? list.map(n => `
          <article class="p-4 border-b border-slate-100 last:border-0 flex gap-4 ${n.read ? 'bg-white' : 'bg-blue-50/40'}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}">
              <i class="fa-solid ${n.type === 'reminder' ? 'fa-clock' : n.type === 'rejected' ? 'fa-circle-xmark' : n.type === 'approved' ? 'fa-circle-check' : n.type === 'clarification' ? 'fa-circle-question' : n.type === 'reassigned' ? 'fa-user-gear' : 'fa-bell'}"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-bold text-sm text-slate-900">${esc(NOTIF_LABEL[n.type] || 'Notification')}</span>
                <span class="text-xs text-slate-400 font-mono">${fmtDateTime(n.at)}</span>
              </div>
              <p class="mt-1 text-xs sm:text-sm text-slate-700 break-words">${esc(n.message)}</p>
              <div class="mt-2.5 flex items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="view-request" data-id="${n.requestId}">
                  <i class="fa-solid fa-eye mr-1"></i> View Details
                </button>
                ${n.read ? '' : `
                  <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="mark-read" data-id="${n.id}">
                    Mark as Read
                  </button>
                `}
              </div>
            </div>
          </article>
        `).join('') : '<div class="empty">No notifications found in this view.</div>'}
      </section>
    `;
  }

  function findGroupForEmail(email) {
    if (!email) return '';
    for (const [grp, list] of Object.entries(approversByGroup)) {
      if (list.some(a => a.email.toLowerCase() === email.toLowerCase())) return grp;
    }
    return GROUPS[0] || '';
  }

  // --- Group Approvers Synchronization ---
  function syncGroupApprovers(selectedEmail) {
    const groupEl = $('#f-group'), emailEl = $('#f-approverEmail'), nameEl = $('#f-approverName');
    if (!groupEl || !emailEl || !nameEl) return;
    const group = groupEl.value;
    const approvers = approversByGroup[group] || [];

    const errGroup = $('[data-err="f-group"]'); if (errGroup) errGroup.textContent = '';
    const errEmail = $('[data-err="f-approverEmail"]'); if (errEmail) errEmail.textContent = '';
    const errName = $('[data-err="f-approverName"]'); if (errName) errName.textContent = '';

    if (!group || !approvers.length) {
      emailEl.innerHTML = '<option value="">Select Group First</option>';
      emailEl.disabled = true;
      emailEl.value = '';
      nameEl.value = '';
    } else {
      emailEl.disabled = false;
      const targetEmail = selectedEmail || emailEl.value;
      emailEl.innerHTML = '<option value="">Select Approver Email</option>' +
        approvers.map(a => '<option value="' + esc(a.email) + '"' + (a.email.toLowerCase() === (targetEmail || '').toLowerCase() ? ' selected' : '') + '>' + esc(a.email) + '</option>').join('');
      if (targetEmail) {
        emailEl.value = targetEmail;
        syncApproverName();
      } else {
        emailEl.value = '';
        nameEl.value = '';
      }
    }
  }

  function syncApproverName() {
    const groupEl = $('#f-group'), emailEl = $('#f-approverEmail'), nameEl = $('#f-approverName');
    if (!groupEl || !emailEl || !nameEl) return;
    const group = groupEl.value, email = emailEl.value;
    const approvers = approversByGroup[group] || [];
    const match = approvers.find(a => a.email.toLowerCase() === email.toLowerCase());

    const errEmail = $('[data-err="f-approverEmail"]'); if (errEmail) errEmail.textContent = '';
    const errName = $('[data-err="f-approverName"]'); if (errName) errName.textContent = '';

    if (match) {
      nameEl.value = match.name;
    } else {
      nameEl.value = '';
      if (email) {
        if (errName) errName.textContent = 'No matching approver record found for this email.';
      }
    }
  }

  // --- Page: Create / Edit Request ---
  function pageCreate(route) {
    const editId = (route && route.id) || (state.route && state.route.id) || '';
    const editReq = editId ? findReq(editId) : null;
    const u = currentUser();

    if (editReq) {
      state.drafts.create = {
        stakeholders: editReq.stakeholders ? editReq.stakeholders.slice() : [],
        ccEmails: parseEmails(editReq.ccEmail || ''),
        files: editReq.attachments ? editReq.attachments.slice() : []
      };
    } else {
      state.drafts.create = { stakeholders: [], ccEmails: [], files: [] };
    }

    const initialGroup = editReq ? (editReq.group || findGroupForEmail(editReq.approverEmail)) : '';

    return `
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">${editReq ? 'Modify Approval Request' : 'Create Approval Request'}</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">${editReq ? 'Editing proposal <span class="font-mono font-bold text-slate-800">' + esc(editReq.number) + '</span> (Revision v' + editReq.version + '). Resubmission will increment revision state and notify stakeholders.' : 'Submit a formal expenditure, travel, or process approval request into the multi-stage corporate governance chain.'}</p>
        </div>
        ${editReq ? `
          <span class="badge ${editReq.status === 'CLARIFICATION REQUIRED' ? 'badge-clarify' : 'badge-mod'} font-bold">
            ${esc(editReq.status)}
          </span>
        ` : ''}
      </div>

      <form id="req-form" class="space-y-6" novalidate ${editReq ? 'data-edit-id="' + editReq.id + '"' : ''}>
        <!-- Hidden requester identity fields — auto-populated from authenticated session -->
        <input type="hidden" id="f-requesterName" name="f-requesterName" value="${esc(editReq ? editReq.requesterName : u.name)}">
        <input type="hidden" id="f-requesterEmail" name="f-requesterEmail" value="${esc(editReq ? editReq.requesterEmail : u.email)}">
        <!-- Single Card Layout -->
        <section class="card card-pad space-y-4">
          <!-- Row 1 – Three columns: SRM Group Approver | SRM Group Member Email | Approver Full Name -->
          <div class="grid gap-4 sm:grid-cols-3">
            ${field('f-group', 'SRM Group Approver', selectCtl('f-group', GROUPS, { value: initialGroup, placeholder: 'Select Group' }), { required: true })}
            ${field('f-approverEmail', 'SRM Group Member Email', '<select id="f-approverEmail" name="f-approverEmail" class="form-control" disabled><option value="">Select Group First</option></select>', { required: true })}
            ${field('f-approverName', 'Approver Full Name', inputCtl('f-approverName', { value: editReq ? editReq.approverName : '', ph: 'Auto-populated based on email selection', attrs: 'disabled readonly' }), { required: true })}
          </div>

          <!-- Row 2 – Two columns: SRM Group Mail for CC | SRM Group Member Email for CC (SRM University) -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="field">
              <label for="f-cc-group" class="lbl">SRM Group Mail for CC</label>
              <select id="f-cc-group" class="form-control">
                <option value="">Select Group</option>
                ${GROUPS.map(g => '<option value="' + esc(g) + '">' + esc(g) + '</option>').join('')}
              </select>
            </div>
            <div id="f-cc-group-members" class="field">
              <label for="f-cc-member-select" class="lbl">SRM Group Member Email for CC (SRM University)</label>
              <select id="f-cc-member-select" class="form-control" disabled>
                <option value="">Select Group First</option>
              </select>
            </div>
          </div>

          <!-- Row 3 – Full width: Emails CC -->
          <div class="field">
            <label for="f-cc-input" class="lbl">Emails CC <span class="opt">Optional</span></label>
            <div id="f-cc-chips" class="chip-input-wrap"></div>
            <input id="f-cc-input" type="text" class="form-control" placeholder="Type email and press Enter or select from group member dropdown above..." autocomplete="off">
            <p class="err" data-err="f-cc" role="alert"></p>
          </div>

          <!-- Row 4 – Full width: Request Title -->
          ${field('f-title', 'Request Title', inputCtl('f-title', { value: editReq ? editReq.title : '', ph: 'e.g. Developer Laptops for Q4 Engineering Onboarding' }), { required: true })}

          <!-- Row 5 – Full width: Details of Request -->
          ${field('f-details', 'Details of Request', textareaCtl('f-details', { value: editReq ? editReq.details : '', ph: 'Provide specifications, quantities, scope of work, or change parameters...' }), { required: true })}

          <!-- Row 6 – Full width: Reason For Requirement -->
          ${field('f-reason', 'Reason For Requirement', textareaCtl('f-reason', { value: editReq ? editReq.reason : '', ph: 'Explain the operational or commercial necessity...', attrs: 'style="min-height:5rem"' }), { required: true })}

          <!-- Row 7 – Three columns: Approval Category | Expected Amount Including Taxes (INR) | Is This Budgeted in FY Allocation? -->
          <div class="grid gap-4 sm:grid-cols-3">
            ${field('f-type', 'Approval Category', selectCtl('f-type', CONFIG.APPROVAL_TYPES, { value: editReq ? editReq.type : '', placeholder: 'Select approval category' }), { required: true })}
            ${field('f-amount', 'Expected Amount Including Taxes (INR)', inputCtl('f-amount', { value: editReq ? editReq.amount : '', type: 'number', attrs: 'min="0" step="any" inputmode="decimal"' }), { required: true, hint: '<span id="f-amount-preview" class="mono font-bold text-blue-600"></span>' })}
            ${field('f-budgeted', 'Is This Budgeted in FY Allocation?', selectCtl('f-budgeted', CONFIG.BUDGET_OPTIONS, { value: editReq ? editReq.budgeted : '', placeholder: 'Select option' }), { required: true })}
          </div>

          <!-- Row 8 – Two columns: Allocated Budget Amount (INR) | Deadline Date -->
          <div class="grid gap-4 sm:grid-cols-2">
            ${field('f-amountBudgeted', 'Allocated Budget Amount (INR)', inputCtl('f-amountBudgeted', { value: editReq ? (editReq.budgeted === 'No' ? '0' : editReq.amountBudgeted) : '', type: 'number', attrs: 'min="0" step="any" inputmode="decimal" data-auto="1"' }), { required: true, wrapId: 'f-amountBudgeted-wrap', hint: 'Defaults to ₹ 0 if not budgeted.' })}
            ${field('f-deadline', 'Deadline Date', inputCtl('f-deadline', { value: editReq ? editReq.deadline : '', type: 'date', attrs: 'min="' + minDeadlineISO() + '"' }), { required: true, hint: 'Minimum ' + CONFIG.MIN_DEADLINE_DAYS + ' business days required (earliest: ' + fmtDate(minDeadlineISO()) + ').' })}
          </div>

          <!-- Row 9 – Full width: Reason for Extra Expense -->
          ${field('f-extraReason', 'Reason for Extra Expense', textareaCtl('f-extraReason', { value: editReq ? (editReq.extraReason || '') : '', ph: 'Explain why the expense exceeds the allocated budget...', attrs: 'rows="3" style="min-height:4.5rem"' }), { wrapId: 'f-extraReason-wrap', hidden: true, hint: 'Mandatory when requested amount exceeds budgeted allocation.' })}

          <!-- Row 10 – Full width: Supporting Files & Quotations -->
          <div class="field">
            <label for="f-file-input" class="lbl">Supporting Files & Quotations <span class="opt">Optional, up to ${CONFIG.MAX_ATTACHMENTS} files</span></label>
            <input id="f-file-input" type="file" class="form-control" multiple>
            <p class="hint">Accepts PDF, Excel, Word, CSV, and image files up to 10 MB each.</p>
            <div id="f-file-list" class="mt-2.5 grid gap-2"></div>
            <p class="err" data-err="f-file" role="alert"></p>
          </div>
        </section>

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" class="btn btn-primary !py-2.5 !px-6 shadow-md">
            ${editReq ? '<i class="fa-solid fa-arrow-up-from-bracket mr-1.5"></i> Resubmit Request' : '<i class="fa-solid fa-paper-plane mr-1.5"></i> Submit For Approval'}
          </button>
          <button type="button" class="btn btn-outline" data-action="${editReq ? 'view-request' : 'go'}" ${editReq ? 'data-id="' + editReq.id + '"' : 'data-page="my-requests"'}>
            Cancel
          </button>
        </div>
      </form>
    `;
  }

  function syncBudget() {
    const b = $('#f-budgeted');
    const bud = $('#f-amountBudgeted'), wrap = $('#f-amountBudgeted-wrap'), extraWrap = $('#f-extraReason-wrap');
    if (wrap) wrap.hidden = false;
    if (!b || !bud) return;
    if (b.value === 'No') {
      bud.value = '0';
      bud.readOnly = true;
      bud.dataset.auto = '1';
    } else {
      bud.readOnly = false;
      if (bud.dataset.auto === '1') {
        bud.value = '';
        bud.dataset.auto = '0';
      }
    }
    const amt = parseFloat(($('#f-amount') && $('#f-amount').value) || '');
    const bv = bud.value === '' ? NaN : parseFloat(bud.value);
    const exceedsBudget = Boolean(b.value && !isNaN(amt) && !isNaN(bv) && bv < amt);
    if (extraWrap) {
      extraWrap.hidden = !exceedsBudget;
      if (!exceedsBudget) {
        const errEl = $('[data-err="f-extraReason"]');
        if (errEl) errEl.textContent = '';
      }
    }
  }

  function validateRequestData(v) {
    const e = {};
    const re = String(v.requesterEmail || '').trim().toLowerCase();
    // requesterName and requesterEmail are sourced from the authenticated session;
    // they are not validated as user-editable fields.

    if (!v.group) e.group = 'Select a Group.';
    else if (!GROUPS.includes(v.group)) e.group = 'Select a valid group from the list.';

    const groupApprovers = approversByGroup[v.group] || [];
    const ae = String(v.approverEmail || '').trim().toLowerCase();
    if (!ae) e.approverEmail = 'Select an approver official email.';
    else if (!groupApprovers.some(a => a.email.toLowerCase() === ae)) e.approverEmail = 'Selected email does not belong to the chosen group.';
    else if (re && identityEmails(re).includes(ae)) e.approverEmail = 'The requester cannot assign themselves as the approver.';

    if (!v.approverName || !String(v.approverName).trim()) e.approverName = 'Approver name must be populated.';

    if (!String(v.title).trim()) e.title = 'Enter a request title.';
    if (!CONFIG.APPROVAL_TYPES.includes(v.type)) e.type = 'Select an approval category.';
    const amt = (v.amount === '' || v.amount == null) ? NaN : Number(v.amount);
    if (isNaN(amt) || amt < 0) e.amount = 'Enter a valid expected amount in INR.';
    if (!CONFIG.BUDGET_OPTIONS.includes(v.budgeted)) e.budgeted = 'Select whether this item is budgeted.';
    else if (v.budgeted !== 'No') {
      const b = (v.amountBudgeted === '' || v.amountBudgeted == null) ? NaN : Number(v.amountBudgeted);
      if (isNaN(b) || b < 0) e.amountBudgeted = 'Enter the amount budgeted in INR.';
    }
    const bud = v.budgeted === 'No' ? 0 : Number(v.amountBudgeted);
    if (!e.amount && !e.budgeted && !isNaN(bud) && bud < amt && !String(v.extraReason || '').trim()) e.extraReason = 'Provide an explanation for the extra expense beyond budget.';

    if (!v.deadline) e.deadline = 'Pick an approval deadline.';
    else if (v.deadline < minDeadlineISO()) e.deadline = 'The deadline must be at least ' + CONFIG.MIN_DEADLINE_DAYS + ' days ahead (earliest ' + fmtDate(minDeadlineISO()) + ').';
    if (!String(v.details).trim()) e.details = 'Describe the details of your request.';
    if (!String(v.reason).trim()) e.reason = 'State the operational or commercial reason.';
    return e;
  }

  function submitCreate() {
    const form = $('#req-form');
    const editId = form ? form.dataset.editId : '';
    const editReq = editId ? findReq(editId) : null;
    const u = currentUser();
    // Guard: authenticated session must be present before submission
    if (!u || !u.name || !u.email) {
      toast('Session unavailable. Please sign in again before submitting.', 'error');
      return;
    }
    const g = id => ($('#' + id) ? $('#' + id).value.trim() : '');
    const pendingCc = addCcEmails('create', $('#f-cc-input') ? $('#f-cc-input').value : '');
    const ccEmailsList = (state.drafts.create && state.drafts.create.ccEmails) ? state.drafts.create.ccEmails.slice() : [];
    const ccEmailStr = ccEmailsList.join(', ');

    const v = {
      requesterName: u.name,
      requesterEmail: u.email.toLowerCase(),
      group: g('f-group'),
      approverEmail: g('f-approverEmail').toLowerCase(),
      approverName: g('f-approverName'),
      title: g('f-title'),
      type: g('f-type'),
      amount: g('f-amount'),
      budgeted: g('f-budgeted'),
      amountBudgeted: g('f-amountBudgeted'),
      extraReason: g('f-extraReason'),
      deadline: g('f-deadline'),
      details: g('f-details'),
      reason: g('f-reason')
    };
    const errs = validateRequestData(v);
    if (!pendingCc) errs.cc = 'Fix the CC email address above before submitting.';
    showErrors('f-', errs);
    if (Object.keys(errs).length) return;
    const bud = v.budgeted === 'No' ? 0 : Number(v.amountBudgeted);
    const d = state.drafts.create;

    if (editReq) {
      // Edit mode: save as new revision via wfResubmit
      const changes = {};
      const compareKeys = ['title', 'type', 'amount', 'budgeted', 'amountBudgeted', 'extraReason', 'group', 'approverEmail', 'approverName', 'deadline', 'details', 'reason'];
      compareKeys.forEach(k => {
        let oldVal = editReq[k];
        let newVal = v[k];
        if (k === 'amount' || k === 'amountBudgeted') {
          oldVal = Number(oldVal || 0);
          newVal = Number(newVal || 0);
        }
        if (oldVal !== newVal) {
          changes[k] = newVal;
        }
      });
      if (editReq.ccEmail !== ccEmailStr) {
        changes.ccEmail = ccEmailStr;
      }
      editReq.ccEmail = ccEmailStr;

      const existingFileKeys = (editReq.attachments || []).map(f => f.name + '_' + f.size);
      const newFiles = d.files.filter(f => !existingFileKeys.includes(f.name + '_' + f.size));
      editReq.attachments = d.files.slice();

      const ok = wfResubmit(editReq, changes, [], newFiles, 'Resubmitted with modifications via edit form', actorOf(u));
      if (!ok) return;

      state.drafts.create = { stakeholders: [], ccEmails: [], files: [] };
      go('request/' + editReq.id);
      toast('Request ' + editReq.number + ' resubmitted for sign-off (v' + editReq.version + ').', 'success');
      return;
    }

    // Create mode: create brand new request
    const req = wfCreate({
      requesterName: v.requesterName,
      requesterEmail: v.requesterEmail,
      group: v.group,
      vertical: u.vertical || '',
      title: v.title,
      type: v.type,
      amount: Number(v.amount),
      budgeted: v.budgeted,
      amountBudgeted: bud,
      extraReason: bud < Number(v.amount) ? v.extraReason : '',
      approverEmail: v.approverEmail,
      approverName: v.approverName,
      deadline: v.deadline,
      ccEmail: ccEmailStr,
      stakeholders: [],
      details: v.details,
      reason: v.reason,
      attachments: d.files.slice()
    }, actorOf(u));
    state.drafts.create = { stakeholders: [], ccEmails: [], files: [] };
    state.navState = { page: 'my-requests', tab: 'all', q: '', page: 1 };
    go('my-requests');
    openModal({
      title: 'Request Successfully Submitted', hideFooter: true,
      body: '<div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium mb-3">' +
        '<i class="fa-solid fa-circle-check mr-1.5"></i> Request logged and assigned to ' + esc(req.approverName) + ' (' + esc(req.group) + ').</div>' +
        '<p class="text-xs text-slate-500 uppercase tracking-wide font-bold">Assigned Request Reference</p>' +
        '<p class="mono text-2xl font-extrabold text-slate-900 mt-1">' + esc(req.number) + '</p>' +
        '<p class="text-xs text-slate-500 mt-2 mb-4">Requester Email: <span class="font-mono text-slate-700">' + esc(req.requesterEmail) + '</span></p>' +
        '<div class="flex flex-wrap gap-2">' +
        '<button type="button" class="btn btn-primary" data-action="view-request" data-id="' + req.id + '"><i class="fa-solid fa-eye mr-1"></i> Open Request Details Page</button>' +
        '<button type="button" class="btn btn-outline" data-action="modal-close">Done</button></div>'
    });
  }

  // --- Chips & Files Handling ---
  const scopePrefix = scope => scope === 'create' ? 'f' : 'm';
  function renderChips(scope) {
    const box = $('#' + scopePrefix(scope) + '-stake-chips'); if (!box) return;
    box.innerHTML = state.drafts[scope].stakeholders.map((e, i) =>
      '<span class="chip font-mono text-xs">' + esc(e) + '<button type="button" data-action="chip-remove" data-scope="' + scope + '" data-i="' + i + '" aria-label="Remove ' + esc(e) + '"><i class="fa-solid fa-xmark text-[10px]"></i></button></span>').join('');
  }
  function addStakeholders(scope, text) {
    const p = scopePrefix(scope), d = state.drafts[scope], errs = [];
    const existing = scope === 'modify' && findReq(state.route.id) ? findReq(state.route.id).stakeholders : [];
    parseEmails(text).forEach(e => {
      if (!isEmail(e)) errs.push('"' + e + '" is not a valid email address.');
      else if (!isApprovedEmail(e)) errs.push(e + ' must belong to an approved SRM domain (' + DOMAIN_TEXT + ').');
      else if (d.stakeholders.includes(e) || existing.includes(e)) errs.push(e + ' has already been added.');
      else d.stakeholders.push(e);
    });
    const slot = $('[data-err="' + p + '-stake"]'); if (slot) slot.textContent = errs.join(' ');
    const input = $('#' + p + '-stake-input'); if (input) input.value = errs.length ? text : '';
    renderChips(scope);
    return errs.length === 0;
  }

  // --- CC Emails & Group Member Dropdown Handling ---
  function renderCcChips() {
    const box = $('#f-cc-chips'); if (!box) return;
    const list = (state.drafts.create && state.drafts.create.ccEmails) || [];
    box.innerHTML = list.map((e, i) =>
      '<span class="chip font-mono text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded-md py-1 px-2.5">' +
      '<i class="fa-solid fa-at text-[10px] text-blue-500 mr-1.5"></i>' +
      esc(e) +
      '<button type="button" data-action="cc-chip-remove" data-i="' + i + '" class="ml-1.5 text-slate-400 hover:text-rose-600 focus:outline-none" aria-label="Remove ' + esc(e) + '">' +
      '<i class="fa-solid fa-xmark text-[11px]"></i>' +
      '</button>' +
      '</span>'
    ).join('');
  }

  function syncCcGroupMembers() {
    const grpEl = $('#f-cc-group');
    const container = $('#f-cc-group-members');
    if (!grpEl || !container) return;
    const groupName = grpEl.value;
    const dynamicGroup = groupName || 'SRM University';
    if (!groupName) {
      container.innerHTML = `
        <label for="f-cc-member-select" class="lbl">
          SRM Group Member Email for CC (${esc(dynamicGroup)})
        </label>
        <select id="f-cc-member-select" class="form-control" disabled>
          <option value="">Select Group First</option>
        </select>
      `;
      return;
    }
    const members = approversByGroup[groupName] || [];
    if (!members.length) {
      container.innerHTML = `
        <label for="f-cc-member-select" class="lbl">
          SRM Group Member Email for CC (${esc(dynamicGroup)})
        </label>
        <select id="f-cc-member-select" class="form-control" disabled>
          <option value="">No email addresses found for ${esc(dynamicGroup)}</option>
        </select>
      `;
      return;
    }

    container.innerHTML = `
      <label for="f-cc-member-select" class="lbl">
        SRM Group Member Email for CC (${esc(dynamicGroup)})
      </label>
      <select id="f-cc-member-select" class="form-control">
        <option value="">Select Member Email (${esc(dynamicGroup)})...</option>
        ${members.map(m => '<option value="' + esc(m.email.toLowerCase()) + '">' + esc(m.name) + ' (' + esc(m.email) + ')</option>').join('')}
      </select>
    `;
  }

  function addCcEmails(scope, text) {
    if (!text || !text.trim()) return true;
    const d = state.drafts.create;
    if (!d.ccEmails) d.ccEmails = [];
    const errs = [];
    parseEmails(text).forEach(e => {
      if (!isEmail(e)) errs.push('"' + e + '" is not a valid email address.');
      else if (!isApprovedEmail(e)) errs.push(e + ' must belong to an approved SRM domain (' + DOMAIN_TEXT + ').');
      else if (!d.ccEmails.includes(e)) d.ccEmails.push(e);
    });
    const slot = $('[data-err="f-cc"]'); if (slot) slot.textContent = errs.join(' ');
    const input = $('#f-cc-input');
    if (input) input.value = errs.length ? text : d.ccEmails.join(', ');
    renderCcChips();
    return errs.length === 0;
  }
  function renderFiles(scope) {
    const box = $('#' + scopePrefix(scope) + '-file-list'); if (!box) return;
    box.innerHTML = state.drafts[scope].files.map((f, i) =>
      '<div class="file-row text-xs"><span class="min-w-0 truncate font-semibold"><i class="fa-solid fa-paperclip text-slate-400 mr-1.5"></i>' + esc(f.name) + ' <span class="text-slate-400 font-mono">(' + fmtSize(f.size) + ')</span></span>' +
      '<button type="button" class="btn btn-sm btn-outline !text-[11px] !py-0.5 !px-2 text-rose-600 hover:text-rose-800" data-action="file-remove" data-scope="' + scope + '" data-i="' + i + '">Remove</button></div>').join('');
  }
  function addFiles(scope, fileList) {
    const p = scopePrefix(scope), d = state.drafts[scope], errs = [];
    const used = scope === 'modify' && findReq(state.route.id) ? findReq(state.route.id).attachments.length : 0;
    Array.from(fileList).forEach(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!CONFIG.ALLOWED_EXT.includes(ext)) errs.push(f.name + ' is not an allowed file format.');
      else if (f.size > CONFIG.MAX_FILE_BYTES) errs.push(f.name + ' exceeds 10 MB limit.');
      else if (used + d.files.length >= CONFIG.MAX_ATTACHMENTS) errs.push('You can attach a maximum of ' + CONFIG.MAX_ATTACHMENTS + ' files.');
      else d.files.push({ name: f.name, size: f.size });
    });
    const slot = $('[data-err="' + p + '-file"]'); if (slot) slot.textContent = uniq(errs).join(' ');
    renderFiles(scope);
  }

  // --- Page: My Requests (With Client-Side Pagination) ---
  const TABS = [
    { key: 'all', label: 'All Requests', test: () => true },
    { key: 'pending', label: 'Pending Approvals', test: isPending },
    { key: 'clarification', label: 'Clarifications', test: isClarify },
    { key: 'modify', label: 'Under Modification', test: isUnderMod },
    { key: 'approved', label: 'Approved', test: isApproved },
    { key: 'rejected', label: 'Rejected / Withdrawn', test: r => isRejected(r) || isWithdrawn(r) },
    { key: 'reassigned', label: 'Delegated', test: r => r.reassignCount > 0 }
  ];
  const myRequests = () => { const u = currentUser(); const em = identityEmails(u.email); return sortRecent(DB.requests.filter(r => em.includes(r.requesterEmail))); };

  function myRequestsTable() {
    const f = state.myFilters, tab = TABS.find(t => t.key === f.tab) || TABS[0], q = f.q.trim().toLowerCase();
    const rows = myRequests().filter(tab.test).filter(r => !q || (r.number + ' ' + r.title + ' ' + r.approverName + ' ' + r.approverEmail).toLowerCase().includes(q));
    return buildTable(rows, [COL.number, COL.title, COL.type, COL.approver, COL.amount, COL.deadline, COL.status, COL.actions],
      q ? 'No requests match your search criteria.' : 'No requests in this category.',
      { paginate: true, page: f.page || 1, pageSize: CONFIG.PAGE_SIZE, target: 'my-requests' });
  }

  function pageMyRequests() {
    const all = myRequests();
    return `
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">My Requests</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Records you authored. Click the three dots (⋮) under Actions to open View Details or take workflow actions.</p>
        </div>
        <button type="button" class="btn btn-primary" data-action="go" data-page="create">
          <i class="fa-solid fa-circle-plus mr-1"></i> Create Request
        </button>
      </div>

      <div class="tabs mb-4" role="tablist">
        ${TABS.map(t => '<button type="button" class="tab" role="tab" data-action="my-tab" data-tab="' + t.key + '" aria-selected="' + (state.myFilters.tab === t.key) + '">' + t.label + ' <span class="n">' + all.filter(t.test).length + '</span></button>').join('')}
      </div>

      <section class="card">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div class="search-box w-full max-w-sm">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input id="my-search" type="search" class="form-control" placeholder="Search number, title or approver..." value="${esc(state.myFilters.q)}" aria-label="Search requests">
          </div>
          <span class="text-xs text-slate-500 font-mono">Found: <b>${all.filter(TABS.find(t => t.key === state.myFilters.tab).test).length}</b> records</span>
        </div>
        <div id="my-table">${myRequestsTable()}</div>
      </section>
    `;
  }

  // --- Page: Approvals (With Client-Side Pagination) ---
  function approvalsTable() {
    const f = state.apprFilters, q = f.q.trim().toLowerCase();
    let rows = sortRecent(DB.requests);
    if (f.status === 'awaiting') rows = rows.filter(isActive);
    else if (f.status) rows = rows.filter(r => r.status === f.status);
    if (f.type) rows = rows.filter(r => r.type === f.type);
    if (q) rows = rows.filter(r => (r.number + ' ' + r.title + ' ' + r.requesterName + ' ' + r.requesterEmail + ' ' + r.approverName).toLowerCase().includes(q));

    return buildTable(rows, [COL.number, COL.title, COL.requester, COL.approver, COL.submitted, COL.deadline, COL.status, COL.viewAction],
      'No requests match the selected filters.',
      { paginate: true, page: f.page || 1, pageSize: CONFIG.PAGE_SIZE, target: 'approvals' });
  }

  function pageApprovals() {
    const f = state.apprFilters;
    const statuses = ['Pending', 'Re-assigned', 'Under Modification', 'Clarification Required', 'Approved', 'Rejected', 'Withdrawn'];

    return `
      <div class="mb-5">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Approval List</h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Requests relevant to your governance and approval workflow.</p>
      </div>

      <section class="card">
        <div class="grid gap-3 p-4 border-b border-slate-100 sm:grid-cols-3">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input id="appr-search" type="search" class="form-control" placeholder="Search number, title, requester..." value="${esc(f.q)}" aria-label="Search approvals">
          </div>
          <select id="appr-status" class="form-control" aria-label="Filter by status">
            <option value="awaiting"${f.status === 'awaiting' ? ' selected' : ''}>Active Backlog (Awaiting Action)</option>
            <option value=""${f.status === '' ? ' selected' : ''}>All Statuses</option>
            ${statuses.map(s => '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + s + '</option>').join('')}
          </select>
          <select id="appr-type" class="form-control" aria-label="Filter by request type">
            <option value="">All Categories</option>
            ${CONFIG.APPROVAL_TYPES.map(t => '<option' + (f.type === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('')}
          </select>
        </div>
        <div id="appr-table">${approvalsTable()}</div>
      </section>
    `;
  }

  // --- Page: Groups & Users ---
  function usersTable() {
    const q = state.userSearch.trim().toLowerCase();
    const rows = DB.users.filter(u => !q || (u.name + ' ' + u.email + ' ' + u.designation + ' ' + u.vertical + ' ' + u.role).toLowerCase().includes(q));
    return buildTable(rows, [
      { h: 'Full Name', cell: u => '<div class="font-semibold text-slate-900">' + esc(u.name) + '</div>' },
      { h: 'Official Email', cell: u => '<span class="font-mono text-xs text-slate-600">' + esc(u.email) + '</span>' },
      { h: 'Designation', cell: u => esc(u.designation) },
      { h: 'Business Vertical', cell: u => '<span class="text-xs font-medium text-slate-700">' + esc(u.vertical) + '</span>' },
      { h: 'Role', cell: u => '<span class="badge ' + (u.role === 'admin' ? 'badge-reassigned' : 'badge-withdrawn') + '">' + (u.role === 'admin' ? 'Admin' : 'User') + '</span>' },
      { h: 'Status', cell: u => '<span class="badge ' + (u.active ? 'badge-approved' : 'badge-rejected') + '">' + (u.active ? 'Active' : 'Inactive') + '</span>' },
      {
        h: 'Actions', cell: u => '<div class="flex items-center gap-1.5"><button type="button" class="btn btn-sm btn-outline !text-xs" data-action="user-edit" data-id="' + u.id + '"><i class="fa-solid fa-pen text-[10px] mr-1"></i> Edit</button>' +
          '<button type="button" class="btn btn-sm ' + (u.active ? 'btn-danger-outline' : 'btn-outline') + ' !text-xs" data-action="user-toggle" data-id="' + u.id + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button></div>'
      }
    ], 'No users match your search query.');
  }

  function pageUsers() {
    return `
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Groups & Users Directory</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Manage employee roles, approval permissions, and organizational verticals.</p>
        </div>
        <button type="button" class="btn btn-primary" data-action="user-add">
          <i class="fa-solid fa-user-plus mr-1"></i> Add Enterprise User
        </button>
      </div>

      <section class="card">
        <div class="p-4 border-b border-slate-100">
          <div class="search-box w-full max-w-sm">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input id="user-search" type="search" class="form-control" placeholder="Search by name, email, designation..." value="${esc(state.userSearch)}" aria-label="Search users">
          </div>
        </div>
        <div id="user-table">${usersTable()}</div>
      </section>
    `;
  }

  function userModal(user) {
    const edit = !!user;
    openModal({
      title: edit ? 'Edit Enterprise User' : 'Add Enterprise User', confirmText: edit ? 'Save Changes' : 'Create User',
      body: field('u-name', 'Full Name', inputCtl('u-name', { value: edit ? user.name : '' }), { required: true }) +
        field('u-email', 'Official SRM Email', inputCtl('u-email', { type: 'email', value: edit ? user.email : '', ph: 'name@srmtech.com', attrs: edit ? 'readonly' : '' }), { required: true, hint: edit ? 'Official email cannot be modified.' : 'Authorized domains: ' + esc(DOMAIN_TEXT) }) +
        field('u-designation', 'Designation / Title', inputCtl('u-designation', { value: edit ? user.designation : '' }), { required: true }) +
        field('u-vertical', 'Business Vertical', selectCtl('u-vertical', CONFIG.VERTICALS, { placeholder: 'Select vertical', value: edit ? user.vertical : '' }), { required: true }) +
        field('u-role', 'Security Role', selectCtl('u-role', CONFIG.ROLES, { value: edit ? user.role : 'user' }), { required: true }) +
        field('u-status', 'Account Status', selectCtl('u-status', ['Active', 'Inactive'], { value: edit ? (user.active ? 'Active' : 'Inactive') : 'Active' }), { required: true }) +
        field('u-password', edit ? 'Reset Demo Password' : 'Demo Password', inputCtl('u-password', { type: 'text', value: edit ? '' : '123', ph: edit ? 'Leave blank to preserve current password' : '' }), { required: !edit, hint: 'Demo sandbox simulation only.' }),
      onSubmit: (fd) => {
        const g = k => String(fd.get(k) || '').trim(), errs = {};
        const name = g('u-name'), email = g('u-email').toLowerCase(), role = g('u-role'), active = g('u-status') === 'Active';
        if (!name) errs['u-name'] = 'Enter the full name.';
        if (!edit) {
          if (!isEmail(email)) errs['u-email'] = 'Enter a valid email address.';
          else if (!isApprovedEmail(email)) errs['u-email'] = 'Must use an approved SRM domain (' + DOMAIN_TEXT + ').';
          else if (DB.users.some(u => u.email === email)) errs['u-email'] = 'A user with this email already exists.';
          if (!g('u-password')) errs['u-password'] = 'Enter a demo password.';
        }
        if (!g('u-designation')) errs['u-designation'] = 'Enter the employee designation.';
        if (!g('u-vertical')) errs['u-vertical'] = 'Select a business vertical.';
        if (edit) {
          const guard = adminGuard(user, role, active); if (guard) errs['u-role'] = guard;
        }
        if (Object.keys(errs).length) { showErrors('u-', Object.fromEntries(Object.keys(errs).map(k => [k.slice(2), errs[k]]))); return 'Please resolve the highlighted validation errors.'; }
        if (edit) {
          Object.assign(user, { name: name, designation: g('u-designation'), vertical: g('u-vertical'), role: role, active: active });
          if (g('u-password')) user.password = g('u-password');
          toast('User ' + user.name + ' successfully updated.', 'success');
        } else {
          DB.users.push({ id: 'u_' + uid(), name: name, email: email, password: g('u-password'), designation: g('u-designation'), vertical: g('u-vertical'), role: role, active: active, altEmail: '' });
          toast('User ' + name + ' created.', 'success');
        }
        persist(); route();
      }
    });
  }

  function adminGuard(user, newRole, newActive) {
    if (user.email === state.sessionEmail && !newActive) return 'You cannot deactivate your own administrative account.';
    const wasActiveAdmin = user.role === 'admin' && user.active;
    if (wasActiveAdmin && (newRole !== 'admin' || !newActive) && DB.users.filter(u => u.role === 'admin' && u.active).length <= 1) return 'At least one active administrator is required to maintain system access.';
    return '';
  }

  // --- Page: Profile ---
  function pageProfile() {
    const u = currentUser();
    return `
      <div class="mb-5">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">User Profile &amp; Preferences</h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your identity prefill data and notification settings.</p>
      </div>

      <form id="profile-form" class="card card-pad grid gap-5 sm:grid-cols-2" novalidate>
        ${field('p-name', 'Full Name', inputCtl('p-name', { value: u.name }), { required: true })}
        ${field('p-email', 'Official SRM Email', inputCtl('p-email', { value: u.email, attrs: 'readonly' }), { hint: 'Assigned corporate email.' })}
        ${field('p-designation', 'Designation / Title', inputCtl('p-designation', { value: u.designation }), { required: true })}
        ${field('p-vertical', 'Primary Business Vertical', selectCtl('p-vertical', CONFIG.VERTICALS, { placeholder: 'Select vertical', value: u.vertical }), { required: true })}
        ${field('p-altEmail', 'Secondary Notification Email', inputCtl('p-altEmail', { type: 'email', value: u.altEmail }), { optional: true, hint: 'Authorized domains: ' + esc(DOMAIN_TEXT) })}
        ${field('p-role', 'Platform Authorization Role', inputCtl('p-role', { value: u.role === 'admin' ? 'Administrator' : 'Employee User', attrs: 'readonly' }), { hint: 'Assigned by your IT administrator.' })}
        <div class="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Profile Details</button>
        </div>
      </form>
    `;
  }

  function saveProfile() {
    const g = id => $('#' + id).value.trim(), errs = {}, u = currentUser();
    if (!g('p-name')) errs.name = 'Enter your full name.';
    if (!g('p-designation')) errs.designation = 'Enter your designation.';
    if (!g('p-vertical')) errs.vertical = 'Select your business vertical.';
    const alt = g('p-altEmail').toLowerCase();
    if (alt && !isEmail(alt)) errs.altEmail = 'Enter a valid email address.';
    else if (alt && !isApprovedEmail(alt)) errs.altEmail = 'Alternative email must belong to an SRM domain (' + DOMAIN_TEXT + ').';
    else if (alt && alt === u.email) errs.altEmail = 'Alternative email must be distinct from your official email.';
    showErrors('p-', errs);
    if (Object.keys(errs).length) return;
    Object.assign(u, { name: g('p-name'), designation: g('p-designation'), vertical: g('p-vertical'), altEmail: alt });
    persist(); route(); toast('Profile details saved successfully.', 'success');
  }

  // --- Page: Admin Profile Card ---
  function pageProfileCard() {
    const u = currentUser();
    const myApprovalsCount = DB.requests.filter(r => r.approverEmail === u.email).length;
    const pendingActionCount = awaitingMine().length;
    const totalRequestsCount = DB.requests.length;

    return `
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="badge bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-[11px] px-2 py-0.5">
              <i class="fa-solid fa-shield-halved mr-1"></i> Admin Privileges
            </span>
            <span class="text-xs text-slate-400 font-mono">ID: ${esc(u.id)}</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Enterprise Profile Card</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Corporate credentials, administrative authority, and identity parameters.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-outline !text-xs !py-2" data-action="go" data-page="users">
            <i class="fa-solid fa-users-gear mr-1.5"></i> Manage Users
          </button>
          <button type="button" class="btn btn-primary !text-xs !py-2" data-action="go" data-page="profile">
            <i class="fa-solid fa-pen mr-1.5"></i> Edit Profile Info
          </button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Main Identity Card (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          <div class="card overflow-hidden">
            <!-- Top Banner -->
            <div class="h-32 bg-gradient-to-r from-navy-800 via-blue-900 to-indigo-900 p-6 flex items-start justify-between relative overflow-hidden">
              <div class="absolute -right-8 -bottom-8 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
                  <i class="fa-solid fa-check-circle text-emerald-400 text-[10px]"></i> Active Administrator
                </span>
              </div>
              <span class="font-mono text-xs text-blue-200/70 tracking-wider">SRM Technologies Governance</span>
            </div>

            <!-- Avatar & Primary Info -->
            <div class="px-6 pb-6 pt-0 relative">
              <div class="flex flex-wrap items-end justify-between gap-4 -mt-12 mb-4">
                <div class="relative">
                  <div class="avatar !w-24 !h-24 !text-2xl font-extrabold bg-blue-600 text-white ring-4 ring-white shadow-lg">
                    ${esc(initials(u.name))}
                  </div>
                  <span class="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white" title="Active Account"></span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="badge badge-approved text-xs px-2.5 py-1 font-semibold">
                    <i class="fa-solid fa-lock text-[10px] mr-1"></i> Role: Administrator
                  </span>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>${esc(u.name)}</span>
                  <i class="fa-solid fa-circle-check text-blue-600 text-sm" title="Verified Enterprise Identity"></i>
                </h3>
                <p class="text-sm font-medium text-slate-600 mt-0.5">${esc(u.designation || 'Enterprise Administrator')}</p>
              </div>

              <!-- Information Grid -->
              <div class="grid gap-4 sm:grid-cols-2 mt-6 pt-6 border-t border-slate-100">
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span class="text-xs text-slate-500 font-medium block">Official Corporate Email</span>
                  <span class="font-mono text-xs font-semibold text-slate-900 break-all">${esc(u.email)}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span class="text-xs text-slate-500 font-medium block">Secondary / Notification Email</span>
                  <span class="font-mono text-xs font-semibold text-slate-900 break-all">${esc(u.altEmail || 'None configured')}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span class="text-xs text-slate-500 font-medium block">Organizational Vertical</span>
                  <span class="text-xs font-semibold text-slate-900">${esc(u.vertical || 'Corporate Functions')}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span class="text-xs text-slate-500 font-medium block">Account Authority &amp; Scope</span>
                  <span class="text-xs font-semibold text-slate-900">Full System Administration &amp; Audit</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Administrative Capabilities Card -->
          <div class="card card-pad">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
              <i class="fa-solid fa-key text-blue-600"></i> Assigned Administrative Authorities
            </h3>
            <div class="grid gap-3 sm:grid-cols-2 text-xs">
              <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Groups &amp; Users Management</span>
                  <span class="text-slate-500">Create, edit, and deactivate enterprise employees and groups.</span>
                </div>
              </div>
              <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Cross-Vertical Approval Authority</span>
                  <span class="text-slate-500">Authorized to sign off, reassign, or reject governance proposals.</span>
                </div>
              </div>
              <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Full Audit &amp; Revision Log Access</span>
                  <span class="text-slate-500">Inspect version histories, timeline events, and notification logs.</span>
                </div>
              </div>
              <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Security &amp; Token Overrides</span>
                  <span class="text-slate-500">Generate OTP bypass and revoke secure external action links.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Summary Stats (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          <div class="card card-pad">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 mb-3 flex items-center gap-2">
              <i class="fa-solid fa-chart-pie text-indigo-600"></i> Governance Metrics
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span class="text-xs text-slate-600 font-medium">Pending Approvals</span>
                <span class="font-mono text-sm font-bold text-amber-600">${pendingActionCount}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span class="text-xs text-slate-600 font-medium">Requests Handled</span>
                <span class="font-mono text-sm font-bold text-blue-600">${myApprovalsCount}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span class="text-xs text-slate-600 font-medium">Total System Records</span>
                <span class="font-mono text-sm font-bold text-slate-900">${totalRequestsCount}</span>
              </div>
            </div>
          </div>

          <div class="card card-pad">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 mb-3 flex items-center gap-2">
              <i class="fa-solid fa-sliders text-blue-600"></i> Quick Settings Navigation
            </h3>
            <div class="space-y-2">
              <button type="button" class="btn btn-outline w-full justify-start !text-xs !py-2" data-action="go" data-page="users">
                <i class="fa-solid fa-users-gear mr-2 text-slate-500"></i> Group &amp; Users Directory
              </button>
              <button type="button" class="btn btn-outline w-full justify-start !text-xs !py-2" data-action="go" data-page="profile">
                <i class="fa-solid fa-user-pen mr-2 text-slate-500"></i> Profile Preferences
              </button>
              <button type="button" class="btn btn-outline w-full justify-start !text-xs !py-2" data-action="open-email-outbox">
                <i class="fa-solid fa-paper-plane mr-2 text-slate-500"></i> Email Delivery Outbox
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Requirement 2: Dedicated Request Details Page (Separate Full Screen) ---
  // --- Version History & Strikethrough Audit Trail Card (Removed from UI per requirements) ---
  function renderVersionHistoryCard() {
    return '';
  }

  // --- Dedicated Request Details Page (Separate Full Screen) ---
  function pageRequest(rt) {
    const req = findReq(rt.id);
    if (!req) {
      return `
        <div class="card empty">
          <i class="fa-solid fa-file-circle-xmark text-4xl text-slate-300 mb-3 block"></i>
          <h3 class="text-base font-bold text-slate-800">Request Not Found</h3>
          <p class="text-xs text-slate-500 mt-1">This request does not exist or may have been deleted.</p>
          <div class="mt-4">
            <button type="button" class="btn btn-outline" data-action="go" data-page="my-requests">Back to My Requests</button>
          </div>
        </div>
      `;
    }

    const act = isActive(req);
    const owner = isOwner(req);
    const myApproval = isMyApproval(req);
    const otpVerified = isActionOtpVerified(req);
    const isViewOnly = !!state.viewOnlyMode;

    const requested = Number(req.amount) || 0;
    const budgeted = Number(req.amountBudgeted) || 0;
    const isOver = req.budgeted !== 'No' && budgeted > 0 && requested > budgeted;
    const variance = requested - budgeted;
    const pct = budgeted > 0 ? Math.min(150, Math.round((requested / budgeted) * 100)) : (requested > 0 ? 100 : 0);

    let navSource = state.navState;
    if (!navSource || !navSource.page || typeof navSource.page !== 'string' || navSource.page === 'dashboard') {
      try {
        const stored = JSON.parse(sessionStorage.getItem('ea_nav_source'));
        if (stored && stored.page && typeof stored.page === 'string' && stored.page !== 'dashboard') {
          navSource = stored;
        }
      } catch (_) { }
    }
    if (!navSource || !navSource.page || typeof navSource.page !== 'string' || navSource.page === 'dashboard') {
      navSource = { page: 'approvals', status: state.apprFilters.status, type: state.apprFilters.type, q: state.apprFilters.q, p: state.apprFilters.page };
      state.navState = navSource;
    }

    const sourceLabel = navSource.page === 'approvals' ? 'Approval List' :
      navSource.page === 'my-requests' ? 'My Requests' :
        navSource.page === 'notifications' ? 'Notifications' : 'Approval List';


    return `
      <!-- Top Breadcrumb & Return Action -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <button type="button" class="btn btn-sm btn-outline !text-xs font-semibold" data-action="back-from-request">
            <i class="fa-solid fa-arrow-left mr-1.5"></i> Back to ${sourceLabel}
          </button>
          <span class="text-slate-300">/</span>
          <span class="font-medium text-slate-700">${esc(sourceLabel)}</span>
          <span class="text-slate-300">/</span>
          <span class="font-mono font-bold text-slate-900">${esc(req.number)}</span>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-sm btn-outline !text-xs font-mono" data-action="copy-number" data-num="${esc(req.number)}" title="Copy Request ID">
            <i class="fa-regular fa-copy mr-1"></i> Copy ID
          </button>
        </div>
      </div>

      <!-- View-Only Link Banner -->
      ${isViewOnly ? `
        <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 mb-6 flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <i class="fa-solid fa-eye text-sm"></i>
            </div>
            <div>
              <div class="font-bold text-sm">Secure View-Only Platform Mode</div>
              <div class="text-xs text-blue-700 mt-0.5">You are accessing this proposal with read-only permissions via a secure external token. Privileged modifications and approvals are disabled.</div>
            </div>
          </div>
          <span class="badge badge-reassigned text-xs font-mono font-bold">READ ONLY</span>
        </div>
      ` : ''}

      <!-- Header Card with Decision Action Toolbar -->
      <section class="card card-pad mb-6 bg-white border-slate-200 shadow-sm">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">${esc(req.number)}</span>
              ${statusBadge(req)}
              <span class="text-xs text-slate-500 font-medium">Revision v${req.version}</span>
              ${isOverdue(req) ? '<span class="chip chip-danger !text-xs"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Overdue</span>' :
        (isDueSoon(req) ? '<span class="chip chip-warn !text-xs"><i class="fa-solid fa-clock text-[10px]"></i> ' + (daysLeft(req) === 0 ? 'Due Today' : 'Due in ' + daysLeft(req) + 'd') + '</span>' : '')}
            </div>
            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words">${esc(req.title)}</h1>
          </div>

          <!-- Appropriate Action Buttons Based on Status & User Role (Hidden in View-Only Mode) -->
          ${!isViewOnly ? `
            <div class="flex flex-wrap items-center gap-2">
              <!-- Requester Pending Actions: Remind, Modify, Withdraw -->
              ${owner && act ? `
                <button type="button" class="btn btn-outline" data-action="remind" data-id="${req.id}">
                  <i class="fa-regular fa-bell mr-1"></i> Remind Approver
                </button>
                <button type="button" class="btn btn-primary" data-action="start-modify" data-id="${req.id}">
                  <i class="fa-solid fa-pen-to-square mr-1"></i> Modify Request
                </button>
                <button type="button" class="btn btn-danger-outline" data-action="withdraw" data-id="${req.id}">
                  <i class="fa-solid fa-ban mr-1"></i> Withdraw Request
                </button>
              ` : ''}

              <!-- Requester Under Modification / Clarification Actions -->
              ${owner && (isUnderMod(req) || isClarify(req)) ? `
                <button type="button" class="btn btn-primary" data-action="open-modify" data-id="${req.id}">
                  <i class="fa-solid fa-arrow-up-from-bracket mr-1"></i> Edit &amp; Resubmit (v${req.version + 1})
                </button>
                <button type="button" class="btn btn-danger-outline" data-action="withdraw" data-id="${req.id}">
                  <i class="fa-solid fa-ban mr-1"></i> Withdraw Request
                </button>
              ` : ''}

              <!-- Approver Decision Toolbar (Only if assigned approver) -->
              ${myApproval && act ? (
          otpVerified ? `
                  <span class="badge badge-approved text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5"><i class="fa-solid fa-shield-halved text-[11px]"></i> Approver Identity Verified</span>
                ` : `
                
                `
        ) : ''}
            </div>
          ` : ''}
        </div>

        <!-- Modification Required Banner -->
        ${isUnderMod(req) ? `
          <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 mt-5">
            <div class="flex items-center gap-2 font-bold text-sm">
              <i class="fa-solid fa-pen-ruler text-blue-600"></i>
              <span>Request Reopened for Requester Modification</span>
            </div>
            <p class="text-xs text-blue-800 mt-1">Active approver sign-offs are paused. The requester is preparing Revision v${req.version + 1}. Outdated revisions cannot be approved.</p>
          </div>
        ` : ''}

        <!-- Clarification Banner -->
        ${isClarify(req) && req.clarification ? `
          <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mt-5">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 font-bold text-sm">
                <i class="fa-solid fa-circle-question text-amber-600"></i>
                <span>Clarification Inquiry from ${esc(req.clarification.by)}</span>
              </div>
              <span class="text-xs opacity-75 font-mono">${fmtDateTime(req.clarification.at)}</span>
            </div>
            <div class="prewrap text-xs sm:text-sm mt-1.5 text-amber-800">${esc(req.clarification.text)}</div>
          </div>
        ` : ''}

        <!-- Decision Banner -->
        ${req.decision ? `
          <div class="p-4 rounded-xl mt-5 ${req.decision.type === 'Approved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'}">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 font-bold text-sm">
                <i class="fa-solid ${req.decision.type === 'Approved' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'}"></i>
                <span>${req.decision.type === 'Approved' ? 'Official Executive Approval' : 'Formally Rejected'} by ${esc(req.decision.by)}</span>
              </div>
              <span class="text-xs opacity-75">${fmtDateTime(req.decision.at)}</span>
            </div>
            ${req.approvalRef ? `<div class="mt-2 font-mono text-xs font-bold px-2.5 py-1 bg-white/70 rounded border border-emerald-200 inline-block">Audit Approval Reference: ${esc(req.approvalRef)}</div>` : ''}
            <div class="prewrap text-xs sm:text-sm mt-2">${esc(req.decision.reason)}</div>
            ${req.decision.files && req.decision.files.length ? `
              <div class="mt-3 pt-2 border-t border-rose-200/60">
                <span class="text-xs font-bold block mb-1.5">Supporting Rejection Documents:</span>
                <div class="grid gap-2 sm:grid-cols-2">
                  ${req.decision.files.map(fileCard).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Withdrawn Banner -->
        ${isWithdrawn(req) ? `
          <div class="p-4 rounded-xl mt-5 bg-slate-100 border border-slate-200 text-slate-800">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <b class="text-sm flex items-center gap-1.5"><i class="fa-solid fa-ban text-slate-500"></i> Formally Withdrawn by Requester</b>
              <span class="text-xs text-slate-500 font-mono">${fmtDateTime(req.updatedAt)}</span>
            </div>
            <div class="mt-2 text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">
              <span class="font-bold text-slate-900">Mandatory Withdrawal Reason:</span> "${esc(req.withdrawReason || 'No reason provided.')}"
            </div>
          </div>
        ` : ''}
      </section>

      <!-- 2-Column Responsive Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- Left 8 Columns: Request Details & Financial Analysis -->
        <div class="lg:col-span-8 space-y-6">

          <!-- Request Overview & Justification -->
          <section class="card card-pad">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <i class="fa-solid fa-file-lines text-blue-600"></i> Request Overview &amp; Justification
              </h2>
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">${esc(req.type)}</span>
            </div>

            <div class="space-y-4">
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Details of Request</span>
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 prewrap leading-relaxed">
                  ${esc(req.details)}
                </div>
              </div>

              <div>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Operational &amp; Commercial Justification</span>
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 prewrap leading-relaxed">
                  ${esc(req.reason)}
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span class="text-slate-500 font-medium block">Approval Category</span>
                  <span class="font-bold text-slate-800">${esc(req.type)}</span>
                </div>
                <div>
                  <span class="text-slate-500 font-medium block">Initial Submission Date</span>
                  <span class="font-medium text-slate-800">${fmtDateTime(req.createdAt)}</span>
                </div>
                <div>
                  <span class="text-slate-500 font-medium block">Current Revision State</span>
                  <span class="font-medium text-slate-800">v${req.version} · ${fmtDateTime(req.updatedAt)}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Budget & Financial Analysis -->
          <section class="card card-pad">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <i class="fa-solid fa-coins text-amber-600"></i> Budget &amp; Financial Analysis
              </h2>
              <span class="text-xs font-mono font-bold ${isOver ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'}">
                ${isOver ? 'Exceeds Allocated Budget' : 'Within Budget Allocation'}
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Expected Amount (Incl. Tax)</span>
                <span class="font-mono text-lg font-extrabold text-slate-900">${fmtINR(req.amount)}</span>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Allocated Budget</span>
                <span class="font-mono text-lg font-bold text-slate-800">${req.budgeted === 'No' ? 'None (₹ 0)' : fmtINR(req.amountBudgeted)}</span>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Budget Variance</span>
                <span class="font-mono text-lg font-bold ${variance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                  ${variance > 0 ? '+' + fmtINR(variance) : fmtINR(variance)}
                </span>
              </div>
            </div>

            <!-- Visual Progress Bar -->


            ${(isOver || req.extraReason) ? `
              <div class="mt-5 pt-4 border-t border-slate-100">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Details of Request</span>
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 prewrap leading-relaxed break-words whitespace-pre-wrap">
                  ${esc(req.extraReason || 'Expense exceeds pre-approved budget line items.')}
                </div>
              </div>
            ` : ''}
          </section>

          <!-- Supporting Documents & Attachments -->
          <section class="card card-pad">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <i class="fa-solid fa-paperclip text-blue-600"></i> Supporting Attachments
              </h2>
              <span class="text-xs text-slate-500 font-semibold">${req.attachments ? req.attachments.length : 0} of ${CONFIG.MAX_ATTACHMENTS} uploaded</span>
            </div>

            ${req.attachments && req.attachments.length ? `
              <div class="grid gap-3">
                ${req.attachments.map(fileCard).join('')}
              </div>
            ` : `
              <div class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <i class="fa-regular fa-folder-open text-2xl mb-1.5 block"></i>
                No supporting attachments uploaded for this request.
              </div>
            `}
          </section>

          <!-- Reassignment History if Delegated -->
          ${req.reassignments && req.reassignments.length ? `
            <section class="card card-pad">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <i class="fa-solid fa-arrow-right-arrow-left text-indigo-600"></i> Delegation &amp; Reassignment History
                </h2>
                <span class="text-xs text-slate-500 font-mono">${req.reassignCount} of ${CONFIG.MAX_REASSIGN} used</span>
              </div>

              <div class="space-y-3">
                ${req.reassignments.map(r => `
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div class="flex items-center justify-between text-slate-500 font-mono mb-1.5">
                      <span>${fmtDateTime(r.at)}</span>
                      <span class="font-bold text-slate-700">${esc(r.oldNumber)} → ${esc(r.newNumber)}</span>
                    </div>
                    <div class="text-slate-800 font-medium">
                      <span class="text-slate-500">Transferred From:</span> <b class="text-slate-900">${esc(r.fromName)}</b>
                      <i class="fa-solid fa-arrow-right text-[10px] text-slate-400 mx-2"></i>
                      <span class="text-slate-500">To:</span> <b class="text-slate-900">${esc(r.toName)}</b>
                    </div>
                    <div class="text-slate-600 mt-1.5 italic">"${esc(r.reason)}"</div>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}
        </div>

        <!-- Right 4 Columns: Requester, Approver, & Activity History -->
        <div class="lg:col-span-4 space-y-6">

          <!-- Requester Details Card -->
          <section class="card card-pad">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <i class="fa-solid fa-user-tie text-indigo-600"></i> Requester Profile
            </h2>

            <div class="flex items-start gap-3 mb-4">
              <div class="avatar !w-12 !h-12 !text-base font-bold bg-indigo-100 text-indigo-700 flex-shrink-0">
                ${initials(req.requesterName)}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-bold text-slate-900">${esc(req.requesterName)}</h3>
                
                <!-- Explicitly display official requester email -->
                <p class="text-xs text-slate-600 font-mono break-all mt-0.5">${esc(req.requesterEmail)}</p>
                <span class="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  ${esc(req.vertical || 'SRM Enterprise')}
                </span>
              </div>
            </div>

            <div class="space-y-2.5 text-xs pt-2 border-t border-slate-100">
              <div>
                <span class="text-slate-500 font-medium block">CC Notification Email</span>
                <span class="font-mono text-slate-700">${esc(req.ccEmail || 'None configured')}</span>
              </div>
             
            </div>
          </section>

          <!-- Approver Details Card -->
          <section class="card card-pad">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <i class="fa-solid fa-user-check text-emerald-600"></i> Assigned Approver
            </h2>

            <div class="flex items-start gap-3 mb-3">
              <div class="avatar !w-12 !h-12 !text-base font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
                ${initials(req.approverName)}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-bold text-slate-900">${esc(req.approverName)}</h3>
                <p class="text-xs text-slate-600 font-mono break-all mt-0.5">${esc(req.approverEmail)}</p>
                <p class="text-xs text-slate-500 mt-1">Deadline Date: <b class="text-slate-800 font-semibold">${fmtDate(req.deadline)}</b></p>
              </div>
            </div>
          </section>

          <!-- Chronological Activity Timeline -->
          <section class="card card-pad">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <i class="fa-solid fa-timeline text-indigo-600"></i> Request Activity &amp; Approval History
            </h2>

            <ol class="timeline">
              ${req.timeline && req.timeline.length ? req.timeline.map(x => `
                <li>
                  <div class="flex items-center justify-between flex-wrap gap-1">
                    <span class="font-bold text-xs text-slate-900">${esc(x.action)}</span>
                    <span class="text-[11px] text-slate-400 font-mono">${fmtDateTime(x.at)}</span>
                  </div>
                  <div class="text-xs text-slate-500 mt-0.5">by <span class="font-medium text-slate-700">${esc(x.by)}</span></div>
                  ${x.note ? '<div class="prewrap text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-1.5 border border-slate-100 leading-relaxed">' + esc(x.note) + '</div>' : ''}
                </li>
              `).join('') : '<li class="text-xs text-slate-400">No events recorded.</li>'}
            </ol>
          </section>
        </div>
      </div>

      <!-- Approver Action Suite at Bottom of Request Page (Protected by OTP) -->
      ${!isViewOnly && myApproval && act ? `
        <section class="card card-pad mt-6 ${otpVerified ? 'bg-white border-emerald-300 shadow-md' : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-blue-200'}">
          ${otpVerified ? `
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  <i class="fa-solid fa-clipboard-check text-emerald-600"></i> Approver Decision Suite
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Approver identity verified via OTP for Revision v${req.version}. Select your action below:</p>
              </div>
              <span class="badge badge-approved text-xs font-semibold"><i class="fa-solid fa-shield-halved text-[10px]"></i> OTP Session Active</span>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="btn btn-success shadow-sm" data-action="action-approve" data-id="${req.id}">
                <i class="fa-solid fa-circle-check mr-1.5"></i> Approve
              </button>
              <button type="button" class="btn btn-orange shadow-sm" data-action="action-clarify" data-id="${req.id}">
                <i class="fa-solid fa-circle-question mr-1.5"></i> Seek Clarification
              </button>
          
              <button type="button" class="btn btn-purple shadow-sm" data-action="action-delegate" data-id="${req.id}" ${req.reassignCount >= CONFIG.MAX_REASSIGN ? 'disabled' : ''}>
                <i class="fa-solid fa-user-gear mr-1.5"></i> Re-assign to Other Approver (${req.reassignCount || 0}/2)
              </button>
                <button type="button" class="btn btn-danger shadow-sm" data-action="action-reject" data-id="${req.id}">
                <i class="fa-solid fa-circle-xmark mr-1.5"></i> Reject Request
              </button>
            </div>
          ` : `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  <i class="fa-solid fa-shield-halved text-blue-600"></i> Approver Verification Required (TAKE ACTION)
                </h3>
                <p class="text-xs text-slate-600 mt-1 max-w-2xl">
                  Full decision permissions (Approve, Seek Clarification, Reject, Reassign) require two-factor identity verification. Enter the OTP dispatched to your official email (<b>${esc(req.approverEmail)}</b>) to unlock decision controls.
                </p>
              </div>
              <button type="button" class="btn btn-primary shadow-sm whitespace-nowrap" data-action="start-approver-otp" data-id="${req.id}">
                <i class="fa-solid fa-key mr-1.5"></i> Verify OTP / TAKE ACTION
              </button>
            </div>
          `}
        </section>
      ` : ''}
    `;
  }

  // --- Page: Modify Request ---
  const MOD_FIELDS = [
    { k: 'title', l: 'Request Title', t: 'text' }, { k: 'type', l: 'Approval Type', t: 'select', o: CONFIG.APPROVAL_TYPES },
    { k: 'amount', l: 'Expected Amount (INR)', t: 'number' }, { k: 'budgeted', l: 'Is This Budgeted?', t: 'select', o: CONFIG.BUDGET_OPTIONS },
    { k: 'amountBudgeted', l: 'Amount Budgeted (INR)', t: 'number' }, { k: 'extraReason', l: 'Reason for Extra Expense', t: 'text' },
    { k: 'approverName', l: 'Approver Name', t: 'text' }, { k: 'approverEmail', l: 'Approver Email', t: 'email' },
    { k: 'deadline', l: 'Approval Deadline', t: 'date' }, { k: 'details', l: 'Details of Request', t: 'textarea' },
    { k: 'reason', l: 'Reason for Requirement', t: 'textarea' }, { k: 'ccEmail', l: 'CC Email for logs', t: 'email' }
  ];

  function pageModify(rt) {
    const req = findReq(rt.id);
    if (!req || !isOwner(req)) return '<div class="card empty">This request was not found, or you do not have permission to modify it.</div>';

    // Status must be either under modification or clarification required
    if (!isUnderMod(req) && !isClarify(req)) {
      return '<div class="card empty">This request is currently locked for review.<div class="mt-4"><button type="button" class="btn btn-outline" data-action="view-request" data-id="' + req.id + '">View Details</button></div></div>';
    }

    state.drafts.modify = { stakeholders: [], files: [] };
    const rows = MOD_FIELDS.map(m => {
      const id = 'm-' + m.k; let ctl;
      const curVal = req[m.k] === '' ? '-' : (m.k.includes('amount') ? fmtINR(req[m.k]) : req[m.k]);
      if (m.t === 'select') ctl = '<select id="' + id + '" class="form-control" data-mod="1"><option value="">Keep previous value (' + esc(req[m.k] || 'None') + ')</option>' + m.o.map(x => '<option value="' + esc(x) + '">' + esc(x) + '</option>').join('') + '</select>';
      else if (m.t === 'textarea') ctl = '<textarea id="' + id + '" class="form-control" data-mod="1" placeholder="Enter replacement value or leave blank to keep previous" style="min-height:5rem"></textarea>';
      else ctl = '<input id="' + id + '" type="' + m.t + '" class="form-control" data-mod="1" ' + (m.t === 'number' ? 'min="0" step="any" ' : '') + (m.t === 'date' ? 'min="' + minDeadlineISO() + '" ' : '') + 'placeholder="Enter replacement value or leave blank to keep previous">';

      return `
        <div class="mod-row p-4 border-b border-slate-100 last:border-0" data-modrow>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="badge badge-old !text-[10px] font-bold uppercase"><i class="fa-solid fa-lock text-[9px] mr-1"></i> Original Record (v${req.version})</span>
                <span class="text-xs font-semibold text-slate-700">${esc(m.l)}</span>
              </div>
              <div class="p-3 rounded-lg bg-slate-100/90 border border-slate-200 text-sm text-slate-700 font-medium select-none">
                ${esc(curVal)}
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Non-editable previous record. Preserved permanently in database history.</p>
            </div>
            <div class="field">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="badge badge-new !text-[10px] font-bold uppercase"><i class="fa-solid fa-pen text-[9px] mr-1"></i> New Replacement Record</span>
                <span class="text-xs font-semibold text-slate-700">${esc(m.l)}</span>
              </div>
              ${ctl}
              <p class="err" data-err="${id}" role="alert"></p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const free = CONFIG.MAX_ATTACHMENTS - req.attachments.length;
    return `
      <div class="mb-5 flex items-center justify-between">
        <div>
          <button type="button" class="btn btn-sm btn-outline mb-2" data-action="view-request" data-id="${req.id}"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Request Details</button>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Modify Proposal (${esc(req.number)})</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Creating Revision v${req.version + 1}. All previous values are preserved permanently in database revision history.</p>
        </div>
      </div>

      ${req.clarification && isClarify(req) ? `
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mb-5">
          <b class="text-sm flex items-center gap-1.5"><i class="fa-solid fa-circle-question text-amber-600"></i> ${esc(req.clarification.by)} inquired:</b>
          <div class="prewrap text-xs sm:text-sm mt-1 text-amber-800">${esc(req.clarification.text)}</div>
        </div>
      ` : ''}

      <form id="modify-form" class="grid gap-6" novalidate>
        <section class="card overflow-hidden">${rows}</section>

        <section class="card card-pad">
          <h3 class="card-title text-base font-bold mb-4 flex items-center gap-2">
            <i class="fa-solid fa-paperclip text-blue-600"></i> Additional Stakeholders &amp; Attachments
          </h3>
          <div class="field mb-4">
            <label for="m-stake-input" class="lbl">Add Stakeholder Emails <span class="opt">Optional</span></label>
            <div class="chip-input-wrap">${req.stakeholders.map(e => '<span class="chip font-mono text-xs">' + esc(e) + '</span>').join('')}<span id="m-stake-chips" style="display:contents"></span></div>
            <input id="m-stake-input" type="text" class="form-control" placeholder="Type email and press Enter...">
            <p class="err" data-err="m-stake" role="alert"></p>
          </div>
          <div class="field mb-4">
            <label class="lbl flex items-center gap-2">
              <span>Preserved Existing Attachments</span>
              <span class="badge badge-old !text-[10px]">Non-Editable</span>
            </label>
            <div class="grid gap-2 mb-3">${req.attachments.length ? req.attachments.map(fileCard).join('') : '<span class="text-xs text-slate-400">None attached</span>'}</div>
            ${free > 0 ? `
              <label for="m-file-input" class="lbl flex items-center gap-2 mt-3">
                <span class="badge badge-new !text-[10px]">Upload Additional Attachments</span>
                <span class="opt">Up to ${free} additional</span>
              </label>
              <input id="m-file-input" type="file" class="form-control" multiple>
              <p class="hint">Allowed: PDF, DOCX, XLSX, Images up to 10MB each.</p>
              <div id="m-file-list" class="mt-2 grid gap-2"></div>
            ` : '<p class="text-xs text-slate-400">Maximum attachment capacity reached.</p>'}
            <p class="err" data-err="m-file" role="alert"></p>
          </div>
          ${field('m-note', 'Revision Notes for Approver', textareaCtl('m-note', { ph: 'Explain the changes and newly added values in this revision...', attrs: 'style="min-height:4.5rem"' }), { optional: true })}
        </section>

        <p class="err" data-err="m-_form" role="alert"></p>

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" class="btn btn-primary !py-2.5 !px-6"><i class="fa-solid fa-arrow-up-from-bracket mr-1.5"></i> Resubmit For Approval (v${req.version + 1})</button>
          <button type="button" class="btn btn-outline" data-action="view-request" data-id="${req.id}">Cancel</button>
        </div>
      </form>
    `;
  }

  function submitModify() {
    const req = findReq(state.route.id); if (!req) return;
    const addOk = addStakeholders('modify', $('#m-stake-input').value);
    const cur = {}; MOD_FIELDS.forEach(m => { cur[m.k] = req[m.k]; });
    const fin = Object.assign({}, cur);
    MOD_FIELDS.forEach(m => {
      const nv = ($('#m-' + m.k).value || '').trim();
      if (nv !== '') fin[m.k] = m.t === 'number' ? Number(nv) : (m.k === 'approverEmail' || m.k === 'ccEmail' ? nv.toLowerCase() : nv);
    });
    if (fin.budgeted === 'No') fin.amountBudgeted = 0;
    const errs = validateRequestData(Object.assign({}, fin, { requesterName: req.requesterName, requesterEmail: req.requesterEmail }));
    if (!addOk) errs.stake = 'Fix the stakeholder email above before resubmitting.';
    const changes = {}; MOD_FIELDS.forEach(m => { if (fin[m.k] !== cur[m.k]) changes[m.k] = fin[m.k]; });
    const d = state.drafts.modify, note = $('#m-note').value.trim();
    if (!Object.keys(changes).length && !d.files.length && !d.stakeholders.length && !note) errs._form = 'Please make at least one change or provide a revision note before resubmitting.';
    showErrors('m-', errs);
    if (Object.keys(errs).length) return;
    wfResubmit(req, changes, d.stakeholders.slice(), d.files.slice(), note, me());
    state.drafts.modify = { stakeholders: [], files: [] };
    go('request/' + req.id);
    toast('Request ' + req.number + ' resubmitted for sign-off (v' + req.version + ').', 'success');
  }

  /* =======================================================
     12. DECISION ACTIONS & MODALS
     ======================================================= */
  function confirmWithReason(o) {
    openModal({
      title: o.title, confirmText: o.confirmText, btnClass: o.btnClass,
      body: (o.intro ? '<p class="text-xs text-slate-500 mb-2">' + o.intro + '</p>' : '') + (o.extra || '') + modalReason(o.label, o.ph),
      onSubmit: fd => {
        const reason = String(fd.get('m-reason') || '').trim();
        if (!reason) { showErrors('m-', { reason: o.error }); return o.error; }
        return o.run(reason, fd);
      }
    });
  }

  // --- Approver Two-Factor OTP Verification Modal ---
  function openApproverOtpModal(req, onVerified) {
    if (!req) return;
    const otpRes = OTPService.generateForApprover(req.approverEmail, req);
    if (!otpRes.ok && otpRes.error && !otpRes.error.includes('wait')) {
      toast(otpRes.error, 'error');
    }

    const rec = DB.otps ? DB.otps[req.approverEmail + '_' + req.id] : null;
    const demoCode = rec ? rec.code : '1111';

    openModal({
      title: 'Approver Identity Verification (2FA)',
      confirmText: 'Verify OTP & Unlock Decisions',
      btnClass: 'btn-primary',
      body: `
        <div class="space-y-4">
          <div class="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <i class="fa-solid fa-shield-halved text-blue-600 text-lg mt-0.5 flex-shrink-0"></i>
            <div class="text-xs text-blue-900 leading-relaxed">
              A cryptographically generated 4-digit security code has been sent to official email <b>${esc(req.approverEmail)}</b> for request <b>${esc(req.number)}</b>. Enter the code to authorize your governance session.
            </div>
          </div>

          <div class="field">
            <label for="appr-otp-input" class="lbl text-center block text-slate-700 font-bold mb-1">Enter 4-Digit Verification OTP</label>
            <div class="max-w-xs mx-auto">
              <input id="appr-otp-input" name="appr-otp-input" type="text" maxlength="4" autofocus
                class="form-control text-center font-mono text-2xl font-bold tracking-widest text-slate-900"
                placeholder="••••" autocomplete="one-time-code" required>
            </div>
            <p class="hint text-center mt-2 text-slate-500">
              Sandbox Demo: Use code <b class="font-mono text-blue-600">${demoCode}</b> or Master Code <b class="font-mono text-blue-600">1111</b>.
            </p>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span class="text-slate-500">Code expires in 10 minutes (Single use).</span>
            <button type="button" class="btn btn-sm btn-outline !text-xs" data-action="resend-approver-otp" data-id="${req.id}">
              <i class="fa-solid fa-rotate-right mr-1"></i> Resend Code
            </button>
          </div>
        </div>
      `,
      onSubmit: fd => {
        const code = String(fd.get('appr-otp-input') || '').trim();
        if (!code) return 'Please enter the 4-digit OTP code.';
        const v = OTPService.verify(req.approverEmail, req.id, code, req.version);
        if (!v.ok) {
          return v.error;
        }

        // OTP verified successfully
        state.verifiedActionSessions[req.id] = { version: req.version, at: ts() };
        toast('Approver identity verified. Action permissions granted.', 'success');
        if (onVerified) {
          onVerified();
        } else {
          route();
        }
      }
    });
  }

  // --- Audit Email Outbox & Delivery Center Modal ---
  function openEmailOutboxModal() {
    const emails = DB.emails || [];
    openModal({
      title: 'Audit Email Outbox & Delivery Center (' + emails.length + ' Dispatched)',
      large: true,
      hideFooter: true,
      body: `
        <div class="space-y-4">
          <p class="text-xs text-slate-500">All transactional emails, OTP dispatches, and stakeholder notifications generated by EasyApprove are logged below for governance compliance and inspection.</p>
          
          <div class="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            ${emails.length ? `
              <table class="data-table w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th class="p-3">Sent Time</th>
                    <th class="p-3">Recipient (To)</th>
                    <th class="p-3">Subject &amp; Reference</th>
                    <th class="p-3">Template</th>
                    <th class="p-3">Status</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${emails.map(e => `
                    <tr class="hover:bg-slate-50/70">
                      <td class="p-3 text-slate-500 font-mono whitespace-nowrap">${fmtDateTime(e.sentAt)}</td>
                      <td class="p-3 font-mono font-medium text-slate-800">${esc(e.to)}</td>
                      <td class="p-3 font-semibold text-slate-900">${esc(e.subject)}</td>
                      <td class="p-3"><span class="chip font-mono !text-[10px] uppercase">${esc(e.template)}</span></td>
                      <td class="p-3"><span class="badge badge-approved !text-[11px]"><i class="fa-solid fa-check text-[10px]"></i> ${esc(e.status)}</span></td>
                      <td class="p-3 text-right whitespace-nowrap">
                        <button type="button" class="btn btn-sm btn-outline !text-xs !py-1 !px-2.5" data-action="preview-email" data-id="${e.id}">
                          <i class="fa-solid fa-envelope-open-text mr-1"></i> View Email
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="p-8 text-center text-slate-400 text-xs">
                <i class="fa-regular fa-envelope text-3xl mb-2 block"></i>
                No notification emails have been dispatched yet.
              </div>
            `}
          </div>
        </div>
      `
    });
  }

  // --- Email Delivery Inspection Modal ---
  function openEmailPreviewModal(emailId) {
    const e = (DB.emails || []).find(x => x.id === emailId);
    if (!e) return;

    openModal({
      title: 'Email Delivery Inspection: ' + e.subject,
      large: true,
      hideFooter: true,
      body: `
        <div class="space-y-4">
          <!-- Metadata Bar -->
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Recipient (To): <b class="font-mono text-slate-800">${esc(e.to)}</b></span>
              <span class="text-slate-500 font-mono">${fmtDateTime(e.sentAt)}</span>
            </div>
            ${e.cc ? `<div><span class="text-slate-500">CC: <span class="font-mono text-slate-700">${esc(e.cc)}</span></span></div>` : ''}
            <div><span class="text-slate-500">Subject: <b class="text-slate-900">${esc(e.subject)}</b></span></div>
            ${e.actionUrl ? `
              <div class="pt-2 flex items-center gap-2">
                <a href="${esc(e.actionUrl)}" target="_blank" class="btn btn-sm btn-primary !text-xs">
                  <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> Open TAKE ACTION Link
                </a>
                <span class="text-[11px] text-slate-500 font-mono">(Includes signed Approver token)</span>
              </div>
            ` : ''}
            ${e.viewUrl ? `
              <div class="pt-1 flex items-center gap-2">
                <a href="${esc(e.viewUrl)}" target="_blank" class="btn btn-sm btn-outline !text-xs">
                  <i class="fa-solid fa-eye mr-1"></i> Open View Link (Read-Only)
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Rendered HTML Email Body -->
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-white">
            <div class="p-6 max-h-[55vh] overflow-y-auto">
              ${e.html}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button type="button" class="btn btn-outline" data-action="open-email-outbox"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Outbox</button>
            <button type="button" class="btn btn-outline" data-action="modal-close">Close</button>
          </div>
        </div>
      `
    });
  }

  function doApprove(req) {
    if (!isActionOtpVerified(req)) {
      openApproverOtpModal(req, () => doApprove(req));
      return;
    }

    confirmWithReason({
      title: 'Approve Request', confirmText: 'Confirm Approval', btnClass: 'btn-success',
      label: 'Approval Comments & Authorization Justification', error: 'Please enter approval remarks.',
      intro: esc(req.number) + ' · ' + esc(req.title) + ' (Revision v' + req.version + ')', ph: 'e.g. Reviewed line items and confirmed compliance with departmental allocations.',
      run: reason => {
        const ok = wfApprove(req, reason, me());
        if (ok) {
          route();
          toast('Request ' + req.number + ' has been approved. Reference: ' + req.approvalRef, 'success');
        }
      }
    });
  }

  function doReject(req) {
    if (!isActionOtpVerified(req)) {
      openApproverOtpModal(req, () => doReject(req));
      return;
    }

    const fileCtl = '<div class="field"><label for="m-files" class="lbl">Supporting Documentation <span class="opt">Multiple Files Allowed</span></label><input id="m-files" name="m-files" type="file" class="form-control" multiple><p class="hint">Allowed: PDF, DOCX, XLSX, Images up to 10MB each.</p></div>';
    confirmWithReason({
      title: 'Reject Request', confirmText: 'Confirm Rejection', btnClass: 'btn-danger',
      label: 'Mandatory Reason for Rejection', error: 'Please provide a clear rejection reason.', extra: fileCtl,
      intro: esc(req.number) + ' · ' + esc(req.title) + ' (Revision v' + req.version + ')', ph: 'Specify why this request cannot be approved at this time...',
      run: (reason, fd) => {
        const rawFiles = fd.getAll('m-files') || [];
        const files = [];
        const errs = [];
        rawFiles.forEach(f => {
          if (f && f.name) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (!CONFIG.ALLOWED_EXT.includes(ext)) {
              errs.push(f.name + ' format is not allowed.');
            } else if (f.size > CONFIG.MAX_FILE_BYTES) {
              errs.push(f.name + ' exceeds 10MB.');
            } else {
              files.push({ name: f.name, size: f.size });
            }
          }
        });
        if (errs.length) return errs.join(' ');
        const ok = wfReject(req, reason, files, me());
        if (ok) {
          route();
          toast('Request ' + req.number + ' has been rejected.', 'error');
        }
      }
    });
  }

  function doClarify(req) {
    if (!isActionOtpVerified(req)) {
      openApproverOtpModal(req, () => doClarify(req));
      return;
    }

    confirmWithReason({
      title: 'Seek Clarification', confirmText: 'Send Clarification Inquiry', btnClass: 'btn-orange',
      label: 'Comments / Information that must be added or modified', error: 'Please enter your clarification inquiry.',
      intro: 'The proposal will be routed back to ' + esc(req.requesterName) + ' with status CLARIFICATION REQUIRED. Approver review pauses until resubmitted.',
      ph: 'Specify the missing vendor quotes, invoice details, or budget breakdowns...',
      run: reason => {
        const ok = wfClarify(req, reason, me());
        if (ok) {
          route();
          toast('Clarification requested from ' + req.requesterName + '.', 'warn');
        }
      }
    });
  }

  function syncReassignGroupApprovers(selectedEmail) {
    const groupEl = $('#r-group'), emailEl = $('#r-email'), nameEl = $('#r-name');
    if (!groupEl || !emailEl || !nameEl) return;
    const group = groupEl.value;
    const approvers = approversByGroup[group] || [];

    const errGroup = $('[data-err="r-group"]'); if (errGroup) errGroup.textContent = '';
    const errEmail = $('[data-err="r-email"]'); if (errEmail) errEmail.textContent = '';
    const errName = $('[data-err="r-name"]'); if (errName) errName.textContent = '';
    const modalErr = $('#modal-error'); if (modalErr) modalErr.textContent = '';
    groupEl.removeAttribute('aria-invalid');
    emailEl.removeAttribute('aria-invalid');
    nameEl.removeAttribute('aria-invalid');

    if (!group || !approvers.length) {
      emailEl.innerHTML = '<option value="">Select Group First</option>';
      emailEl.disabled = true;
      emailEl.value = '';
      nameEl.value = '';
    } else {
      emailEl.disabled = false;
      const targetEmail = selectedEmail || emailEl.value;
      emailEl.innerHTML = '<option value="">Select Approver Email</option>' +
        approvers.map(a => '<option value="' + esc(a.email) + '"' + (a.email.toLowerCase() === (targetEmail || '').toLowerCase() ? ' selected' : '') + '>' + esc(a.email) + '</option>').join('');
      if (targetEmail) {
        emailEl.value = targetEmail;
        syncReassignApproverName();
      } else {
        emailEl.value = '';
        nameEl.value = '';
      }
    }
  }

  function syncReassignApproverName() {
    const groupEl = $('#r-group'), emailEl = $('#r-email'), nameEl = $('#r-name');
    if (!groupEl || !emailEl || !nameEl) return;
    const group = groupEl.value, email = emailEl.value;
    const approvers = approversByGroup[group] || [];
    const match = approvers.find(a => a.email.toLowerCase() === email.toLowerCase());

    const errEmail = $('[data-err="r-email"]'); if (errEmail) errEmail.textContent = '';
    const errName = $('[data-err="r-name"]'); if (errName) errName.textContent = '';
    const modalErr = $('#modal-error'); if (modalErr) modalErr.textContent = '';
    emailEl.removeAttribute('aria-invalid');
    nameEl.removeAttribute('aria-invalid');

    if (match) {
      nameEl.value = match.name;
    } else {
      nameEl.value = '';
      if (email) {
        if (errName) errName.textContent = 'No matching approver record found for this email.';
      }
    }
  }

  function doReassign(req) {
    if (!isActionOtpVerified(req)) {
      openApproverOtpModal(req, () => doReassign(req));
      return;
    }

    if (req.reassignCount >= CONFIG.MAX_REASSIGN) {
      toast('This request has reached the maximum delegation quota of ' + CONFIG.MAX_REASSIGN + ' reassignments.', 'error');
      return;
    }

    openModal({
      title: 'Re-assign to Other Approver (Max 2 Allowed)', confirmText: 'Confirm Reassignment', btnClass: 'btn-purple',
      body: '<p class="text-xs text-slate-500 mb-3">Re-route approval responsibility to another executive. The request reference receives an audit revision suffix (Used: <b>' + req.reassignCount + ' of ' + CONFIG.MAX_REASSIGN + '</b> delegations).</p>' +
        field('r-group', 'Approver Group', selectCtl('r-group', GROUPS, { placeholder: 'Select Group' }), { required: true }) +
        field('r-email', 'New Approver Official Email', '<select id="r-email" name="r-email" class="form-control" disabled><option value="">Select Group First</option></select>', { required: true }) +
        field('r-name', 'New Approver Full Name', inputCtl('r-name', { ph: 'Auto-populated based on email selection', attrs: 'readonly disabled' }), { required: true }) +
        field('r-deadline', 'Revised Approval Cutoff Date', inputCtl('r-deadline', { type: 'date', attrs: 'min="' + minDeadlineISO() + '"' }), { required: true }) +
        field('r-reason', 'Mandatory Reassignment Reason', textareaCtl('r-reason', { ph: 'State reason for delegation (e.g. out of office, budget threshold escalation)...' }), { required: true }),
      onSubmit: fd => {
        const g = k => ($('#' + k) ? $('#' + k).value.trim() : String(fd.get(k) || '').trim());
        const errs = {};
        const group = g('r-group');
        const email = g('r-email').toLowerCase();
        const name = g('r-name');
        const deadline = g('r-deadline');
        const reason = g('r-reason');

        if (req.reassignCount >= CONFIG.MAX_REASSIGN) return 'Maximum delegation limit reached (' + CONFIG.MAX_REASSIGN + ').';
        if (!group) errs.group = 'Please select an approver group.';
        else if (!GROUPS.includes(group)) errs.group = 'Select a valid group from the list.';

        const groupApprovers = approversByGroup[group] || [];
        if (!email) errs.email = 'Please select an approver official email.';
        else if (!groupApprovers.some(a => a.email.toLowerCase() === email)) errs.email = 'Selected email does not belong to the chosen group.';
        else if (email === req.approverEmail.toLowerCase()) errs.email = 'This request is already assigned to this approver.';
        else if (identityEmails(req.requesterEmail).includes(email)) errs.email = 'The requester cannot be designated as their own approver.';

        if (!name) errs.name = 'Approver name must be populated.';
        if (!deadline) errs.deadline = 'Select a valid deadline.';
        else if (deadline < minDeadlineISO()) errs.deadline = 'Deadline must be at least ' + CONFIG.MIN_DEADLINE_DAYS + ' days ahead.';
        if (!reason) errs.reason = 'Enter a reassignment reason.';
        if (Object.keys(errs).length) { showErrors('r-', errs); return 'Please resolve the highlighted fields.'; }
        const ok = wfReassign(req, { group: group, email: email, name: name, deadline: deadline, reason: reason }, me());
        if (ok) {
          route();
          toast('Approval delegated to ' + name + ' (Reference: ' + req.number + ').', 'success');
        }
      }
    });
  }

  function doRemind(req) {
    openModal({
      title: 'Send Approver Reminder?', confirmText: 'Send Notification',
      body: '<p class="text-sm text-slate-700">Dispatch an immediate deadline alert to <b>' + esc(req.approverName) + '</b> for request <span class="mono font-bold">' + esc(req.number) + '</span>?</p>',
      onSubmit: () => {
        wfRemind(req, me());
        route();
        toast('Reminder recorded for ' + req.approverName + '.', 'success');
      }
    });
  }

  function doWithdraw(req) {
    confirmWithReason({
      title: 'Withdraw Approval Request?', confirmText: 'Confirm Withdrawal', btnClass: 'btn-danger',
      label: 'Reason for Withdrawal', error: 'Please enter a mandatory withdrawal reason.',
      intro: 'The request will be withdrawn and removed from active approval queues. All version records and attachments will be preserved in audit archives.',
      ph: 'State the operational reason for withdrawing this request...',
      run: reason => {
        const ok = wfWithdraw(req, reason, me());
        if (ok) {
          route();
          toast('Request ' + req.number + ' has been withdrawn.', 'warn');
        }
      }
    });
  }

  function showOtpInfo() {
    openModal({
      title: 'Enterprise Single Sign-On & OTP', hideFooter: true,
      body: '<div class="space-y-3 text-sm text-slate-600">' +
        '<p>This prototype demonstrates client-side interactions and enterprise workflows. In a production enterprise deployment, authentication connects to SRM Azure Active Directory SSO with hardware-backed Multi-Factor Authentication.</p>' +
        '<p class="text-xs text-slate-400">Use password <b>123</b> with demo accounts for local sandbox evaluation.</p>' +
        '<button type="button" class="btn btn-primary w-full mt-2" data-action="modal-close">Acknowledge</button>' +
        '</div>'
    });
  }

  /* =======================================================
     13. EVENT DELEGATION
     ======================================================= */
  const gid = el => el.dataset.id;
  const ACTIONS = {
    go(el) { state.navState = { page: el.dataset.page }; hideActionDropdown(); go(el.dataset.page); },
    'toggle-password'(el) {
      const i = $('#login-password'), show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      el.textContent = show ? 'Hide' : 'Show';
      el.setAttribute('aria-pressed', String(show));
    },
    'fill-demo'(el) {
      $('#login-email').value = el.dataset.email;
      $('#login-password').value = '123';
      $('#login-password').focus();
    },
    'show-otp-info': showOtpInfo,
    'back-to-login'() {
      showCredentialsScreen();
    },
    'resend-otp'() {
      if (state.pendingLogin && state.pendingLogin.user) {
        const otpErr = $('#otp-error');
        if (otpErr) otpErr.classList.add('hidden');
        const otpInput = $('#login-otp');
        if (otpInput) { otpInput.value = ''; otpInput.focus(); }
        toast('A verification OTP (1111) has been resent to ' + state.pendingLogin.user.email + '.', 'info');
      }
    },
    logout() {
      endSession();
      showCredentialsScreen();
      closeModal();
      hideActionDropdown();
      location.hash = '';
      route();
      toast('Signed out from Easy Approve.');
    },
    'toggle-sidebar'() { $('#sidebar').classList.add('open'); $('#sidebar-backdrop').classList.remove('hidden'); },
    'close-sidebar'() { closeSidebar(); },
    'modal-close': closeModal,
    'modal-go'(el) { const p = el.dataset.path; closeModal(); go(p); },

    // 3-Dot Kebab Menu Toggle
    'toggle-action-menu'(el) { showActionDropdown(el, gid(el)); },

    // Requirement 2: Dedicated Page Navigation
    'view-request'(el) {
      navigateToRequest(gid(el));
    },
    'back-from-request'() {
      let ns = state.navState;
      if (!ns || !ns.page || typeof ns.page !== 'string' || ns.page === 'dashboard') {
        try {
          const stored = JSON.parse(sessionStorage.getItem('ea_nav_source'));
          if (stored && stored.page && typeof stored.page === 'string' && stored.page !== 'dashboard') {
            ns = stored;
          }
        } catch (_) { }
      }
      if (!ns || !ns.page || typeof ns.page !== 'string' || ns.page === 'dashboard') {
        ns = { page: 'approvals', status: state.apprFilters.status, type: state.apprFilters.type, q: state.apprFilters.q, p: state.apprFilters.page };
      }
      if (ns.page === 'my-requests') {
        if (ns.tab) state.myFilters.tab = ns.tab;
        if (ns.q !== undefined) state.myFilters.q = ns.q;
        if (ns.p !== undefined) state.myFilters.page = ns.p;
        else if (ns.page !== undefined && typeof ns.page === 'number') state.myFilters.page = ns.page;
      } else if (ns.page === 'approvals') {
        if (ns.status !== undefined) state.apprFilters.status = ns.status;
        if (ns.type !== undefined) state.apprFilters.type = ns.type;
        if (ns.q !== undefined) state.apprFilters.q = ns.q;
        if (ns.p !== undefined) state.apprFilters.page = ns.p;
        else if (ns.page !== undefined && typeof ns.page === 'number') state.apprFilters.page = ns.page;
      } else if (ns.page === 'notifications') {
        if (ns.filter) state.notifFilter = ns.filter;
      }
      go(ns.page);
    },

    // Pagination Click Handler
    'page-change'(el) {
      const p = Number(el.dataset.p);
      const target = el.dataset.target;
      if (isNaN(p) || p < 1) return;
      if (target === 'my-requests') {
        state.myFilters.page = p;
        $('#my-table').innerHTML = myRequestsTable();
      } else if (target === 'approvals') {
        state.apprFilters.page = p;
        $('#appr-table').innerHTML = approvalsTable();
      }
    },

    'copy-number'(el) {
      try {
        navigator.clipboard.writeText(el.dataset.num);
        toast('Copied ' + el.dataset.num + ' to clipboard.', 'success');
      } catch (e) {
        toast('Reference ID: ' + el.dataset.num, 'info');
      }
    },
    'sim-download'(el) {
      toast('Downloading simulated file: ' + el.dataset.name, 'info');
    },

    // Email Outbox & Delivery Center
    'open-email-outbox': openEmailOutboxModal,
    'preview-email'(el) { openEmailPreviewModal(gid(el)); },

    // Approver 2FA OTP Handlers
    'start-approver-otp'(el) {
      const r = findReq(gid(el));
      if (r) openApproverOtpModal(r);
    },
    'resend-approver-otp'(el) {
      const req = findReq(gid(el));
      if (!req) return;
      const res = OTPService.generateForApprover(req.approverEmail, req);
      if (!res.ok) {
        toast(res.error, 'error');
      } else {
        toast('A new security code has been dispatched to ' + req.approverEmail + '.', 'success');
        openApproverOtpModal(req);
      }
    },

    // Approval Decision Suite
    'action-approve'(el) {
      hideActionDropdown();
      const r = findReq(gid(el));
      if (!r) return;
      if (!isActive(r)) { toast('This request has already been finalized as ' + r.status + '.', 'info'); return; }
      doApprove(r);
    },
    'action-reject'(el) {
      hideActionDropdown();
      const r = findReq(gid(el));
      if (!r) return;
      if (!isActive(r)) { toast('This request has already been finalized as ' + r.status + '.', 'info'); return; }
      doReject(r);
    },
    'action-clarify'(el) {
      hideActionDropdown();
      const r = findReq(gid(el));
      if (!r) return;
      if (!isActive(r)) { toast('This request is currently ' + r.status + '.', 'info'); return; }
      doClarify(r);
    },
    'action-delegate'(el) {
      hideActionDropdown();
      const r = findReq(gid(el));
      if (!r) return;
      if (!isActive(r)) { toast('Cannot delegate an inactive request.', 'error'); return; }
      doReassign(r);
    },

    // Requester Actions
    remind(el) { hideActionDropdown(); const r = findReq(gid(el)); if (r && isActive(r)) doRemind(r); },
    withdraw(el) { hideActionDropdown(); const r = findReq(gid(el)); if (r) doWithdraw(r); },
    'open-modify'(el) { hideActionDropdown(); const r = findReq(gid(el)); if (r) { go('modify/' + r.id); } },
    'start-modify'(el) {
      hideActionDropdown();
      const r = findReq(gid(el));
      if (!r) return;
      openModal({
        title: 'Reopen Proposal for Modification?',
        confirmText: 'Confirm & Reopen',
        btnClass: 'btn-primary',
        body: `
          <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>You are reopening request <b>${esc(r.number)}</b> (${esc(r.title)}). In accordance with corporate governance:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li>The proposal status will become <b>MODIFICATION REQUIRED</b>.</li>
              <li>It will be removed from <b>${esc(r.approverName)}</b>'s active approval queue until resubmitted.</li>
              <li>All existing records will be preserved permanently as historical baseline records in the database.</li>
              <li>The approver and marked stakeholders will be notified by email.</li>
            </ul>
          </div>
        `,
        onSubmit: () => {
          const ok = wfStartModify(r, me());
          if (ok) {
            go('modify/' + r.id);
            toast('Request ' + r.number + ' reopened for modification.', 'info');
          }
        }
      });
    },

    'my-tab'(el) { state.myFilters.tab = el.dataset.tab; state.myFilters.page = 1; route(); },
    'notif-filter'(el) { state.notifFilter = el.dataset.filter; route(); },
    'mark-read'(el) { const n = DB.notifications.find(x => x.id === gid(el)); if (n) { n.read = true; persist(); route(); } },
    'mark-all-read'() { const ids = myNotifications().map(n => n.id); DB.notifications.forEach(n => { if (ids.includes(n.id)) n.read = true; }); persist(); route(); toast('All notifications marked as read.', 'success'); },

    'chip-remove'(el) { state.drafts[el.dataset.scope].stakeholders.splice(Number(el.dataset.i), 1); renderChips(el.dataset.scope); },
    'cc-chip-remove'(el) {
      if (state.drafts.create && state.drafts.create.ccEmails) {
        state.drafts.create.ccEmails.splice(Number(el.dataset.i), 1);
        const input = $('#f-cc-input');
        if (input) {
          input.value = state.drafts.create.ccEmails.join(', ');
        }
        renderCcChips();
      }
    },
    'file-remove'(el) { state.drafts[el.dataset.scope].files.splice(Number(el.dataset.i), 1); renderFiles(el.dataset.scope); },

    'toggle-settings-menu'() {
      state.settingsMenuOpen = !state.settingsMenuOpen;
      renderChrome(state.route || { page: 'dashboard' });
    },

    'user-add'() { if (isAdmin()) userModal(null); },
    'user-edit'(el) { const u = DB.users.find(x => x.id === gid(el)); if (u && isAdmin()) userModal(u); },
    'user-toggle'(el) {
      const u = DB.users.find(x => x.id === gid(el)); if (!u || !isAdmin()) return;
      const next = !u.active, guard = adminGuard(u, u.role, next);
      if (guard) { toast(guard, 'error'); return; }
      openModal({
        title: (next ? 'Activate' : 'Deactivate') + ' Enterprise User?',
        confirmText: next ? 'Activate User' : 'Deactivate User',
        btnClass: next ? 'btn-primary' : 'btn-danger',
        body: '<p class="text-sm text-slate-700">' + (next ? 'Restore access for ' : 'Revoke system sign-in access for ') + '<b>' + esc(u.name) + '</b> (' + esc(u.email) + ')? Existing records will be preserved.</p>',
        onSubmit: () => { u.active = next; persist(); route(); toast('User ' + (next ? 'activated' : 'deactivated') + '.', 'success'); }
      });
    },

    'demo-advance'(el) { DB.settings.dayOffset += Number(el.dataset.n); persist(); route(); toast('Simulated date is now ' + fmtDate(todayISO()) + '.'); },
    'demo-reset-date'() { DB.settings.dayOffset = 0; persist(); route(); toast('System date reset to today.'); },
    'demo-check'() {
      const r = runDeadlineCheck(); route();
      toast('Deadline audit complete: ' + r.reminders + ' reminder(s) issued, ' + r.closed + ' expired requests closed.', 'success');
    },
    'demo-reset-data'() {
      openModal({
        title: 'Reset Sandbox Data?', confirmText: 'Reset Everything', btnClass: 'btn-danger',
        body: '<p class="text-sm text-slate-700">This will wipe all locally stored requests, notifications, and user changes in this browser and restore default sample datasets.</p>',
        onSubmit: () => {
          Object.keys(KEYS).forEach(k => { try { localStorage.removeItem(KEYS[k]); } catch (e) { /* ignore */ } });
          state.sessionEmail = null;
          loadDB();
          location.hash = '';
          route();
          toast('Sandbox data restored to defaults.');
        }
      });
    }
  };

  // Global Click Handling
  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(); return; }

    const menu = $('#action-dropdown');
    if (menu && menu.classList.contains('active')) {
      const clickedInsideMenu = menu.contains(e.target);
      const clickedKebabBtn = e.target.closest('[data-action="toggle-action-menu"]');
      if (!clickedInsideMenu && !clickedKebabBtn) {
        hideActionDropdown();
      }
    }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });

  // Global Submit Handling
  document.addEventListener('submit', e => {
    const id = e.target.id; if (!id) return;
    e.preventDefault();
    if (id === 'login-form') handleLogin();
    else if (id === 'otp-form') handleVerifyOtp();
    else if (id === 'req-form') submitCreate();
    else if (id === 'modify-form') submitModify();
    else if (id === 'profile-form') saveProfile();
    else if (id === 'modal-form' && state.modal && state.modal.onSubmit) {
      const res = state.modal.onSubmit(new FormData(e.target), e.target);
      if (typeof res === 'string' && res) { const slot = $('#modal-error'); if (slot) slot.textContent = res; } else closeModal();
    }
  });

  // Live Input & Search Filters
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'login-otp' || t.id === 'appr-otp-input') {
      t.value = t.value.replace(/\D/g, '').slice(0, 4);
    }
    if (t.id === 'r-group') syncReassignGroupApprovers();
    if (t.id === 'r-email') syncReassignApproverName();
    if (t.id === 'f-amount' || t.id === 'f-amountBudgeted') {
      syncBudget();
      if (t.id === 'f-amount') { const p = $('#f-amount-preview'); if (p) p.textContent = t.value !== '' && !isNaN(+t.value) ? fmtINR(t.value) : ''; }
    }
    if (t.id === 'my-search') {
      state.myFilters.q = t.value;
      state.myFilters.page = 1;
      $('#my-table').innerHTML = myRequestsTable();
    }
    if (t.id === 'appr-search') {
      state.apprFilters.q = t.value;
      state.apprFilters.page = 1;
      $('#appr-table').innerHTML = approvalsTable();
    }
    if (t.id === 'user-search') { state.userSearch = t.value; $('#user-table').innerHTML = usersTable(); }
    if (t.id === 'global-quick-search') {
      const q = t.value.trim().toLowerCase();
      if (state.route.page === 'my-requests') { state.myFilters.q = q; state.myFilters.page = 1; $('#my-table').innerHTML = myRequestsTable(); }
      else if (state.route.page === 'approvals') { state.apprFilters.q = q; state.apprFilters.page = 1; $('#appr-table').innerHTML = approvalsTable(); }
      else if (state.route.page === 'users') { state.userSearch = q; $('#user-table').innerHTML = usersTable(); }
    }
    if (t.dataset && t.dataset.mod) { const row = t.closest('[data-modrow]'); if (row) row.classList.toggle('is-changed', t.value.trim() !== ''); }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'f-group') syncGroupApprovers();
    if (t.id === 'f-approverEmail') syncApproverName();
    if (t.id === 'r-group') syncReassignGroupApprovers();
    if (t.id === 'r-email') syncReassignApproverName();
    if (t.id === 'f-cc-group') syncCcGroupMembers();
    if (t.id === 'f-cc-member-select' && t.value) {
      const email = t.value.toLowerCase().trim();
      const d = state.drafts.create;
      if (!d.ccEmails) d.ccEmails = [];
      if (!d.ccEmails.includes(email)) {
        d.ccEmails.push(email);
      }
      const input = $('#f-cc-input');
      if (input) {
        input.value = d.ccEmails.join(', ');
      }
      renderCcChips();
      t.value = '';
      toast('Added ' + email + ' to Emails CC.', 'success');
    }
    if (t.id === 'f-cc-input' && t.value.trim()) {
      addCcEmails('create', t.value);
    }
    if (t.id === 'f-budgeted') syncBudget();
    if (t.id === 'f-file-input') { addFiles('create', t.files); t.value = ''; }
    if (t.id === 'm-file-input') { addFiles('modify', t.files); t.value = ''; }
    if (t.id === 'appr-status') {
      state.apprFilters.status = t.value;
      state.apprFilters.page = 1;
      $('#appr-table').innerHTML = approvalsTable();
    }
    if (t.id === 'appr-type') {
      state.apprFilters.type = t.value;
      state.apprFilters.page = 1;
      $('#appr-table').innerHTML = approvalsTable();
    }
    if (t.id === 'appr-acting') { state.actingApprover = t.value; route(); toast('Acting as ' + t.value + '.'); }
    if (t.dataset && t.dataset.mod) { const row = t.closest('[data-modrow]'); if (row) row.classList.toggle('is-changed', t.value.trim() !== ''); }
  });

  // Global Keybindings
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.modal) closeModal();
      else if ($('#action-dropdown') && $('#action-dropdown').classList.contains('active')) hideActionDropdown();
      else closeSidebar();
    }
    if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      const s = $('#global-quick-search');
      if (s) { e.preventDefault(); s.focus(); }
    }
    const t = e.target;
    if (t && (t.id === 'f-stake-input' || t.id === 'm-stake-input') && (e.key === 'Enter' || e.key === ',' || e.key === ';')) {
      e.preventDefault(); addStakeholders(t.id === 'f-stake-input' ? 'create' : 'modify', t.value);
    }
    if (t && t.id === 'f-cc-input' && (e.key === 'Enter' || e.key === ',' || e.key === ';')) {
      e.preventDefault(); addCcEmails('create', t.value);
    }
  });

  window.addEventListener('resize', hideActionDropdown);
  window.addEventListener('scroll', hideActionDropdown, true);

  function closeSidebar() {
    const s = $('#sidebar'); if (s) s.classList.remove('open');
    const b = $('#sidebar-backdrop'); if (b) b.classList.add('hidden');
  }

  /* =======================================================
     14. ROUTER & START-UP
     ======================================================= */
  function handleLogin() {
    const email = $('#login-email').value.trim().toLowerCase(), password = $('#login-password').value, errs = {};
    const box = $('#login-error'); box.classList.add('hidden');
    if (!email) errs.email = 'Enter your official SRM email address.';
    else if (!isEmail(email)) errs.email = 'Enter a valid email address.';
    else if (!isApprovedEmail(email)) errs.email = 'Must use an approved SRM domain (' + DOMAIN_TEXT + ').';
    if (!password) errs.password = 'Enter your password.';
    showErrors('login-', errs);
    if (Object.keys(errs).length) return;
    const res = authProviders.password.login(email, password);
    if (!res.ok) { box.textContent = res.error; box.classList.remove('hidden'); return; }

    // Credentials valid -> Proceed to OTP Verification (Step 2)
    state.pendingLogin = {
      user: res.user,
      vertical: res.user.vertical || ''
    };
    showOtpScreen(res.user.email);
    toast('A verification OTP has been sent to your registered email address.', 'info');
  }

  function handleVerifyOtp() {
    const otpErr = $('#otp-error');
    if (otpErr) {
      otpErr.classList.add('hidden');
      otpErr.textContent = '';
    }

    if (!state.pendingLogin || !state.pendingLogin.user) {
      showCredentialsScreen();
      return;
    }

    const otpInput = $('#login-otp');
    const enteredOtp = (otpInput ? otpInput.value : '').trim();

    // Verify OTP against prototype test code 1111
    if (enteredOtp !== '1111') {
      if (otpErr) {
        otpErr.textContent = 'Invalid OTP. Please enter the correct OTP.';
        otpErr.classList.remove('hidden');
      }
      if (otpInput) {
        otpInput.focus();
        otpInput.select();
      }
      return;
    }

    // OTP Verified successfully
    const { user, vertical } = state.pendingLogin;
    startSession(user, vertical);
    state.pendingLogin = null;

    // Reset login form and restore panels
    const loginForm = $('#login-form');
    if (loginForm) loginForm.reset();
    showCredentialsScreen();

    // Navigate to appropriate landing page based on role (User or Admin)
    location.hash = user.role === 'admin' ? '#/dashboard' : '#/my-requests';
    route();
    toast('Welcome back, ' + user.name + '.', 'success');
  }

  const PAGES = {
    dashboard: pageDashboard,
    notifications: pageNotifications,
    create: pageCreate,
    'my-requests': pageMyRequests,
    approvals: pageApprovals,
    users: pageUsers,
    'profile-card': pageProfileCard,
    profile: pageProfile,
    request: pageRequest,
    modify: pageCreate
  };

  function parseRoute() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const [pathPart, queryPart] = raw.split('?');
    const parts = (pathPart || '').split('/').filter(Boolean);
    const query = {};
    if (queryPart) {
      queryPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    const u = currentUser();
    const defaultPage = (u && u.role === 'admin') ? 'dashboard' : 'my-requests';
    return {
      page: parts[0] || defaultPage,
      id: parts[1] || '',
      extra: parts[2] || '',
      query: query,
      token: query.token || ''
    };
  }

  function go(path) {
    const target = '#/' + path;
    if (location.hash === target) route(); else location.hash = target;
  }

  function route() {
    hideActionDropdown();
    const r = parseRoute();
    state.route = r;

    // 1. Handle External View-Only Link (#/view-request/:id?token=...)
    if (r.page === 'view-request') {
      const req = findReq(r.id);
      if (!req) {
        toast('Request not found.', 'error');
        go('dashboard');
        return;
      }
      state.viewOnlyMode = true;
      if (r.token) {
        const ver = SecurityService.verifyToken(r.token, 'VIEW_REQUEST');
        if (!ver.ok) {
          toast(ver.error, 'warn');
        }
      }
      // If user is not logged in, grant secure read-only platform session
      if (!currentUser()) {
        const guestEmail = (DB.users.find(u => u.email === req.requesterEmail) || {}).email || 'user@srmtech.com';
        state.sessionEmail = guestEmail;
      }
      r.page = 'request';
      state.route = r;
    }

    // 2. Handle External TAKE ACTION Link (#/take-action/:id?token=...)
    else if (r.page === 'take-action') {
      const req = findReq(r.id);
      if (!req) {
        toast('Request not found.', 'error');
        go('dashboard');
        return;
      }
      state.viewOnlyMode = false;
      if (!isActive(req)) {
        toast('This request is no longer awaiting approval (Status: ' + req.status + ').', 'info');
        go('request/' + req.id);
        return;
      }
      if (r.token) {
        const ver = SecurityService.verifyToken(r.token, 'TAKE_ACTION');
        if (!ver.ok) {
          toast('Action link invalid: ' + ver.error, 'error');
          go('request/' + req.id);
          return;
        }
        if (ver.payload && ver.payload.version && ver.payload.version !== req.version) {
          toast('Notice: This action link was issued for an earlier revision. Evaluating latest revision v' + req.version + '.', 'warn');
        }
      }

      // Ensure session is set to the assigned approver for this action link
      const approverUser = DB.users.find(u => u.email === req.approverEmail);
      if (approverUser) {
        startSession(approverUser, approverUser.vertical || '');
      } else {
        state.actingApprover = req.approverEmail;
      }

      r.page = 'request';
      state.route = r;

      // Automatically prompt the approver OTP modal after render
      setTimeout(() => {
        if (!isActionOtpVerified(req)) {
          openApproverOtpModal(req, () => {
            route();
          });
        }
      }, 150);
    } else {
      // Normal internal page navigation resets viewOnlyMode
      state.viewOnlyMode = false;
    }

    const user = currentUser();
    if (!user) {
      $('#app-view').classList.add('hidden');
      $('#login-view').classList.remove('hidden');
      if (!state.pendingLogin) {
        showCredentialsScreen();
      }
      return;
    }
    $('#login-view').classList.add('hidden');
    $('#app-view').classList.remove('hidden');

    if (ADMIN_PAGES.includes(r.page) && user.role !== 'admin') {
      toast('Access restricted: administrative privileges required.', 'error');
      go('my-requests');
      return;
    }
    if (r.page === 'dashboard' && user.role !== 'admin') {
      go('my-requests');
      return;
    }
    if (!PAGES[r.page]) { go(user.role === 'admin' ? 'dashboard' : 'my-requests'); return; }

    renderChrome(r);
    $('#page-container').innerHTML = PAGES[r.page](r);
    closeSidebar();

    if (r.page === 'create' || r.page === 'modify') {
      const editReq = r.id ? findReq(r.id) : null;
      syncBudget();
      renderChips('create');
      renderCcChips();
      renderFiles('create');
      syncGroupApprovers(editReq ? editReq.approverEmail : '');
      syncCcGroupMembers();
      const input = $('#f-cc-input');
      if (input && state.drafts.create && state.drafts.create.ccEmails && state.drafts.create.ccEmails.length) {
        input.value = state.drafts.create.ccEmails.join(', ');
      }
      const amtEl = $('#f-amount');
      const prevEl = $('#f-amount-preview');
      if (amtEl && prevEl && amtEl.value) {
        prevEl.textContent = fmtINR(amtEl.value);
      }
    }
    window.scrollTo(0, 0);
  }

  function init() {
    loadDB();
    restoreSession();
    window.addEventListener('hashchange', route);
    route();
  }

  init();
})();

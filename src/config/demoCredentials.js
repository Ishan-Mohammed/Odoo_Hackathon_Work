/**
 * Demo accounts and default credentials for hackathon preview & evaluation.
 * Password meets requirements: > 8 chars (16), 1 uppercase, 1 lowercase, 1 special char.
 */
export const DEMO_PASSWORD = 'Demo@Brightloop2025!';

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    roleLabel: 'Admin',
    email: 'admin@brightloop.com',
    roleHint: 'Full access & controls',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'ShieldCheck',
  },
  {
    role: 'staff',
    roleLabel: 'Staff',
    email: 'staff@brightloop.com',
    roleHint: 'Day-to-day operations',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'Briefcase',
  },
  {
    role: 'customer',
    roleLabel: 'Customer',
    email: 'customer@acme.com',
    roleHint: 'Customer self-serve portal',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'UserCheck',
  },
];

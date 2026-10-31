/**
 * Demo accounts and default credentials for Brightloop platform.
 */
export const DEMO_PASSWORDS = {
  admin: 'Admin@1234',
  staff: 'Staff@1234',
  customer: 'Customer@1234',
};

export const DEMO_PASSWORD = 'Admin@1234';

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    roleLabel: 'Admin',
    name: 'Admin',
    email: 'admin@brightloop.com',
    password: 'Admin@1234',
    roleHint: 'Full access & controls',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'ShieldCheck',
  },
  {
    role: 'staff',
    roleLabel: 'Staff',
    name: 'Staff',
    email: 'staff@brightloop.com',
    password: 'Staff@1234',
    roleHint: 'Day-to-day operations',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'Briefcase',
  },
  {
    role: 'customer',
    roleLabel: 'Customer',
    name: 'Acme Traders',
    email: 'customer@acme.com',
    password: 'Customer@1234',
    roleHint: 'Customer self-serve portal',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'UserCheck',
  },
];

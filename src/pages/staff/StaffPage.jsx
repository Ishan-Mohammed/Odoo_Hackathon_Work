import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, RefreshCw, Mail, Calendar, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { listStaff, addStaff } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add staff modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listStaff();
      setStaffList(res?.staff || []);
    } catch (err) {
      setError(err?.message || 'Unable to load staff members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setFormError({ field: 'name', message: 'Staff member name is required.' });
      return;
    }

    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setFormError({ field: 'email', message: 'Please provide a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addStaff({ name: cleanName, email: cleanEmail });
      toast.success(`Staff account for ${cleanName} created`);
      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      const errorCode = err?.code || err?.response?.data?.code;
      if (errorCode === 'DUPLICATE_EMAIL') {
        setFormError({ field: 'email', message: 'A staff member with this email address already exists.' });
      } else {
        toast.error(err?.message || 'Failed to create staff account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      header: 'Staff Member',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase">
            {row?.name?.[0] || 'S'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{val || row?.name}</span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Mail className="w-3 h-3" /> {row?.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      header: 'Role',
      align: 'center',
      render: (val) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <UserCheck className="w-3 h-3" /> {val || 'staff'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date Added',
      header: 'Date Added',
      align: 'right',
      render: (val) => (
        <span className="text-xs text-slate-500 font-mono">
          {val ? formatDate(val) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Staff Management"
        subtitle="Team members with operational permissions for subscriptions, invoices, and billing runs"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchStaff}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add staff
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={staffList}
        page={1}
        pageSize={50}
        total={staffList.length}
        isLoading={isLoading}
        error={error}
        onRetry={fetchStaff}
        emptyTitle="No staff members found"
        emptyMessage="Add staff accounts to collaborate on operations."
      />

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        subtitle="Create operational staff account with subscription and billing privileges"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSubmit} isLoading={isSubmitting}>
              Create Staff Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError?.field === 'name') setFormError(null);
              }}
              placeholder="e.g. Alex Morgan"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                formError?.field === 'name' ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
            />
            {formError?.field === 'name' && (
              <p className="text-xs text-rose-500 mt-1">{formError.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError?.field === 'email') setFormError(null);
              }}
              placeholder="e.g. alex@brightloop.com"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border font-mono ${
                formError?.field === 'email' ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
            />
            {formError?.field === 'email' && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{formError.message}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Initial password will be set to demo credentials (Demo@Brightloop2025!).
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}

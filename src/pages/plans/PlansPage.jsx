import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import FiltersBar from '../../components/ui/FiltersBar';
import DataTable from '../../components/ui/DataTable';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { listPlans, createPlan, updatePlan, deletePlan } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function PlansPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    period: 'monthly',
    minQty: '1',
    validFrom: '2025-01-01',
    validTo: '2027-12-31',
    autoClose: false,
    closable: true,
    pausable: true,
    renewable: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog state
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlansList = useCallback(async (currPage, query) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listPlans({
        page: currPage,
        pageSize,
        search: query,
      });
      setPlans(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Unable to load recurring plans.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchPlansList(page, search);
  }, [fetchPlansList, page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const openAddDrawer = () => {
    if (!isAdmin) {
      toast.error('Staff role is view only.');
      return;
    }
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      period: 'monthly',
      minQty: '1',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '2028-12-31',
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditDrawer = (plan) => {
    if (!isAdmin) {
      toast.error('Staff role is view only.');
      return;
    }
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      price: plan.price !== undefined ? String(plan.price) : '',
      period: plan.period || plan.billingPeriod || 'monthly',
      minQty: plan.minQty !== undefined ? String(plan.minQty) : '1',
      validFrom: plan.validFrom || '2025-01-01',
      validTo: plan.validTo || '2027-12-31',
      autoClose: Boolean(plan.autoClose),
      closable: plan.closable !== false,
      pausable: plan.pausable !== false,
      renewable: plan.renewable !== false,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Plan name is required';
    const p = parseFloat(formData.price);
    if (isNaN(p) || p < 0) errors.price = 'Price must be 0 or greater';
    const mq = parseInt(formData.minQty, 10);
    if (isNaN(mq) || mq < 1) errors.minQty = 'Minimum quantity must be 1 or more';

    if (formData.validFrom && formData.validTo) {
      if (new Date(formData.validTo) <= new Date(formData.validFrom)) {
        errors.validTo = '"Valid To" date must be strictly after "Valid From" date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: p,
        period: formData.period,
        billingPeriod: formData.period,
        minQty: mq,
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        autoClose: formData.autoClose,
        closable: formData.closable,
        pausable: formData.pausable,
        renewable: formData.renewable,
      };

      if (editingPlan) {
        await updatePlan(editingPlan.id, payload);
        toast.success('Plan updated successfully');
      } else {
        await createPlan(payload);
        toast.success('Plan created successfully');
      }

      setIsFormOpen(false);
      fetchPlansList(page, search);
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlan(planToDelete.id);
      toast.success('Plan removed from catalog');
      setPlanToDelete(null);
      fetchPlansList(page, search);
    } catch (err) {
      toast.error(err.message || 'Failed to delete plan');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Plan Name',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
          {row.name}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Recurring Price',
      align: 'right',
      sortable: true,
      render: (row) => <MoneyText amount={row.price || 0} size="sm" right />,
    },
    {
      key: 'period',
      label: 'Period',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase bg-slate-100 text-slate-700 tracking-wide">
          {row.period || row.billingPeriod || 'monthly'}
        </span>
      ),
    },
    {
      key: 'minQty',
      label: 'Min Qty',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-mono text-slate-700">{row.minQty || 1}</span>
      ),
    },
    {
      key: 'validity',
      label: 'Available From / To',
      render: (row) => (
        <div className="text-xs text-slate-500 font-mono">
          <span>{row.validFrom || '—'}</span>
          <span className="mx-1.5 text-slate-300">→</span>
          <span>{row.validTo || '—'}</span>
        </div>
      ),
    },
    {
      key: 'toggles',
      label: 'Plan Behaviors',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
              row.autoClose
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={row.autoClose ? 'Auto-close on expiration enabled' : 'Auto-close disabled'}
          >
            Auto-close
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
              row.closable !== false
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={row.closable !== false ? 'Customer can close' : 'Not closable'}
          >
            Closable
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
              row.pausable !== false
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={row.pausable !== false ? 'Pausable' : 'Cannot pause'}
          >
            Pausable
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
              row.renewable !== false
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={row.renewable !== false ? 'Renewable' : 'Non-renewable'}
          >
            Renewable
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) =>
        isAdmin ? (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={`Edit plan ${row.name}`}
              onClick={() => openEditDrawer(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Edit Plan"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete plan ${row.name}`}
              onClick={() => setPlanToDelete(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Plan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Plans"
        subtitle="Manage recurring billing intervals, pricing terms, and automation behavior"
        actions={
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                View only
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchPlansList(page, search)}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isAdmin && (
              <Button variant="primary" size="sm" onClick={openAddDrawer} className="gap-2">
                <Plus className="w-4 h-4" />
                Add plan
              </Button>
            )}
          </div>
        }
      />

      <FiltersBar onReset={handleReset} showReset={Boolean(search)}>
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search plans by name or frequency..."
            className="w-full pl-9 pr-3.5 py-1.5 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </form>
      </FiltersBar>

      <DataTable
        columns={columns}
        data={plans}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onRowClick={(row) => (isAdmin ? openEditDrawer(row) : null)}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchPlansList(page, search)}
        emptyTitle="No plans found"
        emptyMessage={search ? `No recurring plans matched "${search}".` : 'No plans configured yet.'}
      />

      {/* Add / Edit Plan Drawer */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
        subtitle={editingPlan ? `Editing ${editingPlan.name}` : 'Create a new subscription billing plan'}
        width="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePlanSubmit} isLoading={isSubmitting}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Plan Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CRM Monthly"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                formErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
            />
            {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="2560.00"
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  formErrors.price ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono`}
              />
              {formErrors.price && <p className="text-xs text-rose-500 mt-1">{formErrors.price}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Period
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Minimum Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={formData.minQty}
              onChange={(e) => setFormData({ ...formData, minQty: e.target.value })}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                formErrors.minQty ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono`}
            />
            {formErrors.minQty && <p className="text-xs text-rose-500 mt-1">{formErrors.minQty}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Available From
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Available To
              </label>
              <input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className={`w-full px-3 py-1.5 text-xs rounded-xl border font-mono ${
                  formErrors.validTo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {formErrors.validTo && <p className="text-xs text-rose-500 mt-1">{formErrors.validTo}</p>}
            </div>
          </div>

          {/* 4 Behavior Switches */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Contract Lifecycle Toggles
            </span>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">Auto-close</div>
                <div className="text-[11px] text-slate-500">Automatically close subscription at contract expiry</div>
              </div>
              <input
                type="checkbox"
                checked={formData.autoClose}
                onChange={(e) => setFormData({ ...formData, autoClose: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">Closable</div>
                <div className="text-[11px] text-slate-500">Customer or staff can cancel or close the contract</div>
              </div>
              <input
                type="checkbox"
                checked={formData.closable}
                onChange={(e) => setFormData({ ...formData, closable: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">Pausable</div>
                <div className="text-[11px] text-slate-500">Subscription can be paused and resumed</div>
              </div>
              <input
                type="checkbox"
                checked={formData.pausable}
                onChange={(e) => setFormData({ ...formData, pausable: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">Renewable</div>
                <div className="text-[11px] text-slate-500">Contract can be renewed into a new billing cycle</div>
              </div>
              <input
                type="checkbox"
                checked={formData.renewable}
                onChange={(e) => setFormData({ ...formData, renewable: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeletePlan}
        title="Delete Plan?"
        message={`Are you sure you want to remove plan "${planToDelete?.name}"? Active subscriptions will not be modified.`}
        confirmText="Delete Plan"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}

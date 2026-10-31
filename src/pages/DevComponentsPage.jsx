import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import MoneyText from '../components/ui/MoneyText';
import StatCard from '../components/ui/StatCard';
import DataTable from '../components/ui/DataTable';
import StatusStepper from '../components/ui/StatusStepper';
import FiltersBar from '../components/ui/FiltersBar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';
import { Users, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DevComponentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(2);

  const sampleColumns = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => <StatusBadge status={val} daysOverdue={row.daysOverdue} />,
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (val) => <MoneyText amount={val} right tone={val > 50000 ? 'positive' : 'default'} />,
    },
  ];

  const sampleData = [
    { id: '1', invoiceNumber: 'INV-0042', customerName: 'Acme Traders', status: 'Paid', total: 13593.6 },
    { id: '2', invoiceNumber: 'INV-0043', customerName: 'Matrix Hospitality', status: 'Overdue', daysOverdue: 6, total: 45200.0 },
    { id: '3', invoiceNumber: 'INV-0044', customerName: 'Falcon Agro Corp', status: 'Confirmed', total: 28400.0 },
    { id: '4', invoiceNumber: 'INV-0045', customerName: 'Zenith Logistics', status: 'Active', total: 62000.0 },
    { id: '5', invoiceNumber: 'INV-0046', customerName: 'Kavita Textiles', status: 'Quotation', total: 34100.0 },
  ];

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        title="Component Design System"
        subtitle="Live showcase of all shared Brightloop UI components across every state"
        breadcrumb={[{ label: 'Home', href: '/dashboard' }, { label: 'Dev' }, { label: 'Components' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open Drawer
            </Button>
            <Button size="sm" variant="primary" onClick={() => setConfirmOpen(true)}>
              Open Confirm
            </Button>
          </div>
        }
      />

      {/* 1. Status Badges */}
      <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          1. StatusBadge (All 9 Lifecycle States)
        </h2>
        <div className="flex flex-wrap gap-2.5 items-center">
          <StatusBadge status="Draft" />
          <StatusBadge status="Quotation" />
          <StatusBadge status="Confirmed" />
          <StatusBadge status="Active" />
          <StatusBadge status="Paused" />
          <StatusBadge status="Closed" />
          <StatusBadge status="Paid" />
          <StatusBadge status="Overdue" daysOverdue={6} />
          <StatusBadge status="Cancelled" />
        </div>
      </section>

      {/* 2. MoneyText */}
      <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          2. MoneyText (INR Tabular Format)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-baseline">
          <div>
            <p className="text-xs text-slate-400 mb-1">Default (sm/base)</p>
            <MoneyText amount={13593.6} size="sm" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Positive (lg)</p>
            <MoneyText amount={842000.0} size="lg" tone="positive" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Negative (xl)</p>
            <MoneyText amount={1280.0} size="xl" tone="negative" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Muted (2xl)</p>
            <MoneyText amount={11520.0} size="2xl" tone="muted" />
          </div>
        </div>
      </section>

      {/* 3. StatCards */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          3. StatCard (Count-up, Trend, Skeleton)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Monthly Recurring Revenue"
            value={955000}
            isCurrency
            trend={{ value: '+12.4%', isPositive: true, label: 'vs last month' }}
          />
          <StatCard
            icon={Receipt}
            label="Total Overdue Invoices"
            value={325600}
            isCurrency
            trend={{ value: '+4.2%', isPositive: false, label: 'requires action' }}
          />
          <StatCard
            icon={Users}
            label="Loading Skeleton Example"
            isLoading
          />
        </div>
      </section>

      {/* 4. StatusStepper */}
      <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            4. StatusStepper (Lifecycle Flow)
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentStep((prev) => (prev + 1) % 4)}
          >
            Advance Step ({currentStep + 1}/4)
          </Button>
        </div>
        <StatusStepper
          steps={['Draft', 'Quotation', 'Confirmed', 'Active']}
          currentStep={currentStep}
        />
      </section>

      {/* 5. FiltersBar & DataTable */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          5. FiltersBar & DataTable (Sorting, Pagination, Skeletons)
        </h2>
        <FiltersBar onReset={() => {}}>
          <input
            type="text"
            placeholder="Filter by customer..."
            className="h-9 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 w-52"
          />
          <select className="h-9 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200">
            <option>All Statuses</option>
            <option>Paid</option>
            <option>Overdue</option>
          </select>
        </FiltersBar>

        <DataTable
          columns={sampleColumns}
          data={sampleData}
          total={sampleData.length}
          pageSize={5}
          page={1}
        />
      </section>

      {/* 6. Overlays & Dialogs */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Modal Dialog"
        subtitle="Accessible dialog with focus trap and Esc key support"
      >
        <p className="text-sm text-slate-600 mb-4">
          This modal traps focus, prevents background scrolling, and closes smoothly on Esc or outside click.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
            Close Modal
          </Button>
        </div>
      </Modal>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Subscription Drawer"
        subtitle="Right-side overlay panel with 200ms slide animation"
        footer={
          <Button variant="primary" size="sm" onClick={() => setDrawerOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>Quick details panel for reviewing customer subscription info.</p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs">
            SUB-0042 · Acme Traders
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel SUB-0042? This will suspend automated billing immediately."
        confirmText="Confirm Cancel"
      />
    </div>
  );
}

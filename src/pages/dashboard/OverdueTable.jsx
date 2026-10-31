import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, CheckCircle2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, relativeDue } from '../../utils/format';
import { sendReminder } from '../../api/client';

export default function OverdueTable({
  invoices = [],
  total = 0,
  page = 1,
  pageSize = 5,
  onPageChange,
  isLoading = false,
}) {
  const navigate = useNavigate();

  // Dialog state for confirming reminder
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sentMap, setSentMap] = useState({});

  const handleOpenReminder = (e, row) => {
    e.stopPropagation(); // prevent row click navigation
    if (sentMap[row.id] || row.isReminderSent) return;
    setSelectedInvoice(row);
  };

  const handleConfirmSend = async () => {
    if (!selectedInvoice) return;
    setIsSending(true);

    try {
      await sendReminder(selectedInvoice.id);
      setSentMap((prev) => ({ ...prev, [selectedInvoice.id]: true }));
      toast.success(`Reminder sent to ${selectedInvoice.customerName}`);
      setSelectedInvoice(null);
    } catch (err) {
      toast.error('Failed to dispatch payment reminder.');
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    {
      key: 'number',
      header: 'Invoice #',
      sortable: true,
      render: (val) => <span className="font-mono font-semibold text-brand-700">{val}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (val) => <span className="font-medium text-slate-900">{val}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (val) => (
        <div>
          <span className="block text-slate-800">{formatDate(val)}</span>
          <span className="block text-[11px] text-rose-500 font-medium">
            {relativeDue(val)}
          </span>
        </div>
      ),
    },
    {
      key: 'daysOverdue',
      header: 'Status',
      sortable: true,
      render: (days) => <StatusBadge status="Overdue" daysOverdue={days} />,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      sortable: true,
      render: (amount) => <MoneyText amount={amount} tone="negative" right size="sm" />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => {
        const isSent = Boolean(sentMap[row.id] || row.isReminderSent);
        const isThisRowSending = isSending && selectedInvoice?.id === row.id;

        if (isSent) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium select-none">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sent</span>
            </span>
          );
        }

        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => handleOpenReminder(e, row)}
            disabled={isSending || isThisRowSending}
            isLoading={isThisRowSending}
            leftIcon={<Send className="w-3 h-3" />}
            className="text-xs"
          >
            Remind
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Overdue Invoices Requiring Attention
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aging receivables overdue for collection
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        isLoading={isLoading}
        emptyTitle="No overdue invoices, nice."
        emptyMessage="All invoices are settled or within their agreed credit terms."
      />

      {/* Confirmation Dialog for Sending Reminder */}
      <ConfirmDialog
        isOpen={Boolean(selectedInvoice)}
        onClose={() => {
          if (!isSending) setSelectedInvoice(null);
        }}
        onConfirm={handleConfirmSend}
        isLoading={isSending}
        variant="warning"
        title="Send Payment Reminder?"
        message={`Send payment reminder to ${selectedInvoice?.customerName}?`}
        confirmText="Send Reminder"
        cancelText="Cancel"
      />
    </div>
  );
}

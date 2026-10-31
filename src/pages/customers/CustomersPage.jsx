import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, RefreshCw, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FiltersBar from '../../components/ui/FiltersBar';
import DataTable from '../../components/ui/DataTable';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import { listCustomers } from '../../api/client';

export default function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async (currentPage, searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCustomers({
        page: currentPage,
        pageSize,
        search: searchQuery,
      });
      setCustomers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to retrieve customer accounts.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchCustomers(page, search);
  }, [fetchCustomers, page, search]);

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

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      label: 'Customer',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
            {val || row?.name || '—'}
          </span>
          {row?.city && (
            <span className="text-xs text-slate-400 mt-0.5">{row.city}</span>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      label: 'Email',
      sortable: true,
      render: (val) => (
        <span className="text-slate-600 text-sm font-mono">{val || '—'}</span>
      ),
    },
    {
      key: 'activeSubscriptions',
      header: 'Active Subs',
      label: 'Active Subs',
      align: 'center',
      sortable: true,
      render: (val, row) => (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {val ?? row?.activeSubscriptions ?? 0} active
        </span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      label: 'Outstanding',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const amt = val ?? row?.outstanding ?? 0;
        return (
          <MoneyText
            amount={amt}
            size="sm"
            tone={amt > 0 ? 'negative' : 'muted'}
            right
          />
        );
      },
    },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      label: 'Total Paid',
      align: 'right',
      sortable: true,
      render: (val, row) => (
        <MoneyText
          amount={val ?? row?.totalPaid ?? 0}
          size="sm"
          tone="positive"
          right
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      label: '',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          aria-label={`View details for ${row?.name || 'customer'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (row?.id) navigate(`/customers/${row.id}`);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle="Manage customer directories, active subscriptions, and billing health"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchCustomers(page, search)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <FiltersBar onReset={handleReset} showReset={Boolean(search)}>
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or city..."
            className="w-full pl-9 pr-3.5 py-1.5 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </form>
      </FiltersBar>

      <DataTable
        columns={columns}
        data={customers}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchCustomers(page, search)}
        emptyTitle="No customers found"
        emptyMessage={search ? `No customer records matched "${search}".` : 'No customer records available.'}
      />
    </div>
  );
}

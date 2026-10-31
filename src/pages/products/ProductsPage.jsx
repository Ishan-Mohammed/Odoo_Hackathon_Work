import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  Calculator,
  ShieldAlert,
  Check,
  Eye,
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
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
} from '../../api/client';
import { formatMoney } from '../../utils/format';

export default function ProductsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Service',
    salesPrice: '',
    costPrice: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variants Drawer State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isVariantsOpen, setIsVariantsOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({
    attribute: '',
    value: '',
    extraPrice: '',
  });
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  // Delete Dialog State
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProductsList = useCallback(async (currPage, query) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listProducts({
        page: currPage,
        pageSize,
        search: query,
      });
      setProducts(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Unable to retrieve products.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchProductsList(page, search);
  }, [fetchProductsList, page, search]);

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

  // Open Add Product Drawer
  const openAddDrawer = () => {
    if (!isAdmin) {
      toast.error('Staff role is view only.');
      return;
    }
    setEditingProduct(null);
    setFormData({
      name: '',
      type: 'Service',
      salesPrice: '',
      costPrice: '',
      notes: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Edit Product Drawer
  const openEditDrawer = (prod) => {
    if (!isAdmin) {
      toast.error('Staff role is view only.');
      return;
    }
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      type: prod.type || 'Service',
      salesPrice: prod.salesPrice !== undefined ? String(prod.salesPrice) : '',
      costPrice: prod.costPrice !== undefined ? String(prod.costPrice) : '',
      notes: prod.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Variants Drawer
  const openVariantsDrawer = (prod) => {
    setSelectedProduct(prod);
    setVariantForm({
      attribute: 'Brand',
      value: '',
      extraPrice: '0',
    });
    setIsVariantsOpen(true);
  };

  // Validate and submit Product Form
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required';
    const sp = parseFloat(formData.salesPrice);
    if (isNaN(sp) || sp <= 0) errors.salesPrice = 'Sales price must be greater than 0';
    const cp = parseFloat(formData.costPrice);
    if (isNaN(cp) || cp < 0) errors.costPrice = 'Cost price must be 0 or greater';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        salesPrice: sp,
        costPrice: cp,
        notes: formData.notes.trim(),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Product updated successfully');
      } else {
        await createProduct(payload);
        toast.success('Product created successfully');
      }

      setIsFormOpen(false);
      fetchProductsList(page, search);
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product confirmation
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success('Product removed from catalog');
      setProductToDelete(null);
      fetchProductsList(page, search);
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Variant Handler
  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !isAdmin) return;

    if (!variantForm.attribute.trim() || !variantForm.value.trim()) {
      toast.error('Attribute and Value are required');
      return;
    }

    const extra = parseFloat(variantForm.extraPrice || 0);
    if (isNaN(extra)) {
      toast.error('Extra price must be a valid number');
      return;
    }

    setIsAddingVariant(true);
    try {
      const res = await addVariant(selectedProduct.id, {
        attribute: variantForm.attribute.trim(),
        value: variantForm.value.trim(),
        extraPrice: extra,
      });

      toast.success('Variant added successfully');
      // Update selected product in modal view and main list
      setSelectedProduct(res.product || {
        ...selectedProduct,
        variants: [...(selectedProduct.variants || []), res.variant],
      });
      setVariantForm({ attribute: 'Brand', value: '', extraPrice: '0' });
      fetchProductsList(page, search);
    } catch (err) {
      toast.error(err.message || 'Could not add variant');
    } finally {
      setIsAddingVariant(false);
    }
  };

  // Calculate live preview in Variants Drawer
  const basePriceNum = parseFloat(selectedProduct?.salesPrice || 0);
  const extraPriceNum = parseFloat(variantForm.extraPrice) || 0;
  const liveUnitPrice = basePriceNum + extraPriceNum;

  const columns = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
            {row.name}
          </span>
          {row.notes && (
            <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">{row.notes}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          {row.type || 'Service'}
        </span>
      ),
    },
    {
      key: 'salesPrice',
      label: 'Sales Price',
      align: 'right',
      sortable: true,
      render: (row) => <MoneyText amount={row.salesPrice || 0} size="sm" right />,
    },
    {
      key: 'costPrice',
      label: 'Cost Price',
      align: 'right',
      sortable: true,
      render: (row) => <MoneyText amount={row.costPrice || 0} size="sm" tone="muted" right />,
    },
    {
      key: 'margin',
      label: 'Margin %',
      align: 'center',
      render: (row) => {
        const sp = parseFloat(row.salesPrice || 0);
        const cp = parseFloat(row.costPrice || 0);
        if (sp <= 0) return <span className="text-xs text-slate-400">—</span>;
        const margin = Math.round(((sp - cp) / sp) * 100);
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              margin >= 40
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : margin > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {margin}%
          </span>
        );
      },
    },
    {
      key: 'variantsCount',
      label: 'Variants',
      align: 'center',
      render: (row) => {
        const count = row.variants?.length || 0;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openVariantsDrawer(row);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            {count} {count === 1 ? 'variant' : 'variants'}
          </button>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="View variants"
            onClick={() => openVariantsDrawer(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
            title="View Variants & Calculator"
          >
            <Eye className="w-4 h-4" />
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                aria-label={`Edit ${row.name}`}
                onClick={() => openEditDrawer(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Edit Product"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                aria-label={`Delete ${row.name}`}
                onClick={() => setProductToDelete(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete Product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Products"
        subtitle="Manage sellable recurring items, software licenses, and variant pricing"
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
              onClick={() => fetchProductsList(page, search)}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isAdmin && (
              <Button variant="primary" size="sm" onClick={openAddDrawer} className="gap-2">
                <Plus className="w-4 h-4" />
                Add product
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
            placeholder="Search products by title or notes..."
            className="w-full pl-9 pr-3.5 py-1.5 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </form>
      </FiltersBar>

      <DataTable
        columns={columns}
        data={products}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onRowClick={(row) => openVariantsDrawer(row)}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchProductsList(page, search)}
        emptyTitle="No products found"
        emptyMessage={search ? `No products matched "${search}".` : 'No products available.'}
      />

      {/* Add / Edit Product Drawer */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={editingProduct ? `Updating ${editingProduct.name}` : 'Create a new catalog item'}
        width="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProductSubmit} isLoading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Brightloop CRM"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                formErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
            />
            {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Item Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="Service">Service</option>
              <option value="Goods">Goods</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Sales Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.salesPrice}
                onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                placeholder="2000.00"
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  formErrors.salesPrice ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
              />
              {formErrors.salesPrice && (
                <p className="text-xs text-rose-500 mt-1">{formErrors.salesPrice}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cost Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="800.00"
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  formErrors.costPrice ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500`}
              />
              {formErrors.costPrice && (
                <p className="text-xs text-rose-500 mt-1">{formErrors.costPrice}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes or description..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </form>
      </Drawer>

      {/* Variants & Live Calculator Drawer */}
      <Drawer
        isOpen={isVariantsOpen}
        onClose={() => setIsVariantsOpen(false)}
        title={selectedProduct ? `${selectedProduct.name} — Variants` : 'Product Variants'}
        subtitle="Manage attribute combinations, extra charges, and calculate unit pricing"
        width="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={() => setIsVariantsOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Product Summary Header */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Sales Price</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatMoney(selectedProduct.salesPrice)}
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                {selectedProduct.type || 'Service'}
              </span>
            </div>

            {/* Existing Variants Table */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Configured Variants ({selectedProduct.variants?.length || 0})
              </h3>

              {!selectedProduct.variants || selectedProduct.variants.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No variants defined for this product yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">Attribute</th>
                        <th className="px-3.5 py-2.5">Value</th>
                        <th className="px-3.5 py-2.5 text-right">Extra Price</th>
                        <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.variants.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800">{v.attribute}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-slate-700 bg-slate-100 font-mono text-[11px]">
                              {v.value}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-slate-500">
                            {formatMoney(v.extraPrice)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900">
                            {formatMoney(v.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Variant Form (Admin Only) */}
            {isAdmin ? (
              <div className="p-4 rounded-2xl border border-brand-200/80 bg-brand-50/30 space-y-4">
                <div className="flex items-center gap-2 text-brand-900 font-semibold text-sm">
                  <Calculator className="w-4 h-4 text-brand-600" />
                  Add New Variant & Live Calculator
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Attribute
                    </label>
                    <input
                      type="text"
                      value={variantForm.attribute}
                      onChange={(e) => setVariantForm({ ...variantForm, attribute: e.target.value })}
                      placeholder="e.g. Brand"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Value
                    </label>
                    <input
                      type="text"
                      value={variantForm.value}
                      onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })}
                      placeholder="e.g. Odoo"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Extra Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.extraPrice}
                      onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                      placeholder="560.00"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>

                {/* LIVE CALC CARD */}
                <div className="p-3.5 rounded-xl bg-white border border-brand-200 shadow-soft-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Live Calculation: </span>
                    Base <span className="font-mono font-medium">{formatMoney(basePriceNum, false)}</span> + Extra{' '}
                    <span className="font-mono font-medium">{formatMoney(extraPriceNum, false)}</span>
                  </div>
                  <div className="text-sm font-bold text-brand-700 font-mono bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60 self-start sm:self-auto">
                    = Unit price {formatMoney(liveUnitPrice)}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddVariant}
                    isLoading={isAddingVariant}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Variant
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                Staff users are in view-only mode and cannot add or edit product variants.
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product?"
        message={`Are you sure you want to remove "${productToDelete?.name}"? Subscriptions already referencing this item will retain their original line items.`}
        confirmText="Delete Product"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}

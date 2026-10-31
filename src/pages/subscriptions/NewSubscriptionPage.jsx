/**
 * New Subscription Page
 * ============================================================
 * Backend SQL reference:
 * BEGIN;
 *   INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status)
 *     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
 *   INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id)
 *     VALUES ($id, $product_id, $variant_id, $qty, $unit_price, $tax_id);
 * COMMIT;
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, ShieldCheck, Tag, Info, ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import {
  listCustomers,
  listPlans,
  listProducts,
  previewSubscriptionPrice,
  createSubscription,
} from '../../api/client';

export default function NewSubscriptionPage() {
  const navigate = useNavigate();

  // Reference catalog data
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Line items state
  // Pre-seed with the worked-example: Brightloop CRM + Brand: Odoo + qty 5
  const [lines, setLines] = useState([
    {
      productId: 'prd_crm',
      variantId: 'var_odoo',
      qty: 5,
    },
  ]);

  // Live calculation summary
  const [priceSummary, setPriceSummary] = useState({
    subtotal: 12800.0,
    discount: 1280.0,
    discountCode: 'BULK10',
    taxable: 11520.0,
    tax: 2073.6,
    total: 13593.6,
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // Load catalogs on mount
  useEffect(() => {
    Promise.all([listCustomers(), listPlans(), listProducts()]).then(([cRes, pRes, prRes]) => {
      const cList = cRes?.data || [];
      const pList = pRes?.data || [];
      const prList = prRes?.data || [];

      setCustomers(cList);
      setPlans(pList);
      setProducts(prList);

      if (cList.length > 0 && !customerId) {
        setCustomerId(cList[0].id);
      }
      if (pList.length > 0 && !planId) {
        setPlanId(pList[0].id);
      }
    }).catch((err) => {
      console.error('Failed to load catalogs:', err);
    });
  }, []);

  // Selected plan metadata
  const selectedPlan = plans.find((p) => p.id === planId) || { minQty: 1 };

  // Trigger live price preview whenever lines change
  useEffect(() => {
    let isCancelled = false;
    const fetchPreview = async () => {
      setIsCalculating(true);
      try {
        const res = await previewSubscriptionPrice({ lines });
        if (!isCancelled && res) {
          setPriceSummary(res);
        }
      } catch (err) {
        console.error('Failed to preview price:', err);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };

    fetchPreview();
    return () => {
      isCancelled = true;
    };
  }, [lines]);

  // Handle line changes
  const updateLine = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // When product changes, reset variant
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        next[index].variantId = prod?.variants?.[0]?.id || '';
      }
      return next;
    });
  };

  const addLine = () => {
    const defaultProd = products[0] || { id: 'prd_crm', variants: [] };
    setLines((prev) => [
      ...prev,
      {
        productId: defaultProd.id,
        variantId: defaultProd.variants?.[0]?.id || '',
        qty: selectedPlan.minQty || 1,
      },
    ]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) {
      toast.error('Subscription must contain at least one line item');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (targetStatus) => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!planId) {
      toast.error('Please select a plan');
      return;
    }

    // Validate min qty
    for (const l of lines) {
      if (l.qty < (selectedPlan.minQty || 1)) {
        toast.error(`Minimum quantity for plan ${selectedPlan.name} is ${selectedPlan.minQty}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId,
        planId,
        startDate,
        expiryDate: expiryDate || null,
        paymentTerms,
        status: targetStatus,
        lines,
      };

      const res = await createSubscription(payload);
      toast.success(
        targetStatus === 'Quotation'
          ? 'Quotation created successfully!'
          : 'Subscription draft saved!'
      );
      navigate(`/subscriptions/${res.subscription.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err.message || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="New Subscription"
        subtitle="Configure recurring terms, assign customer seats, add line items, and preview live pricing"
        breadcrumb={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: 'New Subscription' },
        ]}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/subscriptions')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to List
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Main Form & Lines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" /> Contract & Customer Setup
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subscription Plan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.period}) — Min {p.minQty} seat{p.minQty > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Immediate">Immediate Payment</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Line Items & Product Variants
                </h2>
                <p className="text-xs text-slate-500">
                  Select products, optional variants, and quantity seats.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const prod = products.find((p) => p.id === line.productId) || products[0];
                const variant = prod?.variants?.find((v) => v.id === line.variantId);
                const unitPrice = (prod?.salesPrice || 2000) + (variant?.extraPrice || 0);

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    {/* Product */}
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Product
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Variant */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Variant / Edition
                      </label>
                      <select
                        value={line.variantId || ''}
                        onChange={(e) => updateLine(idx, 'variantId', e.target.value)}
                        disabled={!prod?.variants || prod.variants.length === 0}
                        className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50"
                      >
                        <option value="">None (Base Product)</option>
                        {prod?.variants?.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.attribute}: {v.value} (+₹{v.extraPrice})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Seats (Qty)
                      </label>
                      <input
                        type="number"
                        min={selectedPlan.minQty || 1}
                        value={line.qty}
                        onChange={(e) => updateLine(idx, 'qty', Math.max(1, parseInt(e.target.value || 1, 10)))}
                        className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
                      />
                    </div>

                    {/* Unit Price & Tax (read-only) */}
                    <div className="md:col-span-2 text-right">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1">Unit Price</div>
                      <div className="text-xs font-semibold text-slate-800">
                        <MoneyText amount={unitPrice} />
                      </div>
                      <div className="text-[10px] text-slate-400">GST 18%</div>
                    </div>

                    {/* Delete action */}
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 1}
                        title="Remove line"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Sticky Live Price Summary */}
        <div className="sticky top-20 bg-white p-5 rounded-2xl border border-slate-200 shadow-soft-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" /> Live Price Summary
            </h3>
            {isCalculating && (
              <span className="text-[11px] text-brand-600 animate-pulse font-medium">
                Updating...
              </span>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="space-y-3 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-slate-600">
              <span>Subtotal</span>
              <MoneyText amount={priceSummary.subtotal} className="font-medium text-slate-900" />
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center text-emerald-600">
              <span className="flex items-center gap-1">
                Discount
                {priceSummary.discountCode && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    {priceSummary.discountCode} (-10%)
                  </span>
                )}
              </span>
              <span>
                - <MoneyText amount={priceSummary.discount} className="font-semibold text-emerald-600" />
              </span>
            </div>

            {/* Taxable Base */}
            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-dashed border-slate-100">
              <span>Taxable Amount</span>
              <MoneyText amount={priceSummary.taxable} className="text-slate-700" />
            </div>

            {/* Tax */}
            <div className="flex justify-between items-center text-slate-600">
              <span>GST 18%</span>
              <MoneyText amount={priceSummary.tax} className="font-medium text-slate-800" />
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Total Amount</span>
              <MoneyText amount={priceSummary.total} className="text-lg text-brand-600 font-extrabold" />
            </div>
          </div>

          {/* Explanation chip */}
          <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-xl text-[11px] text-brand-900 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-brand-800">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Volume Discount Rule</span>
            </div>
            <p className="text-brand-700 leading-relaxed">
              Order 5 or more total seats to automatically receive the <strong>BULK10</strong> discount (10% off subtotal). Reducing below 5 seats removes this discount.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Quotation')}
            >
              Create Quotation
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Draft')}
            >
              Save Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

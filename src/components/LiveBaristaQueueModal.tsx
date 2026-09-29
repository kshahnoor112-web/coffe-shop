import React, { useState } from 'react';
import { X, Flame, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import type { Order, OrderStatus, MenuItem, TableReservation } from '../types/coffee';

interface LiveBaristaQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  menu: MenuItem[];
  reservations: TableReservation[];
  onAdvanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onToggleStock: (menuId: string, inStock: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const STATUS_SEQUENCE: OrderStatus[] = [
  'Received',
  'Grinding & Extracting',
  'Steaming & Plating',
  'Ready for Pickup / Table',
  'Completed',
];

export const LiveBaristaQueueModal: React.FC<LiveBaristaQueueModalProps> = ({
  isOpen,
  onClose,
  orders,
  menu,
  reservations,
  onAdvanceOrderStatus,
  onToggleStock,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'reservations'>('orders');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = STATUS_SEQUENCE.indexOf(current);
    if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return null;
    return STATUS_SEQUENCE[idx + 1];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kds-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-[#18181B] border border-white/10 rounded-xl overflow-hidden shadow-2xl my-8 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#D4955A] block">
              Real-Time Slayer Bar & Roastery Operations
            </span>
            <h2 id="kds-modal-title" className="font-display text-2xl md:text-3xl font-semibold text-[#F4F4F5]">
              Live Extraction Queue & Barista Console
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#111113] rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#D4955A] text-[#111113] font-semibold'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                Live Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reservations')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'reservations'
                    ? 'bg-[#D4955A] text-[#111113] font-semibold'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                Table Bookings ({reservations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-[#D4955A] text-[#111113] font-semibold'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                Roastery Inventory
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh live queue"
              className="w-9 h-9 rounded-lg bg-[#111113] border border-white/10 text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close live queue modal"
              className="w-9 h-9 rounded-lg bg-[#111113] border border-white/10 text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => {
                const nextStatus = getNextStatus(order.status);
                const stepIndex = STATUS_SEQUENCE.indexOf(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-xl bg-[#121214] border border-white/[0.08] flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                        <div>
                          <span className="font-mono-tabular text-sm font-semibold text-[#D4955A]">
                            #{order.orderNumber}
                          </span>
                          <span className="mx-2 text-[#A1A1AA]">·</span>
                          <span className="text-sm font-semibold text-[#F4F4F5]">
                            {order.customerName}
                          </span>
                        </div>
                        <span className="text-xs font-mono-tabular text-[#A1A1AA]">
                          {order.estimatedReadyMinutes > 0
                            ? `Est. ${order.estimatedReadyMinutes}m`
                            : 'Ready Now'}
                        </span>
                      </div>

                      <div className="text-xs text-[#A1A1AA] mb-3">
                        <span>{order.diningMode}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-[#F4F4F5]">{order.tableOrAddress}</span>
                      </div>

                      {/* Step Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#D4955A] font-medium flex items-center gap-1.5">
                            {order.status === 'Ready for Pickup / Table' ||
                            order.status === 'Completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Flame className="w-3.5 h-3.5" />
                            )}
                            Stage: {order.status}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[#A1A1AA]">
                            Step {stepIndex + 1} of {STATUS_SEQUENCE.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {STATUS_SEQUENCE.map((st, idx) => (
                            <div
                              key={st}
                              className={`h-1.5 rounded-full ${
                                idx <= stepIndex ? 'bg-[#D4955A]' : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 bg-[#18181B] p-3 rounded-lg border border-white/[0.05]">
                        {order.items.map((it, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex justify-between text-[#F4F4F5] font-medium">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span className="font-mono-tabular">
                                ₹{it.unitPrice * it.quantity}
                              </span>
                            </div>
                            {it.customizationSummary && (
                              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                                {it.customizationSummary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="text-xs font-mono-tabular text-[#A1A1AA]">
                        Total: ₹{order.total} ({order.paymentMethod})
                      </span>
                      {nextStatus ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={async () => {
                            setBusyId(order.id);
                            await onAdvanceOrderStatus(order.id, nextStatus);
                            setBusyId(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] text-[#111113] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Advance to: {nextStatus}
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">
                          Order Served & Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="p-5 rounded-xl bg-[#121214] border border-white/[0.08] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-xs text-[#D4955A]">
                      Booking #{res.confirmationCode}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">{res.status}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F4F4F5]">
                    {res.guestName} · {res.guests} Guests
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    {res.date} <span aria-hidden="true">·</span> {res.timeSlot}{' '}
                    <span aria-hidden="true">·</span> {res.seatingZone}
                  </p>
                  <p className="text-xs text-[#F4F4F5]">Occasion: {res.occasion}</p>
                  {res.specialRequests && (
                    <p className="text-xs text-[#A1A1AA] italic">“{res.specialRequests}”</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#121214] border border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#F4F4F5] truncate">{item.name}</h4>
                    <p className="text-[11px] text-[#A1A1AA] font-mono-tabular mt-0.5">
                      ₹{item.price} · {item.inStock ? 'In Stock on Bar' : 'Paused / Sold Out'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleStock(item.id, !item.inStock)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      item.inStock
                        ? 'bg-[#18181B] border-white/15 text-[#F4F4F5] hover:border-[#D4955A]'
                        : 'bg-[#D4955A] border-[#D4955A] text-[#111113] font-semibold'
                    }`}
                  >
                    {item.inStock ? 'Mark Sold Out' : 'Restock Item'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

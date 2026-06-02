'use client';
import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useAuth } from '@/hooks/shared';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { CartItem, Medication, PharmacyOrder, Prescription, InsuranceCompany, PharmacyDeliveryUpdatePayload } from '@/types';

export type PharmTab = 'catalog' | 'prescriptions' | 'orders';
export type DeliveryType = 'pickup' | 'home';

export function usePharmacy() {
  const { showToast } = useToast();
  const { profile } = useAuth();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [activeTab, setActiveTab] = useState<PharmTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [isLoading, setIsLoading] = useState(true);
  const [rxModalMedId, setRxModalMedId] = useState<string | null>(null);
  const [pendingMed, setPendingMed] = useState<Medication | null>(null);

  useEffect(() => {
    Promise.allSettled([
      patientService.getMedications(),
      patientService.getPrescriptions(),
      patientService.getPharmacyOrders(),
      patientService.getInsuranceCompanies(),
    ])
      .then(([medsResult, rxsResult, ordsResult, insResult]) => {
        if (medsResult.status === 'fulfilled' && medsResult.value.length > 0) {
          setMedications(medsResult.value);
        } else {
          setMedications([]);
        }
        if (rxsResult.status === 'fulfilled') setPrescriptions(rxsResult.value);
        if (ordsResult.status === 'fulfilled') setOrders(ordsResult.value);
        if (insResult.status === 'fulfilled') setInsuranceCompanies(insResult.value);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useSocketEvent<PharmacyDeliveryUpdatePayload>('pharmacy:delivery:update', useCallback((data) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === data.order_id
          ? {
              ...o,
              delivery_status: data.delivery_status as PharmacyOrder['delivery_status'],
              tracking_notes: data.tracking_notes,
              estimated_delivery_time: data.estimated_delivery_time,
            }
          : o
      )
    );
    showToast(`Delivery update: ${data.delivery_status}`, 'info');
  }, [showToast]));

  const addToCart = useCallback((med: Medication, prescriptionId?: string) => {
    if (med.requires_prescription && !prescriptionId) {
      setPendingMed(med);
      setRxModalMedId(med.id);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.medicationId === med.id);
      if (existing) {
        return prev.map((c) => (c.medicationId === med.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          medicationId: med.id,
          name: med.name,
          quantity: 1,
          requiresPrescription: med.requires_prescription,
          prescriptionId,
          unitPrice: med.price ?? 0,
        },
      ];
    });
  }, []);

  const confirmRxAdd = useCallback(
    (prescriptionId: string) => {
      if (pendingMed) {
        addToCart(pendingMed, prescriptionId);
        setPendingMed(null);
      }
      setRxModalMedId(null);
    },
    [addToCart, pendingMed]
  );

  const removeFromCart = useCallback((medicationId: string) => {
    setCart((prev) => prev.filter((c) => c.medicationId !== medicationId));
  }, []);

  const updateQuantity = useCallback((medicationId: string, delta: number) => {
    setCart((prev) => prev.map((c) => (c.medicationId === medicationId ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0));
  }, []);

  const placeOrder = useCallback(async () => {
    if (cart.length === 0) return;
    try {
      await patientService.orderMedication({
        items: cart.map((c) => ({
          medication_id: c.medicationId,
          quantity: c.quantity,
          ...(c.prescriptionId ? { prescription_id: c.prescriptionId } : {}),
        })),
        delivery_type: deliveryType === 'home' ? 'delivery' : 'pickup',
      });
      setCart([]);
      showToast('Order sent to pharmacy!', 'success');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Order failed. Try again.';
      showToast(message, 'error');
    }
  }, [cart, deliveryType, showToast]);

  const filteredMeds = medications.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  const patientInsuranceProvider = profile?.insurance_provider;
  const activeInsurance = patientInsuranceProvider
    ? insuranceCompanies.find((c) => c.name === patientInsuranceProvider && c.is_active)
    : undefined;

  return {
    medications: filteredMeds,
    cart,
    prescriptions,
    orders,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    deliveryType,
    setDeliveryType,
    isLoading,
    addToCart,
    confirmRxAdd,
    removeFromCart,
    updateQuantity,
    placeOrder,
    cartTotal,
    rxModalMedId,
    setRxModalMedId,
    pendingMed,
    insuranceDiscountPct: activeInsurance?.discount_percentage,
    insuranceName: activeInsurance?.name,
  };
}

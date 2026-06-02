'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
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
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<PharmTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [rxModalMedId, setRxModalMedId] = useState<string | null>(null);
  const [pendingMed, setPendingMed] = useState<Medication | null>(null);

  const { data: medications = [], isPending: medicationsPending } = useQuery({
    queryKey: queryKeys.patientPharmacyMedications(),
    queryFn: () => patientService.getMedications(),
  });

  const { data: prescriptions = [], isPending: prescriptionsPending } = useQuery({
    queryKey: queryKeys.patientPrescriptions(),
    queryFn: () => patientService.getPrescriptions(),
  });

  const { data: orders = [], isPending: ordersPending } = useQuery({
    queryKey: queryKeys.patientPharmacyOrders(),
    queryFn: () => patientService.getPharmacyOrders(),
  });

  const { data: insuranceCompanies = [], isPending: insurancePending } = useQuery({
    queryKey: queryKeys.patientInsuranceCompanies(),
    queryFn: () => patientService.getInsuranceCompanies(),
  });

  useSocketEvent<PharmacyDeliveryUpdatePayload>('pharmacy:delivery:update', useCallback((data) => {
    queryClient.setQueryData(queryKeys.patientPharmacyOrders(), (old: PharmacyOrder[] | undefined) =>
      (old ?? []).map((o) =>
        o.id === data.order_id
          ? {
              ...o,
              delivery_status: data.delivery_status as PharmacyOrder['delivery_status'],
              tracking_notes: data.tracking_notes,
              estimated_delivery_time: data.estimated_delivery_time,
            }
          : o,
      ),
    );
    showToast(`Delivery update: ${data.delivery_status}`, 'info');
  }, [queryClient, showToast]));

  useSocketEvent('pharmacy:order:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientPharmacyOrders() });
  }, [queryClient]));

  const placeOrderMutation = useMutation({
    mutationFn: () =>
      patientService.orderMedication({
        items: cart.map((c) => ({
          medication_id: c.medicationId,
          quantity: c.quantity,
          ...(c.prescriptionId ? { prescription_id: c.prescriptionId } : {}),
        })),
        delivery_type: deliveryType === 'home' ? 'delivery' : 'pickup',
      }),
    onSuccess: () => {
      setCart([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.patientPharmacyOrders() });
      showToast('Order sent to pharmacy!', 'success');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message ?? 'Order failed. Try again.', 'error');
    },
  });

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
    [addToCart, pendingMed],
  );

  const removeFromCart = useCallback((medicationId: string) => {
    setCart((prev) => prev.filter((c) => c.medicationId !== medicationId));
  }, []);

  const updateQuantity = useCallback((medicationId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.medicationId === medicationId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const placeOrder = useCallback(async () => {
    if (cart.length === 0) return;
    await placeOrderMutation.mutateAsync();
  }, [cart, placeOrderMutation]);

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
    isLoading: medicationsPending || prescriptionsPending || ordersPending || insurancePending,
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

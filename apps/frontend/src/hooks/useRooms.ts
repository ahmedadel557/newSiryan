'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api.client';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import type { ApiResponse, DoctorAvailability, Room, RoomBooking, RoomBookingDto } from '@/types';

export function useRooms() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [doctors, setDoctors] = useState<DoctorAvailability[]>([]);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await patientService.getRoomBookings());
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAvailableRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(false);
    try {
      const res = await apiClient.get<ApiResponse<Room[]>>('/inventory/rooms', {
        params: { status: 'available' },
      });
      setAvailableRooms(res.data.data ?? []);
    } catch {
      setRoomsError(true);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadAvailableRooms();
    apiClient.get<ApiResponse<DoctorAvailability[]>>('/doctor/list')
      .then(r => setDoctors(r.data.data ?? []))
      .catch(() => setDoctors([]));
  }, [loadBookings, loadAvailableRooms]);

  const openBookModal = useCallback((room: Room) => {
    setSelectedRoom(room);
    setBookModalOpen(true);
  }, []);

  const closeBookModal = useCallback(() => {
    setBookModalOpen(false);
    setSelectedRoom(null);
  }, []);

  const bookRoom = useCallback(
    async (data: RoomBookingDto) => {
      try {
        const booking = await patientService.bookRoom(data);
        setBookings((prev) => [booking, ...prev]);
        showToast('Room booked successfully', 'success');
        closeBookModal();
        await loadAvailableRooms();
      } catch {
        showToast('Failed to book room', 'error');
      }
    },
    [showToast, closeBookModal, loadAvailableRooms]
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      try {
        await patientService.cancelRoomBooking(id);
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)));
        showToast('Booking cancelled', 'success');
      } catch {
        showToast('Failed to cancel booking', 'error');
      }
    },
    [showToast]
  );

  const active = bookings.filter((b) => b.status === 'active').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  return {
    bookings,
    availableRooms,
    isLoading,
    roomsLoading,
    roomsError,
    retryRooms: loadAvailableRooms,
    bookModalOpen,
    selectedRoom,
    doctors,
    openBookModal,
    closeBookModal,
    bookRoom,
    cancelBooking,
    active,
    completed,
    cancelled,
  };
}

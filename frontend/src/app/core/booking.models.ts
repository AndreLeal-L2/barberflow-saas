export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface DashboardBarbershop {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  publicDescription: string | null;
  publicAddress: string | null;
  published: boolean;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  serviceCount: number;
  availabilityDayCount: number;
  completedSetupSteps: number;
  canPublish: boolean;
}

export interface BarbershopProfileRequest {
  publicDescription: string;
  publicAddress: string;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  priceCurrency: string;
}

export interface ServiceRequest {
  name: string;
  description: string;
  durationMinutes: number;
  priceAmount: number;
}

export interface AvailabilityDay {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startAt: string;
  endAt: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number;
  priceCurrency: string;
  status: BookingStatus;
}

export interface PublicBarbershop {
  name: string;
  slug: string;
  phone: string;
  email: string;
  description: string | null;
  address: string | null;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export interface CreateBookingRequest {
  serviceId: string;
  startAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

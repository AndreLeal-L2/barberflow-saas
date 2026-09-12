export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: 'OWNER';
  barbershop: {
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: SubscriptionStatus;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  ownerName: string;
  barbershopName: string;
  email: string;
  phone: string;
  password: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details: Record<string, string>;
}

export interface MessageResponse {
  message: string;
}

export type ServiceCategory = 'electricity' | 'plumbing';

export type UrgencyLevel = 'urgent' | 'normal';

export type OrderStatus = 
  | 'pending'       // قيد الانتظار
  | 'accepted'      // تمت الموافقة
  | 'on_the_way'    // الفني في الطريق
  | 'in_progress'   // جاري العمل والإصلاح
  | 'completed'     // تم الإنجاز بنجاح
  | 'cancelled';    // ملغي

export interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

export interface OrderReview {
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string;
}

export interface MaintenanceOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  category: ServiceCategory;
  serviceTitle: string;
  description: string;
  urgency: UrgencyLevel;
  location: LocationInfo;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  status: OrderStatus;
  createdAt: string;
  price?: number;
  scheduledTime?: string;
  technicianNotes?: string;
  review?: OrderReview;
  cancellationReason?: string;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'customer' | 'technician';
  text: string;
  timestamp: string;
  type?: 'text' | 'price_offer' | 'schedule_proposal';
  offerPrice?: number;
  proposedTime?: string;
}

export interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  recoveryEmail: string;
  password: string;
  updatedAt?: string;
}


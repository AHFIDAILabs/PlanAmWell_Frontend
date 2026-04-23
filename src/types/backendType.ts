// These types correspond to your backend data models

export interface IImage {
_id: string;
  imageUrl: string;
  imageCldId: string;
  secure_url: string;
  uploadedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser {
  _id?: string;
  phone?: string;
  email?: string;
  name?: string;
   gender: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    homeAddress: string;
    city: string;
    state: string;
    lga: string;
  userImage?: IImage;
  roles?: string[];
  isAnonymous?: boolean;
  verified?: boolean;
  preferences?: Record<string, any>;
   availability?: Record<string, any>;
  partnerId?: string;
      status?: "submitted" | "reviewing" | "approved" | "rejected";

}

export interface IDoctor {
    _id: string; // Mongoose returns string IDs to the client
    firstName: string;
    lastName: string;
    email: string;
    name?: string;
       gender?: string;
    userImage?: IImage;
    roles?: string[];
     homeAddress?: string;
     dateOfBirth?: string;
    city?: string;
    state: string;
    lga: string;
    phone?: string;
 preferences?: Record<string, any>;   
    doctorImage?: IImage; 
    profileImage?: IImage;
    specialization: string;
    licenseNumber: string;
    yearsOfExperience?: number;
    bio?: string;
    contactNumber?: string;
    availability?: Record<string, any>;
    ratings?: number;
    reviews?: Array<{ userId: string; rating: number; comment: string }>;
    status: "submitted" | "reviewing" | "approved" | "rejected";
}

export type AuthEntity = IUser | IDoctor;

export interface DoctorRegistrationData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    gender: string;
    dateOfBirth: string;
    homeAddress: string;
    city: string;
    state: string;
    lga: string;
    specialization: string;
    licenseNumber: string;
}

export interface IProduct {
  _id?: string;              
  partnerId?: string;
  drugId: string;
  partnerProductId: string;
  name: string;
  sku: string;
  imageUrl?: string;
  manufacturerName?: string;
  categoryName?: string;
  description?: string;
  dosageForm?: string;
  strength?: string;
  price: number;
  stockQuantity: number;
  status: "IN_STOCK" | "EXPIRED" | "OUT_OF_STOCK" | string;
}

// 💡 UPDATED: Cart Item Type to match backend schema (using drugId)
export interface ICartItem {
    drugId: string; // The ID used by the partner API / local DB for lookup
    quantity: number;
    price?: number; // Snapshot of the price at the time of addition
    dosage?: string;
    specialInstructions?: string;
    drugName?: string; // Optional field for easier display in frontend
    imageUrl?: string; // Optional field for product image
}

// 💡 UPDATED: Cart Document Type (reflecting Mongoose schema fields)
export interface ICart {
    _id?: string;
    userId?: string; // Mongoose ObjectId, but we use string in frontend
    items: ICartItem[];
    sessionId?: string;
    totalItems: number;
    totalPrice: number;
    partnerCartId?: string;
    isAbandoned?: boolean;
    createdAt?: Date;
    // NOTE: sessionId is used in controller lookup but NOT stored on this model explicitly
}

export interface ICategory {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    slug: string;
}

export interface UserData {
    name: string;
    email: string;
    phone: string;
    gender: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    homeAddress: string;
    city: string;
    state: string;
    lga: string;
}


export interface IPayment{
   orderId: string;
  userId: string;
  paymentMethod: "card" | "paystack" | "bank_transfer";
  partnerReferenceCode: string;
  paymentReference: string;
  transactionId: string;
  checkoutUrl: string;
  amount: number;
  status: "pending" | "success" | "failed";
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Type for the successful response from POST /auth/guest and POST /auth/convert
 */
export interface AuthResponse {
  success: boolean;
  sessionId: string;
  token: string;
  isAnonymous: boolean;
  user?: IUser; 
}

// Add these to your existing backendType.ts file

/**
 * Notification Interface
 */
export type NotificationOwnerType = "User" | "Doctor";

export interface INotification {
  _id: string;
  userId: string;
  userType: NotificationOwnerType; // 👈 add this
  type: "supplement" | "order" | "appointment" | "article" | "system" | "call_ended" | "new_message" | "chat";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    orderId?: string;
    appointmentId?: string;
    conversationId?: string;
     patientId?: string;
    type: "record_access_response" | "record_access_request" | "record_accessed" | "payment_pending"   | "payment_success"
    | "payment_pending"
    | "delivery_update";
    approved?: boolean;
    articleId?: string;
    status?: string;
    doctorName?: string;
    scheduledAt?: string;
    time?: string;
    senderName?: string;
  };
  createdAt: string;
}


/**
 * Generic API Response Interface
 */
export interface IAPIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Upcoming Appointment Summary
 */
export interface IUpcomingAppointment {
  _id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  reason?: string;
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    profileImage?: {
      imageUrl?: string;
      secure_url?: string;
      url?: string;
    } | string;
  };
}

/**
 * Appointments Summary Response
 */
export interface IAppointmentsSummary {
  upcoming: IUpcomingAppointment[];
  pendingCount: number;
}



export interface IAppointment {
  _id?: string;
  userId: string | IUser;
  doctorId: string | IDoctor;
  consultationType?: "video" | "in-person" | "chat" | "audio";
  conversationId?: string;

  scheduledAt: Date;
  proposedAt?: Date;
expiresAt?: Date;
  duration?: number;

  status:
  | "pending" 
  | "confirmed" 
  | "in-progress" 
  | "completed" 
  | "cancelled" 
  | "rejected" 
  | "rescheduled"
  | "expired"
  | "call-ended"
  | "confirmed-upcoming"
  | "about-to-start";

  // ✅ FIXED: Added "ringing" and "idle" to callStatus
  callStatus?: "idle" | "ringing" | "in-progress" | "ended";
  
  callStartedAt?: Date;
  callEndedAt?: Date;
  callEndedBy?: "Doctor" | "User" | "system";
  callDuration?: number;
  callQuality?: "excellent" | "good" | "fair" | "poor";

  paymentStatus?: "pending" | "paid" | "failed";
  paymentReference?: string;

  reason?: string;
  notes?: string;

  shareUserInfo?: boolean;

  patientSnapshot?: {
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: Date;
  };

  createdAt?: Date;
  updatedAt?: Date;
}


export type NotificationData =
  | {
      type: 'incoming_call';
      appointmentId: string;
      callerName: string;
      callerImage?: string;
      callerType: string;
      channelName: string;
    }
  | {
      type: 'appointment';
      appointmentId: string;
    }
  | {
      type: 'order';
      orderId: string;
      amount: number;
    }
  | {
      type: 'doctor';
      doctorId: string;
    }
  | {
      type: 'article';
      slug: string;
    }
  | {
      type: 'video';
      appointmentId: string;
      name: string;
      patientId: string;
      role: string;
    }
  | {
      type?: string;
      [key: string]: any;
    };



    // types/backendType.ts - ADD THESE TYPES

export type MessageType = "text" | "image" | "video" | "audio" | "system" | "document";
export type MessageStatus = "sent" | "delivered" | "read";

export interface IMessage {
  _id: string;
  senderId: string;
  senderType: "User" | "Doctor";
  messageType: MessageType;
  content: string;
  mediaUrl?: string;
  status: MessageStatus;
  createdAt: string;
  readAt?: string;
}

export interface IVideoCallRequest {
  _id: string;
  requestedBy: string;
  requestedByType: "User" | "Doctor";
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
}

export interface IConversation {
  _id: string;
  appointmentId: string | IAppointment;
  participants: {
    userId: IUser;
    doctorId: IDoctor;
  };
  messages: IMessage[];
  lastMessage?: IMessage;
  unreadCount: {
    user: number;
    doctor: number;
  };
  activeVideoRequest?: IVideoCallRequest;
  videoCallHistory: IVideoCallRequest[];
  isActive: boolean;
  isPinned: {
    user: boolean;
    doctor: boolean;
  };
  isMuted: {
    user: boolean;
    doctor: boolean;
  };
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface IPrescription {
  drug: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
 
export interface IDiagnosisEntry {
  code?: string;
  description: string;
  severity?: "mild" | "moderate" | "severe";
}
 
export interface IVitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  oxygenSaturation?: string;
}
 
export interface ILabTest {
  name: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  status?: "normal" | "abnormal" | "pending";
}
 
export interface IConsultationNote {
  _id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  privateNotes: string;
  doctorLicenseNumber: string;
  consultationDate: string;
  chiefComplaint: string;
  vitalSigns?: IVitalSigns;
  diagnosis: IDiagnosisEntry[];
  prescriptions: IPrescription[];
  labTests: ILabTest[];
  followUpInstructions?: string;
  followUpDate?: string;
  attachments: Array<{ url: string; name: string; type: string }>;
  createdAt: string;
  updatedAt: string;
  // privateNotes is intentionally omitted from frontend type
}
 
export interface IMedicalRecord {
  _id: string;
  patientId: string;
  patientSnapshot: {
    name: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    allergies?: string[];
    homeAddress?: string;
  };
  consultationNotes: IConsultationNote[];
  accessLog: Array<{
    doctorId: string;
    doctorName: string;
    appointmentId: string;
    accessedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
 
export interface IAccessRequest {
  _id: string;
  patientId: string;
  requestingDoctorId: string | IDoctor;
  appointmentId: string;
  status: "pending" | "approved" | "denied" | "expired";
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
  notifiedPatient: boolean;
}
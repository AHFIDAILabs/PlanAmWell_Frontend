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
    roles?: string;
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
  partnerProductId?: string;
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

export interface INotification {
  _id: string;
  userId: string;
  type: "supplement" | "order" | "appointment" | "article" | "system";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    orderId?: string;
    appointmentId?: string;
    articleId?: string;
    time?: string;
  };
  createdAt: string;
}

export interface IAPIResponse<T> {
  success: boolean;
  data: T;
}

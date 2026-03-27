export interface CustomerContactFields {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  license_plate: string;
}

export interface CustomerContactPrefill extends CustomerContactFields {
  requestId: number;
}


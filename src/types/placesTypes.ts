export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
}

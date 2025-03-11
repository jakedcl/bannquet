export interface Pin {
  name: string;
  coordinates: [number, number];
  elevation?: string;
  type: string;
  source: string;
}

export interface Category {
  name: string;
  id: string;
  endpoint: string;
  color: string;
}

export interface PinData {
  [categoryId: string]: Pin[];
}

export interface VisibleCategories {
  [categoryId: string]: boolean;
} 
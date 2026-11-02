export interface FamilyMember {
  id: string;
  name: string;
  badge: string;
  likes: string[];
  dislikes: string[];
}

export interface StorePlace {
  name: string;
  badge: string;
  address: string;
  hours: string;
  spec: string;
}

export interface ProductMinimumItem {
  id: string;
  name: string;
  zone: 'fridge' | 'stash';
  norm: string;
  bestStore: string;
  prices: Record<string, number>;
}

export interface CustomFridgeItem {
  name: string;
  cat: string;
}

export interface CustomBuyItem {
  name: string;
  unit: string;
  price: number;
  store: string;
  who: string;
  qty: number;
}

export interface PurchaseReceipt {
  date: string;
  isToday: boolean;
  item: string;
  store: string;
  mode: string;
  price: number;
  photo?: string | null;
  recognizedItems?: string[];
}

export interface ParsedReceiptItem {
  name: string;
  quantity: string;
  price: number;
  category: '🍎 Фрукты' | '🥒 Овощи' | '❄️ В холодос' | '📦 В нычку';
}

export interface ParsedReceiptData {
  store: string;
  totalAmount: number;
  summaryTitle: string;
  items: ParsedReceiptItem[];
}

export interface VisualRecipe {
  id: string;
  cat: string;
  slot?: string;
  title: string;
  time: number;
  kcal: number;
  bju?: string;
  cost?: string;
  img: string;
  kidsTip: string;
  ingredients: string[];
  steps: string[];
}

export interface TreatItem {
  id: string;
  forWho: string;
  title: string;
  price: number;
  kcal: number;
  store: string;
}

export interface GasStationItem {
  id: string;
  cat: string;
  title: string;
  price: number;
  kcal: number;
  who: string;
  img: string;
}

export type MainTab = 'menu' | 'bomzh' | 'treats' | 'gas' | 'shopping';
export type ActivePanel = 'minimum' | 'fridge' | 'budget' | null;

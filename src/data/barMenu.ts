export interface MenuItem {
  id: string;
  name: string;
  category: 'verres' | 'bouteilles' | 'softs';
  subcategory?: string;
  price: number;
  badge?: string;
  badgeColor?: 'pink' | 'purple' | 'emerald' | 'amber';
  description: string;
  volume?: string;
  alcoholic?: boolean;
  flavors?: string[];
}

export interface MenuCategory {
  id: 'all' | 'verres' | 'bouteilles' | 'softs';
  label: string;
  iconName: string;
}

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: 'all', label: 'Toute la Carte', iconName: 'Sparkles' },
  { id: 'verres', label: 'Verres', iconName: 'Wine' },
  { id: 'bouteilles', label: 'Bouteilles VIP', iconName: 'Flame' },
  { id: 'softs', label: 'Softs & Eau', iconName: 'Droplet' },
];

export const BAR_MENU_ITEMS: MenuItem[] = [
  // 🥤 PETIT VERRE
  {
    id: 'petit-verre-sans-alcool',
    name: 'Petit Verre (Sans alcool)',
    category: 'verres',
    subcategory: 'Petit Verre',
    price: 3,
    badge: 'Soft & Frais',
    badgeColor: 'emerald',
    description: 'Format standard sans alcool, servi bien frais avec glaçons.',
    volume: '25 cl',
    alcoholic: false,
  },
  {
    id: 'petit-verre-avec-alcool',
    name: 'Petit Verre (Avec alcool)',
    category: 'verres',
    subcategory: 'Petit Verre',
    price: 5,
    badge: 'Incontournable',
    badgeColor: 'purple',
    description: 'Alcool au choix avec accompagnement soft, servi frais.',
    volume: '25 cl',
    alcoholic: true,
  },

  // 🍹 GRAND VERRE
  {
    id: 'grand-verre-sans-alcool',
    name: 'Grand Verre (Sans alcool)',
    category: 'verres',
    subcategory: 'Grand Verre',
    price: 5,
    badge: 'Maxi Fraîcheur',
    badgeColor: 'emerald',
    description: 'Format généreux sans alcool pour se rafraîchir toute la soirée.',
    volume: '40 cl',
    alcoholic: false,
  },
  {
    id: 'grand-verre-avec-alcool',
    name: 'Grand Verre (Avec alcool)',
    category: 'verres',
    subcategory: 'Grand Verre',
    price: 8,
    badge: '🔥 Bestseller',
    badgeColor: 'pink',
    description: 'Format XL avec alcool et soft, idéal pour garder le rythme de la nuit.',
    volume: '40 cl',
    alcoholic: true,
  },

  // 🍾 BOUTEILLE
  {
    id: 'bouteille-vodka-redbull',
    name: 'Bouteille de Vodka + 3 Red Bull',
    category: 'bouteilles',
    subcategory: 'Pack VIP',
    price: 60,
    badge: '✨ Formule VIP',
    badgeColor: 'pink',
    description: 'Bouteille de vodka accompagnée de 3 canettes de Red Bull fraîches et gobelets (avec glaçons disponibles).',
    volume: '70 cl + 3x25 cl',
    alcoholic: true,
  },

  // 🧃 SOFTS
  {
    id: 'sirop-eau',
    name: 'Sirop à l’eau',
    category: 'softs',
    subcategory: 'Softs',
    price: 2,
    badge: 'Saveurs au choix',
    badgeColor: 'emerald',
    description: 'Eau fraîche et sirop intense au choix parmi nos parfums fruités.',
    volume: '33 cl',
    alcoholic: false,
    flavors: ['Cassis', 'Pêche', 'Pomme', 'Grenadine'],
  },
  {
    id: 'red-bull',
    name: 'Red Bull Energy Drink',
    category: 'softs',
    subcategory: 'Énergie',
    price: 3,
    badge: 'Énergie Pure',
    badgeColor: 'amber',
    description: 'Canette servie glacée pour booster votre énergie sur le dancefloor.',
    volume: 'Canette 25 cl',
    alcoholic: false,
  },
  {
    id: 'bouteille-eau',
    name: 'Bouteille d’eau',
    category: 'softs',
    subcategory: 'Hydratation',
    price: 1,
    badge: 'Essentiel',
    badgeColor: 'emerald',
    description: 'Eau minérale naturelle bien fraîche.',
    volume: '50 cl',
    alcoholic: false,
  },
];

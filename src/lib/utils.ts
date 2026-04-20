import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-900', // Deep Sapphire
  'from-purple-600 to-fuchsia-900', // Amethyst
  'from-emerald-500 to-teal-900', // Emerald
  'from-rose-500 to-red-900', // Ruby
  'from-slate-600 to-slate-900', // Slate
  'from-amber-500 to-orange-900' // Topaz
];

export const getGradientForChild = (id: string) => {
  if (!id) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

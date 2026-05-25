import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_GRADIENTS = [
  'from-cyan-400 to-blue-900', // Cyan Neon
  'from-fuchsia-500 to-purple-900', // Magenta Neon
  'from-violet-500 to-indigo-900', // Deep Indigo
  'from-teal-400 to-emerald-900', // Matrix Green
  'from-rose-500 to-red-900', // Crimson Neon
  'from-yellow-400 to-orange-900' // Solar Flare
];

export const getGradientForChild = (id: string) => {
  if (!id) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

import logoSrc from '../assets/brand/SoloCamionesLogo.png';
import { APP_NAME } from '../config/brand';

type LogoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-20',
};

export type LogoProps = {
  size?: LogoSize;
  className?: string;
};

/** Marca SoloCamiones — reutilizable en login, sidebar y headers. */
export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt={APP_NAME}
      className={`w-auto object-contain ${sizeClasses[size]} ${className}`}
      decoding="async"
    />
  );
}

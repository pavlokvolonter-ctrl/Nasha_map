import type { ButtonHTMLAttributes } from 'react';

const base =
  'cursor-pointer rounded-none border px-3 py-[7px] text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm disabled:cursor-default disabled:opacity-55 max-sm:px-[9px] max-sm:text-xs';

const variants = {
  default: 'border-ink bg-paper text-ink hover:bg-hover',
  primary: 'border-ink bg-ink text-white hover:bg-ink-hover',
  primaryOn: 'border-warm-ink bg-warm text-ink',
  active: 'border-warm-ink bg-warm-soft text-ink',
  ghost: 'border-rule bg-paper text-muted hover:bg-hover',
  danger: 'border-danger bg-paper text-danger hover:bg-hover',
} as const;

export type ButtonVariant = keyof typeof variants;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export default function Button({ variant = 'default', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

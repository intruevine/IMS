import React from 'react';
import type { ContractStatus } from '@/types';
import { getStatusInfo } from '@/shared/utils/contract';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs'
  };

  return (
    <span className={`
      inline-flex items-center font-medium border rounded-full
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: ContractStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  const info = getStatusInfo(status);
  
  const variantMap: Record<ContractStatus, 'success' | 'warning' | 'error' | 'default'> = {
    active: 'success',
    expiring: 'warning',
    expired: 'error',
    unknown: 'default'
  };

  return (
    <Badge variant={variantMap[status]}>
      <span className="flex items-center gap-1.5">
        {showIcon && (
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'expiring' ? 'animate-pulse bg-amber-500' : ''}`} />
        )}
        {info.label}
      </span>
    </Badge>
  );
};

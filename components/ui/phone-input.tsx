'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import {
  formatPhilippinePhone,
  type PhilippinePhoneResult,
} from '@/lib/phone-utils';

interface PhoneInputProps
  extends Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> {
  value?: string;
  onValueChange?: (value: string, result: PhilippinePhoneResult) => void;
}

function PhoneInput({
  value = '',
  onValueChange,
  placeholder = '0917 123 4567',
  inputMode = 'tel',
  autoComplete = 'tel',
  maxLength = 24,
  ...props
}: PhoneInputProps) {
  const formattedValue = formatPhilippinePhone(value).display;

  return (
    <Input
      {...props}
      type="tel"
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      value={formattedValue}
      placeholder={placeholder}
      onChange={(event) => {
        const result = formatPhilippinePhone(event.target.value);
        onValueChange?.(result.display, result);
      }}
    />
  );
}

export { PhoneInput };

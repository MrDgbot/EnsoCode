import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { attrSelector, useSlidingIndicator } from './slidingIndicator';

/**
 * 分段选择：选中块在选项之间平移（「跳跃」），文字颜色随之过渡。
 * 侧栏顶部「项目 | Bot」与设置里的主题切换共用这一套表现。
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange(next: T): void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const indicatorRef = useSlidingIndicator(containerRef, attrSelector('data-seg', value));
  return (
    <span
      ref={containerRef}
      role="radiogroup"
      className={cn('relative isolate flex rounded-lg bg-muted p-0.5', className)}
    >
      <div ref={indicatorRef} aria-hidden className="phone-indicator phone-seg-thumb" />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-seg={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'phone-seg-item flex-1 whitespace-nowrap rounded-md text-center',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1 text-sm',
              // 不切字重：非可变字体的字重变化会让文字宽度跳动
              selected ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

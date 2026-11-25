import { parseHTML } from 'linkedom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PopDigits } from './pop-digits';

describe('PopDigits', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    const { window } = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>');
    Object.assign(globalThis, {
      window,
      document: window.document,
      HTMLElement: window.HTMLElement,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    container = window.document.getElementById('root') as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('uses tabular-nums and only remounts changed digit slots across updates', () => {
    act(() => root.render(<PopDigits value="123" />));

    const group = container.querySelector('.t-digit-group') as HTMLElement;
    expect(group).toBeTruthy();
    expect(group.className).toContain('is-animating');
    expect(group.className).toContain('tabular-nums');

    const initialDigits = Array.from(group.querySelectorAll('.t-digit'));
    expect(initialDigits).toHaveLength(3);
    expect(initialDigits[0].getAttribute('data-stagger')).toBeNull();
    expect(initialDigits[1].getAttribute('data-stagger')).toBe('1');
    expect(initialDigits[2].getAttribute('data-stagger')).toBe('2');

    act(() => root.render(<PopDigits value="124" />));

    const nextGroup = container.querySelector('.t-digit-group') as HTMLElement;
    const nextDigits = Array.from(nextGroup.querySelectorAll('.t-digit'));
    expect(nextGroup).toBe(group);
    expect(nextDigits[0]).toBe(initialDigits[0]);
    expect(nextDigits[1]).toBe(initialDigits[1]);
    expect(nextDigits[2]).not.toBe(initialDigits[2]);
    expect(nextDigits[2].textContent).toBe('4');
  });
});

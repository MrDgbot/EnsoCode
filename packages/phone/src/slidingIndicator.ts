import { type RefObject, useLayoutEffect, useRef } from 'react';

/**
 * 「跳跃」式共享高亮：一组并列元素只有一块高亮底，选中项变化时它平移过去，
 * 而不是旧项熄灭、新项亮起。一组元素只占一个层级，切换也有了连续的方向感。
 *
 * 动画直接写 DOM style（不走 React state）：
 * - 选中项变化 → 带过渡平移；
 * - 布局变化（折叠项目、加载更多、窗口尺寸）→ 无过渡瞬移，因为内容本身是瞬变的，
 *   高亮若慢半拍追过去反而像拖影；
 * - 首次出现 → 原地出现，不从左上角飞入。
 *
 * 被高亮的元素会打上 data-indicated，其余同 key 的副本（同一会话在「活跃中」和项目组
 * 里各出现一次）可据此回退到静态底色。
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  selector: string | null
): RefObject<HTMLDivElement | null> {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const lastSelectorRef = useRef<string | null>(null);
  /** 上次写入的几何；没变就不碰样式——否则每次重渲染的「瞬移」会把进行中的平移直接打断到终点 */
  const lastRectRef = useRef('');
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const place = (animate: boolean) => {
      const current = selectorRef.current;
      const prev = container.querySelector('[data-indicated]');
      const target = current ? container.querySelector<HTMLElement>(current) : null;
      if (prev && prev !== target) prev.removeAttribute('data-indicated');
      if (!target || target.offsetParent === null) {
        indicator.style.opacity = '0';
        visibleRef.current = false;
        lastRectRef.current = '';
        return;
      }
      target.setAttribute('data-indicated', '');
      const c = container.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const x = t.left - c.left + container.scrollLeft - container.clientLeft;
      const y = t.top - c.top + container.scrollTop - container.clientTop;
      const rect = `${x},${y},${t.width},${t.height}`;
      if (rect === lastRectRef.current) return;
      lastRectRef.current = rect;
      const instant = !animate || !visibleRef.current;
      if (instant) indicator.style.transition = 'none';
      indicator.style.width = `${t.width}px`;
      indicator.style.height = `${t.height}px`;
      indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      indicator.style.opacity = '1';
      if (instant) {
        // 强制提交瞬移后的位置，再恢复样式表里的过渡
        void indicator.offsetWidth;
        indicator.style.transition = '';
      }
      visibleRef.current = true;
    };

    const changed = lastSelectorRef.current !== selector;
    lastSelectorRef.current = selector;
    place(changed);

    const observer = new ResizeObserver(() => place(false));
    observer.observe(container);
    for (const child of Array.from(container.children)) observer.observe(child);
    // 子树增删（展开项目组、加载更多）也会挪动目标位置
    const mutation = new MutationObserver(() => place(false));
    mutation.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  });

  return indicatorRef;
}

export function attrSelector(name: string, value: string | null): string | null {
  if (value === null) return null;
  return `[${name}="${CSS.escape(value)}"]`;
}

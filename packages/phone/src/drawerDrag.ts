import { type RefObject, useEffect, useRef } from 'react';

/**
 * 浮层侧栏的拖拽手势（《关于 Drawer 组件的发散》里的分支判断）：
 *   拖拽时：跟手；越过边界（向右拉过全开）加阻尼；
 *   抬手时：（位移是否过 1/3）×（速度大小 × 方向）决定开或关。
 * 快速一甩即可完成，动画时长按剩余距离 / 抬手速度换算——甩得越快收得越快（奖励动量）。
 *
 * 只做「打开时向左拖抽屉本体关闭」。不做从左缘/折叠把手向右拉出：
 * Android 手势导航把屏幕左缘约 30dp 让给了系统返回，网页拿不到这段触摸——
 * 平板实测从把手右拉会直接退出 PWA。把手保持点按打开。
 *
 * 拖拽过程直接写 DOM style，不触发 React 渲染；抬手后交还给 open 状态和样式表过渡。
 * 用 CSS translate 属性而非 transform：抽屉的开合位置本身由 translate 驱动（见 styles.css），
 * 两者会叠加。
 */
export function useDrawerDrag({
  enabled,
  open,
  drawerRef,
  scrimRef,
  onOpen,
  onClose,
}: {
  enabled: boolean;
  open: boolean;
  drawerRef: RefObject<HTMLElement | null>;
  scrimRef: RefObject<HTMLElement | null>;
  onOpen(): void;
  onClose(): void;
}) {
  // 回调走 ref：调用方每次渲染都给新函数，若进依赖，流式消息触发的重渲染会在拖拽中途重绑监听
  const callbacks = useRef({ onOpen, onClose });
  callbacks.current = { onOpen, onClose };
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!enabled || !open || !drawer) return;
    const source = drawer;

    let startX = 0;
    let startY = 0;
    let width = 0;
    let axis: 'x' | 'y' | null = null;
    let offset = 0;
    let samples: { x: number; t: number }[] = [];
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

    /** progress: 0 = 全关，1 = 全开 */
    const paint = (progress: number) => {
      const scrim = scrimRef.current;
      drawer.style.translate = `${(progress - 1) * width}px 0`;
      if (scrim) {
        scrim.style.visibility = 'visible';
        scrim.style.opacity = String(Math.max(0, Math.min(1, progress)));
      }
    };
    const clearInline = () => {
      const scrim = scrimRef.current;
      for (const el of [drawer, scrim]) {
        if (!el) continue;
        el.style.transition = '';
        el.style.translate = '';
        el.style.opacity = '';
        el.style.visibility = '';
      }
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      clearTimeout(clearTimer);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      width = drawer.getBoundingClientRect().width || 1;
      axis = null;
      offset = 0;
      samples = [{ x: startX, t: e.timeStamp }];
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const dx = x - startX;
      const dy = e.touches[0].clientY - startY;
      if (axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // 竖向优先：列表滚动不能被误判成拖抽屉；横向只认朝「关/开」的方向
        const horizontal = Math.abs(dx) > Math.abs(dy) * 1.2 && (open ? dx < 0 : dx > 0);
        axis = horizontal ? 'x' : 'y';
        if (axis === 'x') {
          drawer.style.transition = 'none';
          if (scrimRef.current) scrimRef.current.style.transition = 'none';
        }
      }
      if (axis !== 'x') return;
      e.preventDefault();
      offset = dx;
      let progress = open ? 1 + dx / width : dx / width;
      // 越过全开时用 iOS 橡皮筋公式加阻尼（《如何依靠 transform 模拟 iOS 原生滚动体验》，c = 0.55）：
      // 越拉越紧且永不越过 d，比线性系数更像实物
      if (progress > 1) {
        const over = (progress - 1) * width;
        const d = width * 0.25;
        progress = 1 + ((1 - 1 / ((over * 0.55) / d + 1)) * d) / width;
      }
      paint(Math.max(0, progress));
      samples.push({ x, t: e.timeStamp });
      if (samples.length > 6) samples.shift();
    };

    const onEnd = () => {
      if (axis !== 'x') return;
      axis = null;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      const velocity = (last.x - first.x) / dt; // px/ms，正 = 向右
      const progress = Math.max(0, Math.min(1, open ? 1 + offset / width : offset / width));
      const fling = Math.abs(velocity) > 0.35;
      const shouldOpen = fling ? velocity > 0 : progress > (open ? 2 / 3 : 1 / 3);

      const remaining = (shouldOpen ? 1 - progress : progress) * width;
      const duration = Math.round(
        Math.min(340, Math.max(140, fling ? remaining / Math.abs(velocity) : remaining * 0.9))
      );
      const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
      drawer.style.transition = `translate ${duration}ms ${ease}`;
      const scrim = scrimRef.current;
      if (scrim) scrim.style.transition = `opacity ${duration}ms ${ease}`;
      paint(shouldOpen ? 1 : 0);
      if (shouldOpen !== open)
        (shouldOpen ? callbacks.current.onOpen : callbacks.current.onClose)();
      clearTimer = setTimeout(clearInline, duration + 40);
    };

    source.addEventListener('touchstart', onStart, { passive: true });
    source.addEventListener('touchmove', onMove, { passive: false });
    source.addEventListener('touchend', onEnd);
    source.addEventListener('touchcancel', onEnd);
    return () => {
      source.removeEventListener('touchstart', onStart);
      source.removeEventListener('touchmove', onMove);
      source.removeEventListener('touchend', onEnd);
      source.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, open, drawerRef, scrimRef]);
}

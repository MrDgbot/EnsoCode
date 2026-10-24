import { isStandalone } from './push';

/**
 * Android 版 Edge 的网页应用不上报 env(safe-area-inset-bottom)（恒为 0）。平时 Edge
 * 自己在手势条上方空出一条，页面不会被压住；但平板上装了让页面铺满到底的沉浸模块后，
 * 底部的统计行、侧栏连接状态会和手势条叠在一起。
 *
 * 判断方式：视口高度与屏幕高度只差一个状态栏（≤ 44px）即视为页面铺到了屏幕底，
 * 此时把手势条高度写进 --phone-safe-bottom，交给 pb-safe 统一留白。
 */
const STATUS_BAR_MAX = 44;
const GESTURE_BAR = 18;

export function reachesScreenBottom(screenHeight: number, innerHeight: number): boolean {
  return screenHeight - innerHeight <= STATUS_BAR_MAX;
}

export function installGestureBarInset(): void {
  if (!/Android/i.test(navigator.userAgent) || !/EdgA\//.test(navigator.userAgent)) return;
  const apply = () => {
    if (!isStandalone()) return;
    const root = document.documentElement.style;
    // 键盘弹起时视口变矮，自然不满足条件，留白随之撤掉
    if (reachesScreenBottom(window.screen.height, window.innerHeight)) {
      root.setProperty('--phone-safe-bottom', `${GESTURE_BAR}px`);
    } else {
      root.removeProperty('--phone-safe-bottom');
    }
  };
  window.addEventListener('resize', apply);
  apply();
}

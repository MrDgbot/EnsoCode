import { isStandalone } from './push';

/**
 * Android 版 Edge 的网页应用不上报 env(safe-area-inset-bottom)（恒为 0）。平时 Edge
 * 自己在手势条上方空出一条，页面不会被压住；但平板上装了让页面铺满到底的沉浸模块后，
 * 底部的统计行、侧栏连接状态会和手势条叠在一起。
 *
 * 判断方式：视口高度与屏幕高度只差一个状态栏（≤ 44px）即视为页面铺到了屏幕底，
 * 此时把手势条高度写进 --phone-safe-bottom，交给 pb-safe 统一留白。
 *
 * 同理两侧：模块不留白边，页面背景与分隔线铺满，只有内容避开摄像头
 * （--phone-inset-left；反向横放时摄像头在聊天区一侧，暂不处理）。
 */
const STATUS_BAR_MAX = 44;
const GESTURE_BAR = 18;
/** 平板横放时前置摄像头那一侧的避让宽度（沉浸模块不再留边，由页面只把内容让开） */
const CAMERA_INSET = 40;

/** 摄像头在竖屏顶部；顺时针转成 landscape-primary 后落在左侧，反向时在右侧 */
export function cameraSide(orientation: string): 'left' | 'right' | null {
  if (orientation === 'landscape-primary') return 'left';
  if (orientation === 'landscape-secondary') return 'right';
  return null;
}

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
    const side = cameraSide(screen.orientation?.type ?? '');
    root.setProperty('--phone-inset-left', side === 'left' ? `${CAMERA_INSET}px` : '0px');
  };
  window.addEventListener('resize', apply);
  screen.orientation?.addEventListener('change', apply);
  apply();
}

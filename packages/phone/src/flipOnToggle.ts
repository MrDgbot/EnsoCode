/**
 * 点击引起的增删 / 展开收起，用 FLIP 让布局变化连续（设计垂点《Functional Motion》增删、
 * 《交互动画的层级设计》编排与错峰）：
 * - 点击前记下每个条目的位置；React 提交后（下一帧绘制前）再量一次；
 * - 留下的条目从旧位置用 transform 移到新位置（ease-out，不回弹：点击驱动的移动直接落定）；
 * - 消失的条目在原位留一份拷贝先淡出，其余条目稍后再补位（先淡出、后收拢）；
 * - 新出现的条目等空间让出后再错峰淡入（先撑开、后显现）。
 * 只用 transform / opacity，不动 height；不经过 React state，桌面共享组件零改动。
 */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const MOVE_MS = 320;
const FADE_OUT_MS = 120;
const FADE_IN_MS = 260;
const STAGGER_MS = 18;
const MAX_ANIMATED = 40;

export interface FlipOptions {
  /** 参与动画的条目（同一层级，互不嵌套） */
  items: string;
  /** 只有点到这些元素内的按钮才触发；缺省为整个 root */
  trigger?: string;
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function visibleIn(rect: DOMRect, bounds: DOMRect): boolean {
  return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.height > 0;
}

/** 可见性判断与淡出裁剪以被点元素所在的滚动区为界，缺省退回 root */
function scrollBox(from: Element, root: HTMLElement): HTMLElement {
  for (let el = from.parentElement; el && el !== root.parentElement; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el;
  }
  return root;
}

export function flipOnToggle(root: HTMLElement, options: FlipOptions): () => void {
  let frame = 0;

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const control = target?.closest('button, [role="button"], summary');
    if (!control || !root.contains(control)) return;
    if (options.trigger && !control.closest(options.trigger)) return;
    if (reducedMotion()) return;

    const bounds = scrollBox(control, root).getBoundingClientRect();
    const before = new Map<HTMLElement, DOMRect>();
    for (const el of root.querySelectorAll<HTMLElement>(options.items)) {
      const rect = el.getBoundingClientRect();
      if (visibleIn(rect, bounds)) before.set(el, rect);
    }
    if (before.size === 0) return;

    cancelAnimationFrame(frame);
    // React 在离散事件结束时同步提交；rAF 回调里布局已更新、尚未绘制
    frame = requestAnimationFrame(() => {
      const after = [...root.querySelectorAll<HTMLElement>(options.items)];
      const afterSet = new Set(after);
      const removed = [...before].filter(([el]) => !afterSet.has(el) || !el.isConnected);

      const moveDelay = removed.length > 0 ? FADE_OUT_MS * 0.6 : 0;
      let animated = 0;
      let entering = 0;

      for (const el of after) {
        if (animated >= MAX_ANIMATED) break;
        const now = el.getBoundingClientRect();
        const old = before.get(el);
        if (old) {
          const dx = old.left - now.left;
          const dy = old.top - now.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: MOVE_MS,
            delay: moveDelay,
            easing: EASE,
            fill: 'backwards',
          });
          animated++;
        } else if (visibleIn(now, bounds) && getComputedStyle(el).animationName === 'none') {
          el.animate(
            [
              { opacity: 0, transform: 'translateY(-4px)' },
              { opacity: 1, transform: 'none' },
            ],
            {
              duration: FADE_IN_MS,
              delay: moveDelay + MOVE_MS * 0.35 + Math.min(entering, 10) * STAGGER_MS,
              easing: EASE,
              fill: 'backwards',
            }
          );
          entering++;
          animated++;
        }
      }

      if (removed.length === 0) return;
      // 消失的条目：原位留拷贝先淡出。拷贝放进与 root 同框的裁剪层，不越出滚动区
      const layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      Object.assign(layer.style, {
        position: 'fixed',
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: '5',
      });
      const style = getComputedStyle(root);
      layer.style.color = style.color;
      layer.style.font = style.font;
      for (const [el, rect] of removed.slice(0, MAX_ANIMATED)) {
        const ghost = el.cloneNode(true) as HTMLElement;
        Object.assign(ghost.style, {
          position: 'absolute',
          margin: '0',
          left: `${rect.left - bounds.left}px`,
          top: `${rect.top - bounds.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          animation: 'none',
        });
        layer.append(ghost);
      }
      document.body.append(layer);
      layer
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: FADE_OUT_MS,
          easing: 'ease-out',
          fill: 'forwards',
        })
        .finished.finally(() => layer.remove());
    });
  };

  root.addEventListener('click', onClick, true);
  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener('click', onClick, true);
  };
}

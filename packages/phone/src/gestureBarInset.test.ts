import { describe, expect, it } from 'vitest';
import { reachesScreenBottom } from './gestureBarInset';

describe('reachesScreenBottom', () => {
  it('页面铺到屏幕底（只差状态栏）时需要补手势条留白', () => {
    expect(reachesScreenBottom(640, 600)).toBe(true);
  });
  it('Edge 自己在手势条上方留了空时不重复补', () => {
    expect(reachesScreenBottom(640, 593)).toBe(false);
  });
  it('键盘弹起视口变矮时不补', () => {
    expect(reachesScreenBottom(640, 330)).toBe(false);
  });
});

/**
 * 空会话页「添加项目」CTA 与 Sidebar 中 AddProjectDialog 的桥接。
 */
let openAddProjectFn: (() => void) | null = null;

export function registerAddProject(fn: () => void): () => void {
  openAddProjectFn = fn;
  return () => {
    if (openAddProjectFn === fn) openAddProjectFn = null;
  };
}

export function requestAddProject(): boolean {
  if (!openAddProjectFn) return false;
  openAddProjectFn();
  return true;
}

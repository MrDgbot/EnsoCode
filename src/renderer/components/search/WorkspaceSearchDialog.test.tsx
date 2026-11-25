import { parseHTML } from 'linkedom';
import { act, type ComponentProps, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSearchDialog } from './WorkspaceSearchDialog';

const mocks = vi.hoisted(() => ({
  coldQuery: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'en' }),
}));
vi.mock('@/components/chat/ChatFindBar', () => ({ requestOpenChatFind: vi.fn() }));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
}));
vi.mock('@/components/ui/kbd', () => ({
  Kbd: ({ children }: { children?: ReactNode }) => createElement('kbd', null, children),
  KbdGroup: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
}));
vi.mock('@/components/ui/command', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    Command: Wrap,
    CommandDialog: ({ open, children }: { open: boolean; children?: ReactNode }) =>
      open ? createElement('div', { role: 'dialog' }, children) : null,
    CommandDialogPopup: Wrap,
    CommandEmpty: ({ children }: { children?: ReactNode }) =>
      createElement('div', { 'data-command-empty': '' }, children),
    CommandFooter: Wrap,
    CommandGroup: Wrap,
    CommandGroupLabel: Wrap,
    CommandInput: ({
      endAddon,
      onChange,
      ...props
    }: ComponentProps<'input'> & { endAddon?: ReactNode }) =>
      createElement('div', null, createElement('input', { ...props, onInput: onChange }), endAddon),
    CommandItem: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
      createElement('button', { type: 'button', onClick }, children),
    CommandList: Wrap,
    CommandPanel: Wrap,
    CommandShortcut: Wrap,
  };
});
vi.mock('@/hooks/useSettingsCatalog', () => ({ useSettingsCatalog: () => [] }));
vi.mock('@/lib/keybindings', () => ({
  effectiveKeybindings: () => ({ 'new-conversation': 'mod+n', 'open-settings': 'mod+,' }),
  formatBinding: (b: string) => b,
}));
vi.mock('@/lib/sidePanelDock', () => ({ addSidePanelBrowser: vi.fn() }));
vi.mock('@/lib/time', () => ({ formatRelativeTime: () => 'now' }));
vi.mock('@/stores/appView', () => ({ openSettings: vi.fn() }));
vi.mock('@/stores/sessions', () => {
  const state = () => ({
    conversations: {},
    activeId: null,
    selectConversation: vi.fn(),
    selectTab: vi.fn(),
    newConversation: vi.fn(),
  });
  return {
    useSessionsStore: Object.assign(
      (select: (s: ReturnType<typeof state>) => unknown) => select(state()),
      {
        getState: state,
      }
    ),
  };
});
vi.mock('@/stores/settings', () => ({
  useSettingsStore: (select: (s: unknown) => unknown) =>
    select({
      projects: [{ id: 'proj-1', name: 'Demo', path: '/tmp/demo' }],
      scratchSessionsEnabled: false,
      keybindings: {},
    }),
}));

let root: Root;
let container: HTMLElement;

beforeEach(async () => {
  vi.useFakeTimers();
  mocks.coldQuery.mockReset();
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  Object.assign(window, {
    electronAPI: {
      browser: { listSearchableTabs: vi.fn().mockResolvedValue([]) },
      sshConnections: { list: vi.fn().mockResolvedValue([]) },
      workspaceSearch: { query: mocks.coldQuery },
    },
  });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', window.document);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = window.document.getElementById('root') as unknown as HTMLElement;
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(WorkspaceSearchDialog, { open: true, onOpenChange: () => {} }));
  });
});

afterEach(async () => {
  vi.useRealTimers();
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

async function setInputValue(value: string) {
  const input = container.querySelector('input') as HTMLInputElement;
  await act(async () => {
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('WorkspaceSearchDialog coldPending & empty CTA', () => {
  it('shows searching indicator while cold search is pending instead of flashing no results', async () => {
    let resolveCold: (val: { hits: [] }) => void = () => {};
    mocks.coldQuery.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCold = resolve;
        })
    );

    await setInputValue('nonexistent-xyz');

    const emptyBlock = () => container.querySelector('[data-command-empty]')?.textContent ?? '';
    expect(emptyBlock()).toContain('Searching history…');
    expect(emptyBlock()).not.toContain('No matching results');

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(mocks.coldQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCold({ hits: [] });
      await Promise.resolve();
    });

    expect(emptyBlock()).toContain('No matching results');
    expect(emptyBlock()).toContain('Include archived');
  });

  it('cycles scope from empty-state CTA button and clears query at widest scope', async () => {
    mocks.coldQuery.mockResolvedValue({ hits: [] });
    await setInputValue('missing-query');

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    const empty = container.querySelector('[data-command-empty]');
    const ctaBtn = empty?.querySelector('button') as HTMLButtonElement;
    expect(ctaBtn?.textContent).toContain('Include archived');

    await act(async () => {
      ctaBtn.click();
    });

    const scopeBtn = container.querySelector('[data-search-scope]');
    expect(scopeBtn?.getAttribute('data-search-scope')).toBe('all-including-archived');
    expect(scopeBtn?.querySelector('.t-text-swap')?.textContent).toBe('Include archived');

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    const clearBtn = container.querySelector('[data-command-empty] button') as HTMLButtonElement;
    expect(clearBtn?.textContent).toBe('Clear search');

    await act(async () => {
      clearBtn.click();
    });

    expect((container.querySelector('input') as HTMLInputElement).value).toBe('');
  });
});

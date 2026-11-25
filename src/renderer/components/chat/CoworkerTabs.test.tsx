import { parseHTML } from 'linkedom';
import { act, type ComponentProps, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoworkerTabs } from './CoworkerTabs';

const mocks = vi.hoisted(() => ({
  selectTab: vi.fn(),
  dismissCoworkerFromUI: vi.fn().mockResolvedValue(undefined),
  conversations: {} as Record<string, Record<string, unknown>>,
}));

const translate = (key: string, params?: Record<string, string | number>) =>
  params ? key.replace(/\{\{(\w+)\}\}/g, (_, token: string) => String(params[token] ?? '')) : key;

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: translate }) }));
vi.mock('@/components/app/WindowChrome', () => ({
  ChromeRow: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
}));
vi.mock('@/components/chat/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open
      ? createElement(
          'div',
          { role: 'alertdialog' },
          createElement('h2', null, title),
          description ? createElement('p', null, description) : null,
          createElement('button', { type: 'button', onClick: () => onOpenChange(false) }, 'Cancel'),
          createElement(
            'button',
            {
              type: 'button',
              onClick: () => {
                onConfirm();
                onOpenChange(false);
              },
            },
            confirmLabel
          )
        )
      : null,
}));
vi.mock('@/components/chat/ConversationStatusIndicator', () => ({
  ConversationStatusIndicator: () => createElement('span', null),
}));
vi.mock('@/components/chat/ConversationTitleEdit', () => ({
  ConversationTitleEdit: () => null,
}));
vi.mock('@/components/chat/reloadConversationAction', () => ({
  reloadConversationFromMenu: vi.fn(),
}));
vi.mock('@/components/ui/context-menu', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    ContextMenu: Wrap,
    ContextMenuItem: ({ children, ...props }: ComponentProps<'button'>) =>
      createElement('button', { type: 'button', ...props }, children),
    ContextMenuPopup: Wrap,
    ContextMenuTrigger: Wrap,
  };
});
vi.mock('@/components/ui/dialog', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    Dialog: ({ open, children }: { open: boolean; children?: ReactNode }) =>
      open ? createElement('div', null, children) : null,
    DialogContent: Wrap,
    DialogFooter: Wrap,
    DialogHeader: Wrap,
    DialogPanel: Wrap,
    DialogTitle: Wrap,
  };
});
vi.mock('@/components/ui/field', () => ({
  Field: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
  FieldLabel: ({ children }: { children?: ReactNode }) => createElement('label', null, children),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: ComponentProps<'input'>) => createElement('input', props),
}));
vi.mock('@/components/ui/select', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    Select: Wrap,
    SelectItem: Wrap,
    SelectPopup: Wrap,
    SelectTrigger: Wrap,
    SelectValue: () => null,
  };
});
vi.mock('@/stores/sessions', () => {
  const state = () => ({
    conversations: mocks.conversations,
    selectTab: mocks.selectTab,
    dismissCoworkerFromUI: mocks.dismissCoworkerFromUI,
    renameConversation: vi.fn(),
    hireCoworker: vi.fn(),
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
  useSettingsStore: (select: (s: { agentTypes: never[] }) => unknown) => select({ agentTypes: [] }),
}));

let root: Root;
let container: HTMLElement;
let confirmSpy: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  mocks.selectTab.mockReset();
  mocks.dismissCoworkerFromUI.mockReset().mockResolvedValue(undefined);
  mocks.conversations = {
    parent: {
      id: 'parent',
      title: 'Main chat',
      started: true,
      reloading: false,
      spawning: false,
      coworkerIds: ['cw-1'],
    },
    'cw-1': {
      id: 'cw-1',
      parentId: 'parent',
      title: 'Researcher',
      status: 'idle',
      spawning: false,
      reloading: false,
      pendingApprovalCount: 0,
      pendingAskCount: 0,
      mode: 'coworker',
    },
  };
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  confirmSpy = vi.fn(() => true);
  Object.assign(window, { confirm: confirmSpy });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', window.document);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = window.document.getElementById('root') as unknown as HTMLElement;
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(CoworkerTabs, { parentId: 'parent', displayedId: 'parent' }));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('CoworkerTabs dismiss safety & accessible close button', () => {
  it('uses ConfirmDialog instead of native confirm and dismisses only after confirmation', async () => {
    const dismissBtn = container.querySelector('button[aria-label="Dismiss coworker"]');
    expect(dismissBtn).not.toBeNull();
    expect(dismissBtn?.className).toContain('opacity-0');
    expect(dismissBtn?.className).toContain('group-focus-within/tab:opacity-100');
    expect(dismissBtn?.className).not.toContain('hidden');

    await act(async () => {
      (dismissBtn as HTMLButtonElement).click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mocks.dismissCoworkerFromUI).not.toHaveBeenCalled();
    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Dismiss Researcher?');
    expect(dialog?.textContent).toContain('Its session will be closed.');

    const confirmBtn = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === 'Dismiss coworker'
    ) as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    expect(mocks.dismissCoworkerFromUI).toHaveBeenCalledWith('parent', 'cw-1');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('canceling ConfirmDialog keeps the coworker', async () => {
    const dismissBtn = container.querySelector(
      'button[aria-label="Dismiss coworker"]'
    ) as HTMLButtonElement;
    await act(async () => {
      dismissBtn.click();
    });

    const dialog = container.querySelector('[role="alertdialog"]');
    const cancelBtn = [...(dialog?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === 'Cancel'
    ) as HTMLButtonElement;
    await act(async () => {
      cancelBtn.click();
    });

    expect(mocks.dismissCoworkerFromUI).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });
});

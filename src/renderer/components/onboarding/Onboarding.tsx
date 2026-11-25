import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, Layers, Plug, Server, Sparkles, Wand2, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useOverlayGuard } from '@/hooks/useOverlayGuard';
import { useI18n } from '@/i18n';
import { EASE_SMOOTH_OUT, modalFadeScaleVariants, stepSlideVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useMaterializedProviders } from '@/stores/modelDirectory/useProviders';
import { useSettingsStore } from '@/stores/settings';
import { AgentTypeList } from '../settings/AgentTypesSettings';
import { LocalAssetImportDialog } from '../settings/LocalAssetImportDialog';
import { LocalImportDialog } from '../settings/LocalImportDialog';
import { PresetEditDialog } from '../settings/PresetsSettings';
import { ProviderSetupWizard } from '../settings/ProviderSetupWizard';

type StepId =
  | 'welcome'
  | 'provider'
  | 'skill'
  | 'mcp'
  | 'instruction'
  | 'preset'
  | 'agentType'
  | 'done';
const STEPS: StepId[] = [
  'welcome',
  'provider',
  'skill',
  'mcp',
  'instruction',
  'preset',
  'agentType',
  'done',
];

/** 首次运行引导：欢迎 → 四类导入 → 完成；每步可跳过，随时可关闭 */
export function Onboarding() {
  const { t } = useI18n();
  useOverlayGuard();
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const providers = useMaterializedProviders();
  const skills = useSettingsStore((s) => s.skills);
  const mcpServers = useSettingsStore((s) => s.mcpServers);
  const instructions = useSettingsStore((s) => s.instructions);
  const presets = useSettingsStore((s) => s.presets);

  const [stepIndex, setStepIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [importKind, setImportKind] = React.useState<'skill' | 'mcp' | 'instruction' | null>(null);
  const [providerOpen, setProviderOpen] = React.useState(false);
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [presetOpen, setPresetOpen] = React.useState(false);
  const step = STEPS[stepIndex];

  const finish = React.useCallback(() => setOnboarded(true), [setOnboarded]);
  const next = () => {
    setDirection(1);
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const prev = () => {
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  };
  const jumpTo = (index: number) => {
    if (index === stepIndex || index < 0 || index >= STEPS.length) return;
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  };

  const anyChildDialogOpen = providerOpen || setupOpen || importKind !== null || presetOpen;
  React.useEffect(() => {
    if (anyChildDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyChildDialogOpen, finish]);

  const importStep: Record<
    'provider' | 'skill' | 'mcp' | 'instruction',
    {
      icon: React.ElementType;
      title: string;
      desc: string;
      count: number;
      onImport: () => void;
      importLabel: string;
      /** 可选的第二入口，目前只有 provider 步骤用：订阅登录与本地导入并列 */
      secondary?: { label: string; onClick: () => void };
    }
  > = {
    provider: {
      icon: Server,
      title: t('Model Providers'),
      desc: t('Add a provider subscription or API Key, or import providers from local AI apps'),
      count: providers.length,
      onImport: () => setSetupOpen(true),
      importLabel: t('Add model or provider'),
      secondary: { label: t('Import from local apps'), onClick: () => setProviderOpen(true) },
    },
    skill: {
      icon: Sparkles,
      title: t('Skills'),
      desc: t('Import skills from Claude Code, Codex or Cursor'),
      count: skills.length,
      onImport: () => setImportKind('skill'),
      importLabel: t('Scan and import'),
    },
    mcp: {
      icon: Plug,
      title: t('MCP Servers'),
      desc: t('Import MCP servers configured in local AI apps'),
      count: mcpServers.length,
      onImport: () => setImportKind('mcp'),
      importLabel: t('Scan and import'),
    },
    instruction: {
      icon: Layers,
      title: t('Instruction Files'),
      desc: t('Import global instruction files configured in local AI tools'),
      count: instructions.length,
      onImport: () => setImportKind('instruction'),
      importLabel: t('Scan and import'),
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: EASE_SMOOTH_OUT }}
      className="fixed inset-0 z-[45] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      data-enso-float=""
    >
      <motion.div
        variants={modalFadeScaleVariants}
        initial="initial"
        animate="animate"
        className="relative flex w-[32rem] max-w-[90vw] flex-col rounded-2xl border bg-popover p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={finish}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-[background-color,color,scale] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100"
          aria-label={t('Close')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* 进度点与步数指示 */}
        <div className="mb-5 flex items-center gap-2 pr-7">
          <div className="flex flex-1 items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                disabled={i >= stepIndex}
                onClick={() => jumpTo(i)}
                aria-label={`${i + 1} / ${STEPS.length}`}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= stepIndex ? 'bg-primary' : 'bg-muted',
                  i < stepIndex ? 'cursor-pointer hover:bg-primary/80' : 'cursor-default'
                )}
              />
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 'welcome' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Wand2 className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('Welcome to EnsoCode')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'Import your providers and assets from local AI apps to get started. You can skip any step.'
                    )}
                  </p>
                </div>
              )}

              {step !== 'welcome' &&
                step !== 'done' &&
                step !== 'preset' &&
                step !== 'agentType' && (
                  <ImportStepView
                    {...importStep[step]}
                    importedLabel={t('{{count}} imported', { count: importStep[step].count })}
                  />
                )}

              {step === 'preset' && (
                <ImportStepView
                  icon={Layers}
                  title={t('Presets')}
                  desc={t(
                    'Bundle skills, MCP servers and an instruction file into a preset (optional)'
                  )}
                  count={presets.length}
                  onImport={() => setPresetOpen(true)}
                  importedLabel={t('{{count}} presets', { count: presets.length })}
                  importLabel={t('New preset')}
                />
              )}

              {step === 'agentType' && (
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold">{t('Agent types')}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t('Give subagents their own model, skills and MCP servers (optional)')}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <AgentTypeList />
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Check className="t-success-check h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('All set')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('You can always import more from Settings later.')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 导航 */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={prev} disabled={stepIndex === 0}>
              {t('Back')}
            </Button>
            {stepIndex >= 2 && stepIndex <= 6 && providers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={finish}>
                {t('Start chatting now')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'done' && step !== 'welcome' && (
              <Button variant="ghost" size="sm" onClick={next}>
                {t('Skip')}
              </Button>
            )}
            {step === 'done' ? (
              <Button size="sm" onClick={finish}>
                {t('Done')}
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                {step === 'welcome' ? t('Get started') : t('Next')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* 复用现有导入弹窗（受控） */}
      <LocalImportDialog open={providerOpen} onOpenChange={setProviderOpen} />
      <ProviderSetupWizard open={setupOpen} onOpenChange={setSetupOpen} />
      {importKind && (
        <LocalAssetImportDialog
          kind={importKind}
          open
          onOpenChange={(open) => !open && setImportKind(null)}
        />
      )}
      {presetOpen && <PresetEditDialog preset={null} onClose={() => setPresetOpen(false)} />}
    </motion.div>
  );
}

function ImportStepView({
  icon: Icon,
  title,
  desc,
  count,
  onImport,
  importedLabel,
  importLabel,
  secondary,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  count: number;
  onImport: () => void;
  importedLabel: string;
  importLabel: string;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="mt-1 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onImport}>
          {importLabel}
        </Button>
        {secondary && (
          <Button variant="ghost" size="sm" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </div>
      {count > 0 && <p className="text-xs text-primary">{importedLabel}</p>}
    </div>
  );
}

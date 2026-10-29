const STEPS = [
  { key: 'request', label: 'Request' },
  { key: 'verify', label: 'Verify ownership' },
  { key: 'review', label: 'Human review' },
  { key: 'scan', label: 'Authorized scan' },
];

export default function Stepper({ stage }) {
  // 'rejected' sits at the review step visually.
  const activeKey = stage === 'rejected' ? 'review' : stage;
  const activeIdx = Math.max(0, STEPS.findIndex((s) => s.key === activeKey));

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        const rejected = current && stage === 'rejected';
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={[
                'flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-semibold',
                rejected
                  ? 'bg-danger text-white'
                  : done
                    ? 'bg-home text-bg'
                    : current
                      ? 'bg-home text-bg'
                      : 'border border-line2 text-mute',
              ].join(' ')}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[13px] ${current ? 'font-medium text-fg' : 'text-mute'}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line2 sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

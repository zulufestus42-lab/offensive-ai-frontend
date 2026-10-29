import { useEffect, useState } from 'react';
import Stepper from './Stepper.jsx';
import RequestForm from './RequestForm.jsx';
import VerifyOwnership from './VerifyOwnership.jsx';
import PendingReview from './PendingReview.jsx';
import ScanConsole from './ScanConsole.jsx';
import Autopilot from './Autopilot.jsx';
import { getEngagement, stageOf } from '../../lib/redteam.js';

const KEY = 'oai_rt_engagement';

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const save = (e) => {
  try {
    if (e) localStorage.setItem(KEY, JSON.stringify(e));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
};

export default function RedTeam() {
  const [engagement, setEngagement] = useState(load);
  const [scanView, setScanView] = useState('autopilot');

  // On mount, refresh status flags from the backend (verification/token stay local).
  useEffect(() => {
    if (!engagement?.id) return;
    getEngagement(engagement.id)
      .then((fresh) => update({ ...engagement, ...fresh }))
      .catch(() => {
        /* offline or engagement gone — keep local copy */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (e) => {
    setEngagement(e);
    save(e);
  };
  const reset = () => {
    setEngagement(null);
    save(null);
  };

  const stage = stageOf(engagement);

  return (
    <div className="pb-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Stepper stage={stage} />
        {engagement && (
          <button type="button" onClick={reset} className="text-[12.5px] text-mute underline-offset-2 hover:text-fg hover:underline">
            Start a new request
          </button>
        )}
      </div>

      {stage === 'request' && <RequestForm onCreated={update} />}
      {stage === 'verify' && <VerifyOwnership engagement={engagement} onChange={update} />}
      {stage === 'review' && <PendingReview engagement={engagement} onChange={update} />}
      {stage === 'rejected' && <PendingReview engagement={engagement} onChange={update} rejected />}
      {stage === 'scan' && (
        <div>
          <div className="mx-auto mb-6 flex w-fit gap-1 rounded-lg border border-line2 p-1">
            {[
              ['autopilot', 'Autopilot'],
              ['console', 'Manual console'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setScanView(key)}
                className={`rounded-md px-4 py-1.5 text-[13px] ${scanView === key ? 'bg-fg text-bg' : 'text-fg2 hover:text-fg'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {scanView === 'autopilot' ? <Autopilot engagement={engagement} /> : <ScanConsole engagement={engagement} />}
        </div>
      )}
    </div>
  );
}

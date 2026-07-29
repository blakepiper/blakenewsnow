import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboard';

interface KeyboardHelpProps {
  onClose: () => void;
}

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5">
              <span className="text-white/70 text-sm">{shortcut.action}</span>
              <div className="flex gap-1.5">
                {shortcut.keys.map((key, keyIdx) => (
                  <span key={keyIdx}>
                    {keyIdx > 0 && <span className="text-white/50 text-xs mx-1">or</span>}
                    <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs font-sans">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/60 text-xs text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

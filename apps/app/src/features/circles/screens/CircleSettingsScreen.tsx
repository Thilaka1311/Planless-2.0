import React from 'react';

/**
 * @deprecated CircleSettingsScreen has been deprecated.
 * Circle Member Removal and all other settings/info UI have been moved to CircleDetailScreen.tsx.
 * Avoid using this screen in any active application flow.
 */
export const CircleSettingsScreen = (props: any) => {
  return (
    <div className="p-6 text-center text-zinc-500 font-mono text-xs">
      <p>CircleSettingsScreen is Deprecated.</p>
      <p className="mt-2 text-[10px]">All settings have been moved to CircleDetailScreen.</p>
      <button
        type="button"
        onClick={props.onBack}
        className="mt-4 px-3 py-1 bg-zinc-800 text-white rounded text-[10px] uppercase font-bold"
      >
        Go Back
      </button>
    </div>
  );
};

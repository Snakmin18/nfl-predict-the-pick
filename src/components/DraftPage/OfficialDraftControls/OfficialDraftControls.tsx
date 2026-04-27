type Props = {
  canEditOfficial: boolean;
  handleSaveDraft: () => Promise<void>;
  message: string;
  saveStatus: string;
};

export default function OfficialDraftControls({
  canEditOfficial,
  handleSaveDraft,
  message,
  saveStatus,
}: Props) {
  return (
    <div className="card">
      <h2>Official results</h2>
      <p>{message}</p>
      {canEditOfficial && (
        <button type="button" onClick={handleSaveDraft}>
          Save Official Results
        </button>
      )}
      {saveStatus && <p>{saveStatus}</p>}
    </div>
  );
}

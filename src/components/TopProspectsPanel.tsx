import type { Prospect } from "../types/prospect";
import ProspectPicker from "./ProspectPicker";

type Props = {
  prospects: Prospect[];
  selectedPickNumber: number | null;
  isLocked?: boolean;
  onDraftProspect: (prospect: Prospect) => void;
};

export default function TopProspectsPanel({
  prospects,
  selectedPickNumber,
  isLocked = false,
  onDraftProspect,
}: Props) {
  return (
    <aside className="prospects-panel">
      <h2>Top Available Prospects</h2>
      <p>
        {selectedPickNumber
          ? isLocked
            ? "This draft has been submitted"
            : `Drafting for pick #${selectedPickNumber}`
          : "Select a pick to draft a player"}
      </p>

      <ProspectPicker
        prospects={prospects}
        selectedPickNumber={selectedPickNumber}
        isLocked={isLocked}
        inputId="prospect-search"
        onDraftProspect={onDraftProspect}
      />
    </aside>
  );
}

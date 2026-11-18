import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes } from "@fortawesome/free-solid-svg-icons";

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FontAwesomeIcon icon={faCubes} className="h-3.5 w-3.5" />
      </span>
      Forge
    </span>
  );
}

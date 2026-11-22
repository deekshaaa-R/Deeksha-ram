import { VehicleSearch } from '../VehicleSearch';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';
import type { PlatformVehicle } from '../../utils/unifiedPlatformLogic';

export interface GlobalRtoSearchBarProps {
  liveVehicles: PlatformVehicle[];
  onSelectVehicleForTracking: (record: RtoVehicleMetadata) => void;
  variant?: 'topbar' | 'hero' | 'compact';
  placeholder?: string;
  initialQuery?: string;
  onQueryChange?: (q: string) => void;
  testIdPrefix?: string;
}

/**
 * Platform-scoped adapter wrapping the reusable global VehicleSearch component.
 */
export function GlobalRtoSearchBar({
  liveVehicles,
  onSelectVehicleForTracking,
  variant = 'topbar',
  placeholder,
  initialQuery = '',
  onQueryChange,
  testIdPrefix = 'global-rto-search',
}: GlobalRtoSearchBarProps) {
  return (
    <VehicleSearch
      liveVehicles={liveVehicles}
      onTrackVehicle={onSelectVehicleForTracking}
      variant={variant}
      placeholder={placeholder}
      initialQuery={initialQuery}
      onQueryChange={onQueryChange}
      isAuthenticatedOverride
      testIdPrefix={testIdPrefix}
    />
  );
}

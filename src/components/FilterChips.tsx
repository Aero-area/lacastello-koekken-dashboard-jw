import { Button } from "@/components/ui/button";
import { UserPlus, Plus } from "lucide-react";

interface FilterChipsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onCreateCustomer?: () => void;
  onCreateOrder?: () => void;
}

const filterOptions = [
  { label: "Alle", value: "all" },
  { label: "Afhentning", value: "pickup" },
  { label: "Udbringning", value: "delivery" }
];

export function FilterChips({ activeFilter, onFilterChange, onCreateCustomer, onCreateOrder }: FilterChipsProps) {
  return (
    <div className="px-4 py-2 flex gap-2 overflow-x-auto">
      {/* Filter chips */}
      {filterOptions.map((option) => (
        <Button
          key={option.value}
          variant={activeFilter === option.value ? "default" : "secondary"}
          size="sm"
          onClick={() => onFilterChange(option.value)}
          className="whitespace-nowrap min-h-[44px] rounded-full"
        >
          {option.label}
        </Button>
      ))}
      
      {/* Action buttons */}
      <div className="flex gap-2 ml-auto">
        {onCreateCustomer && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateCustomer}
            className="whitespace-nowrap min-h-[44px] rounded-full gap-1"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Ny kunde</span>
          </Button>
        )}
        {onCreateOrder && (
          <Button
            variant="default"
            size="sm"
            onClick={onCreateOrder}
            className="whitespace-nowrap min-h-[44px] rounded-full gap-1"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ny ordre</span>
          </Button>
        )}
      </div>
    </div>
  );
}
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchTechnicians } from "@/lib/actions";

interface TechnicianOption {
  value: string;
  label: string;
}

interface TechnicianComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function TechnicianCombobox({
  value,
  onChange,
  placeholder = "Изберете техник...",
  label,
}: TechnicianComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [technicians, setTechnicians] = React.useState<TechnicianOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch technicians from Supabase on mount
  React.useEffect(() => {
    let isMounted = true;

    async function loadTechnicians() {
      try {
        const data = await fetchTechnicians();
        if (isMounted) {
          // Map Technician type to combobox options
          const options = data.map((tech) => ({
            value: tech.id,
            label: tech.name,
          }));
          setTechnicians(options);
        }
      } catch (error) {
        console.error("[TechnicianCombobox] Error loading technicians:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTechnicians();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTechnician = technicians.find((tech) => tech.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        <span className="ml-1 text-destructive">*</span>
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isLoading}
            className={cn(
              "h-11 w-full justify-between border-border bg-card text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              {isLoading 
                ? "Зареждане..." 
                : selectedTechnician 
                  ? selectedTechnician.label 
                  : placeholder}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Търсене на техник..." />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : technicians.length === 0 ? (
                <CommandEmpty>Няма намерени техници в базата данни.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {technicians.map((tech) => (
                    <CommandItem
                      key={tech.value}
                      value={tech.label}
                      onSelect={() => {
                        onChange(tech.value === value ? "" : tech.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === tech.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tech.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

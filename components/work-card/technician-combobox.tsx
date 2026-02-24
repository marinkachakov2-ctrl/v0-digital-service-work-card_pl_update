"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
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

// Sample technicians list - in real app this would come from API/database
const technicians = [
  { value: "ivan-petrov", label: "Иван Петров" },
  { value: "georgi-dimitrov", label: "Георги Димитров" },
  { value: "stefan-ivanov", label: "Стефан Иванов" },
  { value: "nikolay-georgiev", label: "Николай Георгиев" },
  { value: "dimitar-todorov", label: "Димитър Тодоров" },
  { value: "aleksandar-stoyanov", label: "Александър Стоянов" },
  { value: "hristo-marinov", label: "Христо Маринов" },
  { value: "petar-kolev", label: "Петър Колев" },
];

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
            className={cn(
              "h-11 w-full justify-between border-border bg-card text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {selectedTechnician ? selectedTechnician.label : placeholder}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Търсене на техник..." />
            <CommandList>
              <CommandEmpty>Няма намерени техници.</CommandEmpty>
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

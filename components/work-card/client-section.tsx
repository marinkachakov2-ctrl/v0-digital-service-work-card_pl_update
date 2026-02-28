"use client";

import { useState, useEffect, useCallback } from "react";
import type { ClientData } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, MapPin, Tractor, Hash, Cpu, Receipt, Clock, Search, Loader2 } from "lucide-react";
import { searchMachines } from "@/lib/actions";
import type { MachineSearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ClientSectionProps {
  clientData: ClientData | null;
  isScanned: boolean;
  jobType: "warranty" | "repair" | "internal";
  onJobTypeChange: (type: "warranty" | "repair" | "internal") => void;
  onBillingEntityChange: (value: string) => void;
  onMachineSelect: (machine: MachineSearchResult) => void;
}

export function ClientSection({
  clientData,
  isScanned,
  jobType,
  onJobTypeChange,
  onBillingEntityChange,
  onMachineSelect,
}: ClientSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MachineSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search using server action
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMachines(searchQuery);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectMachine = useCallback((machine: MachineSearchResult) => {
    onMachineSelect(machine);
    setSearchQuery("");
    setShowResults(false);
  }, [onMachineSelect]);
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          Клиент и Машина
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Machine Search */}
        {!isScanned && (
          <div className="relative">
            <Label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="h-3 w-3" />
              Търсене на машина (модел, сериен номер, клиент)
            </Label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Въведете поне 2 символа..."
                className="bg-card text-foreground border-primary/30 focus:border-primary pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                <div className="max-h-64 overflow-y-auto p-1">
                  {searchResults.map((machine) => (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() => handleSelectMachine(machine)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{machine.model}</span>
                        <span className="text-xs text-muted-foreground">{machine.engineHours} h</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{machine.serialNo}</span>
                        <span className="text-xs text-primary">• {machine.ownerName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-3 shadow-lg">
                <p className="text-sm text-muted-foreground text-center">Няма намерени резултати</p>
              </div>
            )}
          </div>
        )}

        {/* Machine Owner & Billing Entity */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Собственик на машина
            </Label>
            <Input
              readOnly
              value={clientData?.machineOwner || ""}
              placeholder="--"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" />
              Платец (Billing Entity)
            </Label>
            <Input
              value={clientData?.billingEntity || ""}
              onChange={(e) => onBillingEntityChange(e.target.value)}
              placeholder={clientData?.machineOwner || "--"}
              disabled={!isScanned}
              className="bg-card text-foreground border-primary/30 focus:border-primary"
            />
            {clientData && clientData.billingEntity !== clientData.machineOwner && (
              <p className="text-[10px] text-amber-500">Different from Machine Owner</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Локация
            </Label>
            <Input
              readOnly
              value={clientData?.location || ""}
              placeholder="--"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tractor className="h-3 w-3" />
              Модел Машина
            </Label>
            <Input
              readOnly
              value={clientData?.machineModel || ""}
              placeholder="--"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Сериен No
            </Label>
            <Input
              readOnly
              value={clientData?.serialNo || ""}
              placeholder="--"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3 w-3" />
              Engine SN
            </Label>
            <Input
              readOnly
              value={clientData?.engineSN || ""}
              placeholder="--"
              className="bg-secondary text-foreground"
            />
          </div>
        </div>

        {/* Previous Engine Hours — read-only reference */}
        {clientData?.previousEngineHours != null && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-4 py-2.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Previous Engine Hours (last completed JC)</p>
              <p className="font-mono text-sm font-semibold text-foreground">{clientData.previousEngineHours.toLocaleString()} h</p>
            </div>
          </div>
        )}

        {/* Job Type Radio */}
        <div className="border-t border-border pt-4">
          <Label className="mb-3 block text-xs text-muted-foreground">Тип на работа</Label>
          <RadioGroup
            value={jobType}
            onValueChange={(val) => onJobTypeChange(val as "warranty" | "repair" | "internal")}
            className="flex flex-wrap gap-4"
            disabled={!isScanned}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="warranty" id="job-warranty" />
              <Label htmlFor="job-warranty" className="cursor-pointer text-sm text-foreground">
                Гаранция
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="repair" id="job-repair" />
              <Label htmlFor="job-repair" className="cursor-pointer text-sm text-foreground">
                Ремонт
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="internal" id="job-internal" />
              <Label htmlFor="job-internal" className="cursor-pointer text-sm text-foreground">
                Вътрешен труд
              </Label>
            </div>
          </RadioGroup>
          {jobType === "warranty" && (
            <p className="mt-2 text-[10px] text-amber-500">Warranty: enforces 1:1 Order / Job Card relationship</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

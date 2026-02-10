"use client";

import type { ClientData } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, MapPin, Tractor, Hash, Cpu } from "lucide-react";

interface ClientSectionProps {
  clientData: ClientData | null;
  isScanned: boolean;
  warranty: boolean;
  repair: boolean;
  internalLabor: boolean;
  onWarrantyChange: (checked: boolean) => void;
  onRepairChange: (checked: boolean) => void;
  onInternalLaborChange: (checked: boolean) => void;
}

export function ClientSection({
  clientData,
  isScanned,
  warranty,
  repair,
  internalLabor,
  onWarrantyChange,
  onRepairChange,
  onInternalLaborChange,
}: ClientSectionProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          Клиент и Машина
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client & Machine Fields */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Client Name
            </Label>
            <Input
              readOnly
              value={clientData?.clientName || ""}
              placeholder="—"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Location
            </Label>
            <Input
              readOnly
              value={clientData?.location || ""}
              placeholder="—"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tractor className="h-3 w-3" />
              Machine Model
            </Label>
            <Input
              readOnly
              value={clientData?.machineModel || ""}
              placeholder="—"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Serial No
            </Label>
            <Input
              readOnly
              value={clientData?.serialNo || ""}
              placeholder="—"
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
              placeholder="—"
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              VIN
            </Label>
            <Input
              readOnly
              value={clientData?.vin || ""}
              placeholder="—"
              className="bg-secondary text-foreground"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-6 border-t border-border pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="warranty"
              checked={warranty}
              onCheckedChange={(checked) => onWarrantyChange(checked === true)}
              disabled={!isScanned}
            />
            <Label
              htmlFor="warranty"
              className="cursor-pointer text-sm text-foreground"
            >
              Гаранция
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="repair"
              checked={repair}
              onCheckedChange={(checked) => onRepairChange(checked === true)}
              disabled={!isScanned}
            />
            <Label
              htmlFor="repair"
              className="cursor-pointer text-sm text-foreground"
            >
              Ремонт
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal-labor"
              checked={internalLabor}
              onCheckedChange={(checked) => onInternalLaborChange(checked === true)}
              disabled={!isScanned}
            />
            <Label
              htmlFor="internal-labor"
              className="cursor-pointer text-sm text-foreground"
            >
              Вътрешен труд
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

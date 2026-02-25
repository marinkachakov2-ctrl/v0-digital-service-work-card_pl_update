"use client";

import type { ClientData } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, MapPin, Tractor, Hash, Cpu, Receipt, Clock } from "lucide-react";

interface ClientSectionProps {
  clientData: ClientData | null;
  isScanned: boolean;
  jobType: "warranty" | "repair" | "internal";
  onJobTypeChange: (type: "warranty" | "repair" | "internal") => void;
  onBillingEntityChange: (value: string) => void;
}

export function ClientSection({
  clientData,
  isScanned,
  jobType,
  onJobTypeChange,
  onBillingEntityChange,
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

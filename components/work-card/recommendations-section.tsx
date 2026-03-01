"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, AlertTriangle, Lightbulb } from "lucide-react";

export interface RecommendationsData {
  pendingIssues: string;
  pendingReason: string;
  recommendations: string;
}

interface RecommendationsSectionProps {
  data: RecommendationsData;
  onChange: (data: RecommendationsData) => void;
}

const pendingReasonOptions = [
  { value: "", label: "-- Изберете причина --" },
  { value: "no_parts", label: "Липса на части" },
  { value: "customer_refused", label: "Отказ от клиента" },
  { value: "specialized_service", label: "Нужда от специализиран сервиз" },
  { value: "time_constraint", label: "Липса на време" },
  { value: "other", label: "Друга причина" },
];

export function RecommendationsSection({
  data,
  onChange,
}: RecommendationsSectionProps) {
  const handleChange = (field: keyof RecommendationsData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <ClipboardList className="h-4 w-4 text-amber-500" />
          Бъдещи препоръки и забележки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pending Issues / New Remarks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Нови забележки
          </Label>
          <Textarea
            value={data.pendingIssues}
            onChange={(e) => handleChange("pendingIssues", e.target.value)}
            placeholder="Опишете проблеми, които не са отстранени при това посещение..."
            className="min-h-24 bg-card text-foreground border-border focus:border-amber-500/50"
          />
          <p className="text-[10px] text-muted-foreground">
            Тези забележки ще бъдат видими при следващото посещение на машината.
          </p>
        </div>

        {/* Reason for Not Resolving */}
        {data.pendingIssues && data.pendingIssues.trim().length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-foreground">
              Причина за не-отстраняване
            </Label>
            <Select
              value={data.pendingReason}
              onValueChange={(val) => handleChange("pendingReason", val)}
            >
              <SelectTrigger className="bg-card text-foreground border-border">
                <SelectValue placeholder="Изберете причина..." />
              </SelectTrigger>
              <SelectContent>
                {pendingReasonOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* General Recommendations */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            Общи препоръки
          </Label>
          <Textarea
            value={data.recommendations}
            onChange={(e) => handleChange("recommendations", e.target.value)}
            placeholder="Препоръки за профилактика, подмяна на части, бъдещо обслужване..."
            className="min-h-20 bg-card text-foreground border-border focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
}

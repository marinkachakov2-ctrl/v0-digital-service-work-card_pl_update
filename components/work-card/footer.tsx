"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, PenLine } from "lucide-react";

interface FooterProps {
  laborTotal: number;
  partsTotal: number;
  vat: number;
  grandTotal: number;
}

export function Footer({
  laborTotal,
  partsTotal,
  vat,
  grandTotal,
}: FooterProps) {
  return (
    <div className="space-y-6">
      {/* Payment & Totals */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            Плащане и Сметка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Начин на плащане</Label>
              <div className="flex items-center space-x-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  По банков път
                </span>
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-border bg-secondary p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Total:</span>
                  <span className="font-mono text-foreground">{laborTotal.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parts Total:</span>
                  <span className="font-mono text-foreground">{partsTotal.toFixed(2)} лв.</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono text-foreground">
                    {(laborTotal + partsTotal).toFixed(2)} лв.
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (20%):</span>
                  <span className="font-mono text-foreground">{vat.toFixed(2)} лв.</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-foreground">Grand Total:</span>
                  <span className="font-mono text-xl font-bold text-primary">
                    {grandTotal.toFixed(2)} лв.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <PenLine className="h-4 w-4 text-primary" />
            Подписи (Signatures)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Technician</Label>
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary">
                <span className="text-sm text-muted-foreground">Signature Area</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary">
                <span className="text-sm text-muted-foreground">Signature Area</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        The client agrees to the general terms of Megatron EAD.
      </p>
    </div>
  );
}

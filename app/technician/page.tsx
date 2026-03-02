"use client";

import { useState } from "react";
import { TechnicianHeader } from "@/components/work-card/technician-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Package, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PartItem } from "@/app/page";

export default function TechnicianPage() {
  const [parts, setParts] = useState<PartItem[]>([]);

  // Demo job card data
  const demoJobCard = {
    id: "JC-2026-0302-1234",
    orderNo: "TEMP-2026-4521",
    customerName: "Агро Трейд ЕООД",
    location: "с. Белозем, Пловдив",
    machineModel: "John Deere 8R 410",
    machineSerial: "1RW8410DCPD012345",
  };

  const handleImportRepairs = (repairs: Array<{ id: string; description: string; estimatedCost: number; machineVin: string; status: string; sourceJobCardId: string | null; partId: string | null; laborId: string | null; createdAt: string }>) => {
    const newParts: PartItem[] = repairs.map((r) => ({
      id: crypto.randomUUID(),
      partNo: "IMPORTED",
      description: r.description,
      qty: 1,
      unitPrice: r.estimatedCost,
      status: "deferred" as const,
    }));
    setParts((prev) => [...prev, ...newParts]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-background/80 backdrop-blur">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
      </div>

      {/* Technician Header with Tabs */}
      <TechnicianHeader
        jobCard={{
          id: demoJobCard.id,
          orderNo: demoJobCard.orderNo,
          customerName: demoJobCard.customerName,
          location: demoJobCard.location,
          machineModel: demoJobCard.machineModel,
          serialNumber: demoJobCard.machineSerial,
        }}
        isEnabled={true}
        onImportRepairs={handleImportRepairs}
      />

      {/* Main Content Area */}
      <div className="p-4 space-y-4 pb-24">
        {/* Imported Parts */}
        {parts.length > 0 && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                <Package className="h-5 w-5" />
                Imported Deferred Repairs ({parts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {parts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <span className="text-sm font-medium">{part.description}</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                      {part.unitPrice.toFixed(2)} лв.
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/" className="block">
              <Button
                variant="outline"
                className="w-full h-20 flex-col gap-2 text-base"
              >
                <FileText className="h-6 w-6" />
                Full Work Card
              </Button>
            </Link>
            <Link href="/tablet" className="block">
              <Button
                variant="outline"
                className="w-full h-20 flex-col gap-2 text-base"
              >
                <Wrench className="h-6 w-6" />
                Tablet View
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-500/5 border-blue-500/30">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              This mobile-optimized view shows the TechnicianHeader component with:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Job Card details with high-contrast display</li>
              <li>Critical alert banner for deferred repairs</li>
              <li>Tabs for Current Task, Machine History, and Tech Docs</li>
              <li>Large touch-friendly buttons for outdoor use</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

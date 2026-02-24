"use client";

import type { PartItem } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";

interface PartsTableProps {
  parts: PartItem[];
  onPartsChange: (parts: PartItem[]) => void;
}

export function PartsTable({ parts, onPartsChange }: PartsTableProps) {
  const addPart = () => {
    const newPart: PartItem = {
      id: crypto.randomUUID(),
      partNo: "",
      description: "",
      qty: 1,
      price: 0,
    };
    onPartsChange([...parts, newPart]);
  };

  const updatePart = (id: string, field: keyof PartItem, value: string | number) => {
    onPartsChange(
      parts.map((part) =>
        part.id === id ? { ...part, [field]: value } : part
      )
    );
  };

  const removePart = (id: string) => {
    onPartsChange(parts.filter((part) => part.id !== id));
  };

  const subtotal = parts.reduce((sum, part) => sum + part.qty * part.price, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Package className="h-4 w-4 text-primary" />
          Части (Parts)
        </CardTitle>
        <Button
          onClick={addPart}
          size="sm"
          className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Part
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Part No</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-right text-muted-foreground">Qty</TableHead>
                <TableHead className="text-right text-muted-foreground">Price (лв.)</TableHead>
                <TableHead className="text-right text-muted-foreground">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No parts added. Click &quot;Add Part&quot; to add a new part.
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow key={part.id} className="border-border">
                    <TableCell>
                      <Input
                        value={part.partNo}
                        onChange={(e) => updatePart(part.id, "partNo", e.target.value)}
                        placeholder="Part #"
                        className="h-9 bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={part.description}
                        onChange={(e) => updatePart(part.id, "description", e.target.value)}
                        placeholder="Description"
                        className="h-9 bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={part.qty}
                        onChange={(e) => updatePart(part.id, "qty", parseInt(e.target.value) || 1)}
                        className="h-9 w-20 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={part.price}
                        onChange={(e) => updatePart(part.id, "price", parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {(part.qty * part.price).toFixed(2)} лв.
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePart(part.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Subtotal */}
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Parts Subtotal:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {subtotal.toFixed(2)} лв.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

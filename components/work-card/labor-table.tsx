"use client";

import type { LaborItem } from "@/app/page";
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
import { Plus, Trash2, Wrench } from "lucide-react";

interface LaborTableProps {
  laborItems: LaborItem[];
  onLaborItemsChange: (items: LaborItem[]) => void;
}

export function LaborTable({ laborItems, onLaborItemsChange }: LaborTableProps) {
  const addLaborItem = () => {
    const newItem: LaborItem = {
      id: crypto.randomUUID(),
      operationName: "",
      techCount: 1,
      price: 0,
    };
    onLaborItemsChange([...laborItems, newItem]);
  };

  const updateLaborItem = (id: string, field: keyof LaborItem, value: string | number) => {
    onLaborItemsChange(
      laborItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLaborItem = (id: string) => {
    onLaborItemsChange(laborItems.filter((item) => item.id !== id));
  };

  const subtotal = laborItems.reduce((sum, item) => sum + item.techCount * item.price, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Wrench className="h-4 w-4 text-primary" />
          Труд (Labor)
        </CardTitle>
        <Button
          onClick={addLaborItem}
          size="sm"
          className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Operation
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Operation Name</TableHead>
                <TableHead className="text-right text-muted-foreground">Tech Count</TableHead>
                <TableHead className="text-right text-muted-foreground">Price (лв.)</TableHead>
                <TableHead className="text-right text-muted-foreground">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborItems.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No operations added. Click &quot;Add Operation&quot; to add a new operation.
                  </TableCell>
                </TableRow>
              ) : (
                laborItems.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell>
                      <Input
                        value={item.operationName}
                        onChange={(e) => updateLaborItem(item.id, "operationName", e.target.value)}
                        placeholder="Operation name"
                        className="h-9 bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.techCount}
                        onChange={(e) => updateLaborItem(item.id, "techCount", parseInt(e.target.value) || 1)}
                        className="h-9 w-20 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateLaborItem(item.id, "price", parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {(item.techCount * item.price).toFixed(2)} лв.
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLaborItem(item.id)}
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
            <span className="text-sm text-muted-foreground">Labor Subtotal:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {subtotal.toFixed(2)} лв.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

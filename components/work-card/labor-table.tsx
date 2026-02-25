"use client";

import { useState } from "react";
import type { LaborItem } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Wrench, Pencil } from "lucide-react";

interface LaborTableProps {
  laborItems: LaborItem[];
  onLaborItemsChange: (items: LaborItem[]) => void;
  isAdmin?: boolean;
}

export function LaborTable({ laborItems, onLaborItemsChange, isAdmin = false }: LaborTableProps) {
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const openEditDialog = (item: LaborItem) => {
    setEditingItem({ ...item });
    setEditDialogOpen(true);
  };

  const saveEdit = () => {
    if (editingItem) {
      onLaborItemsChange(
        laborItems.map((item) =>
          item.id === editingItem.id ? editingItem : item
        )
      );
    }
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const subtotal = laborItems.reduce((sum, item) => sum + item.techCount * item.price, 0);

  return (
    <>
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
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laborItems.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
                              title="Admin Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLaborItem(item.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Admin Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-500" />
              Admin Edit: Labor Entry
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Operation Name</Label>
                <Input
                  value={editingItem.operationName}
                  onChange={(e) => setEditingItem({ ...editingItem, operationName: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Tech Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingItem.techCount}
                    onChange={(e) => setEditingItem({ ...editingItem, techCount: parseInt(e.target.value) || 1 })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Price (лв.)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="bg-secondary"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={saveEdit} className="bg-amber-500 text-amber-950 hover:bg-amber-600">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

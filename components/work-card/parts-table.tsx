"use client";

import { useState, useEffect, useRef } from "react";
import type { PartItem } from "@/app/page";
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
import { Plus, Trash2, Package, Search, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { searchParts, type PartSearchResult } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface PartsTableProps {
  parts: PartItem[];
  onPartsChange: (parts: PartItem[]) => void;
}

export function PartsTable({ parts, onPartsChange }: PartsTableProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchParts(searchQuery);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("Parts search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add part from search result
  const addPartFromSearch = (part: PartSearchResult) => {
    const newPart: PartItem = {
      id: crypto.randomUUID(),
      partId: part.id,
      partNo: part.partNumber,
      description: part.description,
      qty: 1,
      price: part.unitPrice,
      stockQuantity: part.stockQuantity,
    };
    onPartsChange([...parts, newPart]);
    setSearchQuery("");
    setShowResults(false);
  };

  // Manual add part (without database lookup)
  const addManualPart = () => {
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
      <CardHeader className="flex flex-col gap-4 pb-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Package className="h-4 w-4 text-primary" />
            Резервни части (Parts)
          </CardTitle>
          <Button
            onClick={addManualPart}
            size="sm"
            variant="outline"
            className="gap-1 bg-transparent"
          >
            <Plus className="h-4 w-4" />
            Manual
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative" ref={searchRef}>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            Търсене на части по номер или описание
          </Label>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              placeholder="Въведете номер на част или описание..."
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
                {searchResults.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => addPartFromSearch(part)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-medium text-primary">
                          {part.partNumber}
                        </span>
                        <p className="text-sm text-foreground truncate">{part.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-medium text-foreground">
                          {part.unitPrice.toFixed(2)} лв.
                        </p>
                        <p className={cn(
                          "text-[10px]",
                          part.stockQuantity > 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          Наличност: {part.stockQuantity}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-3 shadow-lg">
              <p className="text-sm text-muted-foreground text-center">Няма намерени части</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Part No</TableHead>
                <TableHead className="text-muted-foreground">Описание</TableHead>
                <TableHead className="text-right text-muted-foreground">Кол.</TableHead>
                <TableHead className="text-right text-muted-foreground">Цена (лв.)</TableHead>
                <TableHead className="text-right text-muted-foreground">Сума</TableHead>
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
                    Няма добавени части. Търсете по-горе или добавете ръчно.
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => {
                  const exceedsStock = part.stockQuantity !== undefined && part.qty > part.stockQuantity;
                  const isFromDatabase = !!part.partId;
                  
                  return (
                    <TableRow key={part.id} className={cn(
                      "border-border",
                      exceedsStock && "bg-amber-500/5"
                    )}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isFromDatabase ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : null}
                          <Input
                            value={part.partNo}
                            onChange={(e) => updatePart(part.id, "partNo", e.target.value)}
                            placeholder="Part #"
                            readOnly={isFromDatabase}
                            className={cn(
                              "h-9 text-foreground",
                              isFromDatabase ? "bg-secondary font-mono" : "bg-card"
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={part.description}
                          onChange={(e) => updatePart(part.id, "description", e.target.value)}
                          placeholder="Description"
                          readOnly={isFromDatabase}
                          className={cn(
                            "h-9 text-foreground",
                            isFromDatabase ? "bg-secondary" : "bg-card"
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min="1"
                            value={part.qty}
                            onChange={(e) => updatePart(part.id, "qty", parseInt(e.target.value) || 1)}
                            className={cn(
                              "h-9 w-20 text-right text-foreground",
                              exceedsStock ? "border-amber-500 bg-amber-500/10" : "bg-card"
                            )}
                          />
                          {exceedsStock && (
                            <p className="text-[9px] text-amber-500 flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Над наличност ({part.stockQuantity})
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={part.price}
                          onChange={(e) => updatePart(part.id, "price", parseFloat(e.target.value) || 0)}
                          readOnly={isFromDatabase}
                          className={cn(
                            "h-9 w-24 text-right text-foreground",
                            isFromDatabase ? "bg-secondary" : "bg-card"
                          )}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Subtotal */}
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Обща сума на частите:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {subtotal.toFixed(2)} лв.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  RotateCw,
  Calendar,
  Wrench,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  DollarSign,
} from "lucide-react";

// Types
interface HistoricalRecord {
  id: string;
  created_at: string;
  navision_order_no: string | null;
  machine_model: string | null;
  serial_number: string | null;
  technician_name: string | null;
  technician_id?: string | null;
  total_invoice_amount: number | null;
  status: string | null;
}

interface Technician {
  id: string;
  name: string;
}

interface HistoricalPart {
  id: string;
  part_number: string;
  description: string;
  quantity: number;
  price: number;
}

interface HistoricalLabor {
  id: string;
  operation_code: string;
  description: string;
  hours: number;
  rate: number;
}

interface ReopenJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: HistoricalRecord | null;
  onSuccess?: (newJobCardId: string) => void;
}

export function ReopenJobModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: ReopenJobModalProps) {
  // Form state
  const [newNavisionNumber, setNewNavisionNumber] = useState("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Data state
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [historicalParts, setHistoricalParts] = useState<HistoricalPart[]>([]);
  const [historicalLabor, setHistoricalLabor] = useState<HistoricalLabor[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch technicians on mount
  useEffect(() => {
    const fetchTechnicians = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("technicians")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (data) {
        setTechnicians(data);
      }
    };

    fetchTechnicians();
  }, []);

  // Fetch historical parts and labor when record changes
  useEffect(() => {
    if (!record?.id || !isOpen) return;

    const fetchHistoricalDetails = async () => {
      setIsLoadingDetails(true);
      const supabase = createClient();

      try {
        // Fetch parts for this job card
        const { data: partsData } = await supabase
          .from("job_card_parts")
          .select(`
            id,
            quantity,
            price_at_submission,
            parts (
              part_number,
              description
            )
          `)
          .eq("job_card_id", record.id);

        if (partsData) {
          const parts: HistoricalPart[] = partsData.map((p: {
            id: string;
            quantity: number;
            price_at_submission: number;
            parts: { part_number: string; description: string } | null;
          }) => ({
            id: p.id,
            part_number: p.parts?.part_number || "N/A",
            description: p.parts?.description || "Unknown Part",
            quantity: p.quantity || 1,
            price: p.price_at_submission || 0,
          }));
          setHistoricalParts(parts);
        }

        // Fetch labor for this job card
        const { data: laborData } = await supabase
          .from("job_card_labor")
          .select(`
            id,
            actual_hours,
            labor_catalog (
              operation_code,
              description,
              standard_hours
            )
          `)
          .eq("job_card_id", record.id);

        if (laborData) {
          const labor: HistoricalLabor[] = laborData.map((l: {
            id: string;
            actual_hours: number;
            labor_catalog: { operation_code: string; description: string; standard_hours: number } | null;
          }) => ({
            id: l.id,
            operation_code: l.labor_catalog?.operation_code || "N/A",
            description: l.labor_catalog?.description || "Labor Operation",
            hours: l.actual_hours || l.labor_catalog?.standard_hours || 0,
            rate: 50, // Default rate 50 BGN/hour
          }));
          setHistoricalLabor(labor);
        }
      } catch (error) {
        console.error("Error fetching historical details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchHistoricalDetails();
  }, [record?.id, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNewNavisionNumber("");
      setSelectedTechnicianId("");
      setHistoricalParts([]);
      setHistoricalLabor([]);
    }
  }, [isOpen]);

  // Calculate totals
  const totalPartsValue = historicalParts.reduce(
    (sum, p) => sum + p.quantity * p.price,
    0
  );
  const totalLaborValue = historicalLabor.reduce(
    (sum, l) => sum + l.hours * l.rate,
    0
  );
  const totalEstimate = totalPartsValue + totalLaborValue;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bg-BG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!record || !newNavisionNumber.trim()) {
      toast.error("Please enter a Navision Service Order #");
      return;
    }

    setIsCreating(true);
    const supabase = createClient();

    try {
      // Fetch the original job card data
      const { data: originalCard, error: fetchError } = await supabase
        .from("job_cards")
        .select("*")
        .eq("id", record.id)
        .single();

      if (fetchError || !originalCard) {
        throw new Error("Failed to fetch original job card data");
      }

      // Get selected technician info
      const selectedTech = technicians.find((t) => t.id === selectedTechnicianId);

      // Create a new job card based on the archived one
      const { data: newCard, error: createError } = await supabase
        .from("job_cards")
        .insert({
          // Copy relevant fields from original
          machine_id: originalCard.machine_id,
          machine_model: originalCard.machine_model || record.machine_model,
          serial_number: originalCard.serial_number || record.serial_number,
          reason_code: originalCard.reason_code,
          defect_type_code: originalCard.defect_type_code,
          complaint_description: originalCard.complaint_description,
          previous_machine_hours: originalCard.current_machine_hours,
          // Technician - use new if selected, otherwise original
          technician_id: selectedTechnicianId || originalCard.technician_id,
          technician_name: selectedTech?.name || originalCard.technician_name || record.technician_name,
          // New fields
          order_no: newNavisionNumber.trim(),
          navision_order_no: newNavisionNumber.trim(),
          status: "draft",
          notes: `Re-opened from archived job card. Original: ${record.navision_order_no || record.id.slice(0, 8)} (${formatDate(record.created_at)})`,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Copy parts to new job card
      if (historicalParts.length > 0 && newCard) {
        const { data: originalParts } = await supabase
          .from("job_card_parts")
          .select("*")
          .eq("job_card_id", record.id);

        if (originalParts && originalParts.length > 0) {
          const newParts = originalParts.map((part) => ({
            job_card_id: newCard.id,
            part_id: part.part_id,
            quantity: part.quantity,
            price_at_submission: part.price_at_submission,
          }));

          await supabase.from("job_card_parts").insert(newParts);
        }
      }

      // Copy labor to new job card
      if (historicalLabor.length > 0 && newCard) {
        const { data: originalLabor } = await supabase
          .from("job_card_labor")
          .select("*")
          .eq("job_card_id", record.id);

        if (originalLabor && originalLabor.length > 0) {
          const newLabor = originalLabor.map((labor) => ({
            job_card_id: newCard.id,
            operation_id: labor.operation_id,
            actual_hours: labor.actual_hours,
            technician_name: selectedTech?.name || labor.technician_name,
          }));

          await supabase.from("job_card_labor").insert(newLabor);
        }
      }

      // Copy free check results
      const { data: freeCheckResults } = await supabase
        .from("free_check_results")
        .select("*")
        .eq("job_card_id", record.id);

      if (freeCheckResults && freeCheckResults.length > 0 && newCard) {
        const newFreeCheckResults = freeCheckResults.map((result) => ({
          job_card_id: newCard.id,
          control_point_no: result.control_point_no,
          control_point_name: result.control_point_name,
          status: result.status,
          comments: result.comments,
          photo_url: result.photo_url,
        }));

        await supabase.from("free_check_results").insert(newFreeCheckResults);
      }

      // Success!
      const newJobId = newCard?.id?.slice(0, 8).toUpperCase() || "NEW";
      
      toast.success(`New Job Card #${newJobId} has been initialized successfully.`, {
        description: "All historical data has been copied to the new job card.",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        duration: 5000,
      });

      onClose();
      onSuccess?.(newCard?.id || "");
    } catch (error) {
      console.error("Error creating new order:", error);
      toast.error("Failed to create new order", {
        description: "Please try again or contact support.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <RotateCw className="h-5 w-5 text-amber-500" />
            </div>
            Create New Order from Archive
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            This will copy all machine data, technician notes, and proposed parts
            from the original inspection to a new active job card.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Original Service Info Card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Original Service Record</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Machine:</span>
                <p className="font-medium text-foreground">{record.machine_model || "Unknown"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Serial Number:</span>
                <p className="font-medium text-foreground">{record.serial_number || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Original Navision #:</span>
                <p className="font-medium text-foreground">{record.navision_order_no || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Technician:</span>
                <p className="font-medium text-foreground">{record.technician_name || "Unknown"}</p>
              </div>
            </div>
          </div>

          {/* Original Service Date - Read Only */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Original Service Date
            </Label>
            <Input
              value={formatDate(record.created_at)}
              readOnly
              className="bg-muted/50 border-border/50 text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* New Navision Number - Required */}
          <div className="space-y-2">
            <Label htmlFor="navision" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-amber-500" />
              New Navision Service Order #
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                Required
              </Badge>
            </Label>
            <Input
              id="navision"
              type="text"
              placeholder="Enter new Navision number..."
              value={newNavisionNumber}
              onChange={(e) => setNewNavisionNumber(e.target.value)}
              className="h-11 bg-background border-border/50 focus:border-amber-500/50 focus:ring-amber-500/20"
              autoFocus
            />
          </div>

          {/* Assign New Technician - Optional */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Assign New Technician
              <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                Optional
              </Badge>
            </Label>
            <Select
              value={selectedTechnicianId}
              onValueChange={setSelectedTechnicianId}
            >
              <SelectTrigger className="h-11 bg-background border-border/50">
                <SelectValue placeholder="Keep original technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">
                  <span className="text-muted-foreground">Keep original: </span>
                  {record.technician_name || "Unknown"}
                </SelectItem>
                <Separator className="my-1" />
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          {/* Historical Parts & Labor Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="h-4 w-4 text-primary" />
                Historical Parts & Labor
              </h4>
              <Badge 
                variant="outline" 
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              >
                Will be carried over
              </Badge>
            </div>

            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Parts Section */}
                {historicalParts.length > 0 ? (
                  <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/50">
                      <Wrench className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-foreground">
                        Parts ({historicalParts.length})
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {historicalParts.slice(0, 4).map((part) => (
                        <div
                          key={part.id}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {part.part_number}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {part.description}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium text-foreground">
                              {part.quantity} x {part.price.toFixed(2)} BGN
                            </p>
                            <p className="text-xs text-emerald-500">
                              {(part.quantity * part.price).toFixed(2)} BGN
                            </p>
                          </div>
                        </div>
                      ))}
                      {historicalParts.length > 4 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                          +{historicalParts.length - 4} more parts
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center text-sm text-muted-foreground">
                    No parts recorded in original job
                  </div>
                )}

                {/* Labor Section */}
                {historicalLabor.length > 0 ? (
                  <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/50">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-foreground">
                        Labor ({historicalLabor.length})
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {historicalLabor.slice(0, 3).map((labor) => (
                        <div
                          key={labor.id}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {labor.operation_code}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {labor.description}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium text-foreground">
                              {labor.hours}h @ {labor.rate} BGN
                            </p>
                            <p className="text-xs text-emerald-500">
                              {(labor.hours * labor.rate).toFixed(2)} BGN
                            </p>
                          </div>
                        </div>
                      ))}
                      {historicalLabor.length > 3 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                          +{historicalLabor.length - 3} more operations
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center text-sm text-muted-foreground">
                    No labor recorded in original job
                  </div>
                )}

                {/* Total Estimate */}
                {(historicalParts.length > 0 || historicalLabor.length > 0) && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        <span className="font-medium text-foreground">
                          Total Estimated Value
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-500">
                          {totalEstimate.toLocaleString()} BGN
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Parts: {totalPartsValue.toLocaleString()} + Labor: {totalLaborValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/30">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="border-border/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !newNavisionNumber.trim()}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export button component for easy use in tables
export function RestartJobButton({
  record,
  onSuccess,
}: {
  record: HistoricalRecord;
  onSuccess?: (newJobCardId: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500"
        title="Re-open as New Order"
      >
        <RotateCw className="h-4 w-4" />
        <span className="hidden lg:inline">Restart Job</span>
      </Button>

      <ReopenJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={record}
        onSuccess={onSuccess}
      />
    </>
  );
}

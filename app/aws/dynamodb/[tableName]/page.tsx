"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Plus, Search, Database, ArrowLeft, Loader2, Copy, Download, ChevronDown, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TableItem {
  [key: string]: any;
}

interface ExpandedState {
  [key: string]: boolean;
}

interface NewField {
  key: string;
  value: string;
}

interface AttributeField {
  key: string;
  value: string;
  type: 'String' | 'Number' | 'Boolean' | 'Binary' | 'Null' | 'String Set' | 'Number Set' | 'Binary Set' | 'List' | 'Map';
}

interface PaginationState {
  lastEvaluatedKey?: { [key: string]: any };
  hasMore: boolean;
}

export default function TableItemsPage({ params }: { params: Promise<{ tableName: string }> }) {
  const { tableName } = use(params);
  const router = useRouter();
  const [items, setItems] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ hasMore: true });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TableItem | null>(null);
  const [newItem, setNewItem] = useState<TableItem>({ id: "" });
  const [creatingItem, setCreatingItem] = useState(false);
  const [expandedFields, setExpandedFields] = useState<ExpandedState>({});
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TableItem | null>(null);
  const [updatingItem, setUpdatingItem] = useState(false);
  const [newFields, setNewFields] = useState<AttributeField[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const fetchItems = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const queryParams = new URLSearchParams();
      if (isLoadMore && pagination.lastEvaluatedKey) {
        queryParams.set('exclusiveStartKey', JSON.stringify(pagination.lastEvaluatedKey));
      }

      const response = await fetch(`/api/dynamodb/tables/${tableName}/items?${queryParams}`);
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to fetch items");
      }

      console.log('API Response:', responseData);

      // Update pagination state
      setPagination({
        lastEvaluatedKey: responseData.data?.lastEvaluatedKey,
        hasMore: !!responseData.data?.lastEvaluatedKey
      });

      // Append or replace items based on load more
      const items = responseData.data?.items || [];
      console.log('Parsed Items:', items);
      
      setItems(prev => isLoadMore ? [...prev, ...items] : items);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to fetch table items. Check console for details.");
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleAddField = () => {
    setNewFields([...newFields, { key: '', value: '', type: 'String' }]);
  };

  const handleFieldChange = (index: number, field: Partial<AttributeField>) => {
    const updatedFields = [...newFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setNewFields(updatedFields);
  };

  const handleRemoveField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index));
  };

  const handleAddItem = async () => {
    // Convert fields to DynamoDB format
    const item: Record<string, any> = { id: newItem.id };
    
    newFields.forEach(field => {
      if (!field.key) return;

      switch (field.type) {
        case 'Number':
          item[field.key] = Number(field.value);
          break;
        case 'Boolean':
          item[field.key] = field.value.toLowerCase() === 'true';
          break;
        case 'Null':
          item[field.key] = null;
          break;
        case 'String':
        default:
          item[field.key] = field.value;
          break;
      }
    });

    try {
      setCreatingItem(true);
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Item: item }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create item");
      }

      toast.success("Item created successfully");
      setShowAddDialog(false);
      setNewItem({ id: "" });
      setNewFields([]);
      fetchItems();
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item. Check console for details.");
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Key: { id: itemId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast.success('Item deleted successfully');
      setShowDetailsDialog(false);
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleItemClick = (item: TableItem) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  const handleEditClick = (e: React.MouseEvent, item: TableItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem?.id) {
      toast.error("Item ID is required");
      return;
    }

    try {
      setUpdatingItem(true);
      
      // Create a copy of the editing item without the id field
      const { id, ...updateData } = editingItem;
      
      // Build update expression and attribute values
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updateData).forEach(([key, value]) => {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      });
      
      // Format the request body according to the API expectations
      const requestBody = {
        Key: { id: id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };
      
      const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update item");
      }

      toast.success("Item updated successfully");
      setShowEditDialog(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item. Check console for details.");
    } finally {
      setUpdatingItem(false);
    }
  };

  const filteredItems = items.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCopyJson = () => {
    if (selectedItem) {
      navigator.clipboard.writeText(JSON.stringify(selectedItem, null, 2));
      toast.success("JSON copied to clipboard");
    }
  };

  const handleDownloadJson = () => {
    if (selectedItem) {
      const dataStr = JSON.stringify(selectedItem, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `item-${selectedItem.id || "data"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const toggleField = (key: string) => {
    setExpandedFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFieldFilterToggle = (field: string) => {
    setFieldFilter(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const renderValue = (value: any): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    e.stopPropagation();
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleCopySelected = () => {
    const selectedData = filteredItems
      .filter(item => selectedItems.has(item.id));
    navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2));
    toast.success(`Copied ${selectedItems.size} items to clipboard`);
  };

  const handleDownloadSelected = () => {
    const selectedData = filteredItems
      .filter(item => selectedItems.has(item.id));
    const dataStr = JSON.stringify(selectedData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}-items.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${selectedItems.size} items`);
  };

  const handleDeleteSelected = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.size} selected items?`);
    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;

    for (const itemId of selectedItems) {
      try {
        const response = await fetch(`/api/dynamodb/tables/${tableName}/items`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Key: { id: itemId }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to delete item');
        }
        successCount++;
      } catch (error) {
        console.error('Error deleting item:', error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} items`);
      setSelectedItems(new Set());
      fetchItems();
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} items`);
    }
  };

  // Add scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

    if (bottom && !loadingMore && pagination.hasMore) {
      fetchItems(true);
    }
  };

  return (
    <div className="flex-1 h-[89vh] overflow-hidden">
      <div className="h-full flex flex-col md:p-0 sm:p-0">
        {/* Header Section */}
        <div className="flex flex-col gap-2 bg-gradient-to-r from-blue-500 to-blue-600 p-3 md:p-4 rounded-lg md:rounded-xl shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.back()}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </Button>
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-white/10 backdrop-blur-sm">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white truncate">{tableName}</h2>
              <div className="flex items-center gap-1.5">
                <p className="text-xs md:text-sm text-blue-100">Items</p>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs">
                  {items.length}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs md:text-sm text-white">{selectedItems.size} selected</span>
                <div className="flex gap-1">
                  <Button
                    onClick={handleCopySelected}
                    className="bg-white/10 text-white hover:bg-white/20 transition-all duration-300 h-7 w-7 p-0 md:h-9 md:w-auto md:px-3"
                  >
                    <Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden md:inline ml-1.5 text-sm">Copy</span>
                  </Button>
                  <Button
                    onClick={handleDownloadSelected}
                    className="bg-white/10 text-white hover:bg-white/20 transition-all duration-300 h-7 w-7 p-0 md:h-9 md:w-auto md:px-3"
                  >
                    <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden md:inline ml-1.5 text-sm">Download</span>
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    className="bg-red-500/80 text-white hover:bg-red-500 transition-all duration-300 h-7 w-7 p-0 md:h-9 md:w-auto md:px-3"
                  >
                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden md:inline ml-1.5 text-sm">Delete</span>
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 md:pl-9 h-7 md:h-9 text-xs md:text-sm border-transparent bg-white/10 text-white placeholder:text-white/60 rounded-md md:rounded-lg focus:border-white/30 focus:ring-0 transition-all duration-300 w-full min-w-0"
                />
              </div>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 h-7 w-7 p-0 md:h-9 md:w-auto md:px-3"
              >
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline ml-1.5 text-sm">Create Item</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg border border-gray-200 mt-2 md:mt-4">
          {/* Items Header */}
          <div className="flex items-center px-3 py-2 md:px-4 md:py-3 bg-gray-50 border-b border-gray-200 text-xs md:text-sm">
            <div className="w-4 md:w-6 flex items-center justify-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 md:h-4 md:w-4"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </div>
            <div className="flex-1 min-w-0 pl-4 grid grid-cols-3 gap-4">
              <div className="text-xs md:text-sm font-medium text-gray-500">ID (String)</div>
              <div className="text-xs md:text-sm font-medium text-gray-500">data</div>
              <div className="text-xs md:text-sm font-medium text-gray-500">type</div>
            </div>
            <div className="w-24 md:w-32 flex justify-center">
              <div className="text-xs md:text-sm font-medium text-gray-500">Actions</div>
            </div>
          </div>

          {/* Scrollable Items Content */}
          <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredItems.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center px-3 py-2 md:px-4 md:py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="w-4 md:w-6 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 md:h-4 md:w-4"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleSelectItem(e, item.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pl-4 grid grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <span className="text-xs md:text-sm font-medium text-blue-600 truncate">
                          {item.id}
                        </span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-600 font-mono whitespace-nowrap overflow-hidden">
                        {JSON.stringify(item, null, 2)}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        {item.type || '-'}
                      </div>
                    </div>
                    <div className="w-24 md:w-32 flex items-center justify-end gap-1">
                      <Button
                        onClick={(e) => handleEditClick(e, item)}
                        className="h-6 w-6 p-0 rounded-md bg-gray-100 hover:bg-gray-200"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32">
                <div className="p-2 md:p-3 rounded-full bg-gray-100 mb-2">
                  <Database className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                </div>
                <p className="text-xs md:text-sm text-gray-500">
                  {searchTerm ? 'No items match your search' : 'No items found'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-lg">
          <DialogHeader className="p-3 md:p-4 border-b border-gray-100">
            <DialogTitle className="text-base md:text-xl font-semibold text-gray-900">
              Add New Item
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-gray-500">
              Create a new item in the {tableName} table. Fill in the required fields below.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-3 md:space-y-4">
              <div className="grid gap-1.5 md:gap-2">
                <label className="text-xs md:text-sm font-medium text-gray-700">
                  ID (required)
                </label>
                <Input
                  value={newItem.id}
                  onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                  className="h-8 md:h-9 text-xs md:text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter item ID"
                />
              </div>

              <div className="space-y-3 md:space-y-4">
                {newFields.map((field, index) => (
                  <div key={index} className="grid grid-cols-12 gap-1.5 md:gap-2 items-start">
                    <div className="col-span-12 md:col-span-4">
                      <Input
                        placeholder="Attribute name"
                        value={field.key}
                        onChange={(e) => handleFieldChange(index, { key: e.target.value })}
                        className="h-8 md:h-9 text-xs md:text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-9 md:col-span-5">
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, { value: e.target.value })}
                        className="h-8 md:h-9 text-xs md:text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, { type: e.target.value as AttributeField['type'] })}
                        className="w-full h-8 md:h-9 rounded-md border border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-xs md:text-sm"
                      >
                        <option value="String">String</option>
                        <option value="Number">Number</option>
                        <option value="Boolean">Boolean</option>
                        <option value="Binary">Binary</option>
                        <option value="Null">Null</option>
                        <option value="String Set">String Set</option>
                        <option value="Number Set">Number Set</option>
                        <option value="Binary Set">Binary Set</option>
                        <option value="List">List</option>
                        <option value="Map">Map</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveField(index)}
                        className="h-8 md:h-9 w-8 md:w-9 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddField}
                className="w-full h-8 md:h-9 text-xs md:text-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                Add Field
              </Button>
            </div>
          </div>
          <DialogFooter className="p-3 md:p-4 border-t border-gray-100 flex-row space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewFields([]);
                setNewItem({ id: "" });
              }}
              className="flex-1 h-8 md:h-9 text-xs md:text-sm border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={creatingItem || !newItem.id.trim()}
              className="flex-1 h-8 md:h-9 text-xs md:text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              {creatingItem ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-lg">
          <DialogHeader className="p-3 md:p-4 border-b border-gray-100">
            <DialogTitle className="text-base md:text-xl font-semibold text-gray-900">
              Edit Item
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-gray-500">
              Update the item fields below. ID cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-3 md:space-y-4">
              {editingItem && Object.entries(editingItem).map(([key, value], index) => (
                <div key={index} className="grid gap-1.5 md:gap-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700">
                    {key}
                  </label>
                  {key === 'id' ? (
                    <Input
                      value={value}
                      disabled
                      className="h-8 md:h-9 text-xs md:text-sm bg-gray-50 text-gray-500 border-gray-200"
                    />
                  ) : typeof value === 'object' ? (
                    <div className="relative">
                      <textarea
                        value={JSON.stringify(value, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditingItem({
                              ...editingItem,
                              [key]: parsed
                            });
                          } catch (err) {
                            setEditingItem({
                              ...editingItem,
                              [key]: e.target.value
                            });
                          }
                        }}
                        className="w-full h-32 md:h-48 font-mono text-xs md:text-sm p-2 md:p-3 rounded-md border border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter valid JSON"
                      />
                    </div>
                  ) : (
                    <Input
                      value={value}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        [key]: e.target.value
                      })}
                      className="h-8 md:h-9 text-xs md:text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="p-3 md:p-4 border-t border-gray-100 flex-row space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingItem(null);
              }}
              className="flex-1 h-8 md:h-9 text-xs md:text-sm border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateItem}
              disabled={updatingItem}
              className="flex-1 h-8 md:h-9 text-xs md:text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              {updatingItem ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] sm:w-[500px] h-[400px] sm:h-auto bg-white p-0 border-0 rounded-lg overflow-hidden">
          <DialogTitle className="sr-only">
            Item Details - {selectedItem?.id}
          </DialogTitle>
          
          {/* Header */}
          <div className="sticky top-0 z-10 bg-blue-600">
            {/* Title Section */}
            <div className="flex items-start gap-3 p-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Database className="h-4 w-4 text-white shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm text-white font-medium truncate">
                    {selectedItem?.id}
                  </h3>
                  <p className="text-xs text-blue-100">View and explore item properties</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsDialog(false)}
                className="h-6 w-6 p-0 hover:bg-blue-500/50"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDetailsDialog(false);
                  setEditingItem(selectedItem);
                  setShowEditDialog(true);
                }}
                className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-400 text-white shrink-0"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedItem?.id && handleDeleteItem(selectedItem.id)}
                className="h-7 px-3 text-xs bg-red-500 hover:bg-red-400 text-white shrink-0"
              >
                Delete
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
                <Input
                  placeholder="Search fields..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="h-7 w-full pl-8 text-xs bg-white/10 border-transparent placeholder:text-white/60 text-white focus:border-white/30 focus:ring-0"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyJson}
                className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-400 text-white shrink-0"
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadJson}
                className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-400 text-white shrink-0"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(400px-100px)] sm:h-[400px]">
            <div className="p-3 space-y-1">
              {selectedItem && (
                <div className="space-y-1">
                  {Object.entries(selectedItem)
                    .filter(([key]) => 
                      key !== 'id' && key.toLowerCase().includes(fieldSearch.toLowerCase())
                    )
                    .map(([key, value], index) => (
                      <div key={index} className="rounded-lg border border-gray-200 overflow-hidden">
                        <div
                          className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleField(key)}
                        >
                          {typeof value === "object" && (
                            <div className="text-blue-600">
                              {expandedFields[key] ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-900 min-w-[60px]">{key}</span>
                          {typeof value !== "object" && (
                            <span className="text-xs text-gray-500 truncate flex-1">
                              {renderValue(value)}
                            </span>
                          )}
                        </div>
                        {(typeof value === "object" && expandedFields[key]) && (
                          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                            <pre className="text-[10px] font-mono text-gray-600 whitespace-pre-wrap break-all">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
"use client";
import React, { useState, useEffect } from "react";
import TopNavigation from "@/app/components/TopNavigation";
import { 
  getAllRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord,
  getTableSchema
} from "@/utils/supabaseClient";
import { Database, Table, Plus, Edit, Trash2, RefreshCw, Search, AlertTriangle } from "lucide-react";

type TableName = 'journals' | 'folders' | 'tags' | 'journal_tags';

interface TableInfo {
  name: TableName;
  displayName: string;
  icon: React.ReactNode;
  description: string;
}

const TABLES: TableInfo[] = [
  {
    name: 'journals',
    displayName: 'Journal Entries',
    icon: <Database className="w-5 h-5" />,
    description: 'Manage your journal entries'
  },
  {
    name: 'folders',
    displayName: 'Folders',
    icon: <Table className="w-5 h-5" />,
    description: 'Organize your journals into folders'
  },
  {
    name: 'tags',
    displayName: 'Tags',
    icon: <Table className="w-5 h-5" />,
    description: 'Manage tags for categorizing entries'
  },
  {
    name: 'journal_tags',
    displayName: 'Journal-Tag Relations',
    icon: <Table className="w-5 h-5" />,
    description: 'Junction table (Read-only: Use Tags feature in journal entries)'
  }
];

const DatabaseAdminPage: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<TableName>('journals');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [wipeEncryptionKey, setWipeEncryptionKey] = useState("");
  const [wipeLoading, setWipeLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [selectedTable]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRecords(selectedTable);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createRecord(selectedTable, formData);
      setSuccessMessage('Record created successfully');
      setShowCreateModal(false);
      setFormData({});
      fetchRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    }
  };

  const handleUpdate = async () => {
    if (!selectedRecord?.id) return;
    try {
      await updateRecord(selectedTable, selectedRecord.id, formData);
      setSuccessMessage('Record updated successfully');
      setShowEditModal(false);
      setSelectedRecord(null);
      setFormData({});
      fetchRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id) return;
    try {
      await deleteRecord(selectedTable, selectedRecord.id);
      setSuccessMessage('Record deleted successfully');
      setShowDeleteModal(false);
      setSelectedRecord(null);
      fetchRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const openCreateModal = () => {
    setFormData({});
    setShowCreateModal(true);
  };

  const openEditModal = (record: any) => {
    setSelectedRecord(record);
    setFormData({ ...record });
    setShowEditModal(true);
  };

  const openDeleteModal = (record: any) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  const handleDatabaseWipe = async () => {
    if (!wipeEncryptionKey) {
      setError("Please enter the encryption key");
      return;
    }

    setWipeLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wipe-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encryptionKey: wipeEncryptionKey }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          `Database wiped successfully! Deleted: ${Object.entries(data.deletedCounts || {})
            .map(([table, count]) => `${table}: ${count}`)
            .join(', ')}`
        );
        setShowWipeModal(false);
        setWipeEncryptionKey("");
        fetchRecords();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error || 'Failed to wipe database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to wipe database');
    } finally {
      setWipeLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    return Object.values(record).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getColumnNames = (tableName: TableName): string[] => {
    switch (tableName) {
      case 'journals':
        return ['id', 'date', 'title', 'content', 'folder', 'mood', 'created_at', 'updated_at'];
      case 'folders':
        return ['id', 'name', 'color', 'created_at', 'updated_at'];
      case 'tags':
        return ['id', 'name', 'created_at'];
      case 'journal_tags':
        return ['journal_id', 'tag_id', 'created_at'];
      default:
        return [];
    }
  };

  const renderFormFields = (tableName: TableName) => {
    const isEdit = showEditModal;
    
    switch (tableName) {
      case 'folders':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={formData.color || '#6B7280'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
              />
            </div>
          </>
        );
      case 'tags':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
              required
            />
          </div>
        );
      case 'journal_tags':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Journal ID</label>
              <input
                type="number"
                value={formData.journal_id || ''}
                onChange={(e) => setFormData({ ...formData, journal_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tag ID</label>
              <input
                type="number"
                value={formData.tag_id || ''}
                onChange={(e) => setFormData({ ...formData, tag_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
          </>
        );
      case 'journals':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Folder</label>
              <input
                type="text"
                value={formData.folder || ''}
                onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mood</label>
              <input
                type="text"
                value={formData.mood || ''}
                onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-card-background"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Admin</h1>
          <p className="text-muted-color">Manage your Supabase database tables</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded-md">
            {successMessage}
          </div>
        )}

        {/* Table Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TABLES.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTable === table.name
                  ? 'border-accent-color bg-accent-color/10'
                  : 'border-border-color hover:border-accent-color/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {table.icon}
                <h3 className="font-semibold">{table.displayName}</h3>
              </div>
              <p className="text-sm text-muted-color">{table.description}</p>
            </button>
          ))}
        </div>

        {/* Danger Zone - Database Wipe */}
        <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-300 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">Danger Zone</h2>
              <p className="text-sm text-red-800 dark:text-red-400 mb-4">
                Permanently delete all data from the database. This action cannot be undone and requires your encryption key for authentication.
              </p>
              <button
                onClick={() => setShowWipeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Wipe Entire Database
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-card-background border border-border-color rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              {selectedTable !== 'journal_tags' && (
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
              )}
              <button
                onClick={fetchRecords}
                className="flex items-center gap-2 px-4 py-2 border border-border-color rounded-md hover:bg-hover-background transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-color" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-border-color rounded-md bg-background"
              />
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-card-background border border-border-color rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-color">Loading...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-muted-color">No records found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-hover-background">
                  <tr>
                    {getColumnNames(selectedTable).map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-sm font-semibold">
                        {col}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr key={record.id || index} className="border-t border-border-color hover:bg-hover-background">
                      {getColumnNames(selectedTable).map((col) => (
                        <td key={col} className="px-4 py-3 text-sm">
                          {col === 'content' && record[col]?.length > 100
                            ? record[col].substring(0, 100) + '...'
                            : col === 'color'
                            ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-6 h-6 rounded border border-border-color" 
                                  style={{ backgroundColor: record[col] }}
                                />
                                {record[col]}
                              </div>
                            )
                            : String(record[col] ?? '')}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex gap-2 justify-end">
                          {selectedTable !== 'journal_tags' ? (
                            <>
                              <button
                                onClick={() => openEditModal(record)}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(record)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-color italic">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-background border border-border-color rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create New {selectedTable}</h2>
                <div className="space-y-4 mb-6">
                  {renderFormFields(selectedTable)}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-border-color rounded-md hover:bg-hover-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-hover"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-background border border-border-color rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Edit {selectedTable}</h2>
                <div className="space-y-4 mb-6">
                  {renderFormFields(selectedTable)}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-border-color rounded-md hover:bg-hover-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-hover"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-background border border-border-color rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Confirm Delete</h2>
                <p className="mb-6 text-muted-color">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border border-border-color rounded-md hover:bg-hover-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Wipe Modal */}
        {showWipeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border-2 border-red-500 rounded-lg max-w-lg w-full shadow-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ⚠️ CRITICAL WARNING
                  </h2>
                </div>
                
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-md p-4 mb-6">
                  <p className="text-red-900 dark:text-red-300 font-semibold mb-2">
                    You are about to permanently delete ALL data from your database:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-400 space-y-1">
                    <li>All journal entries</li>
                    <li>All folders</li>
                    <li>All tags</li>
                    <li>All journal-tag relationships</li>
                  </ul>
                  <p className="text-red-900 dark:text-red-300 font-bold mt-3">
                    THIS ACTION CANNOT BE UNDONE!
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Enter your encryption key to confirm:
                  </label>
                  <input
                    type="password"
                    value={wipeEncryptionKey}
                    onChange={(e) => setWipeEncryptionKey(e.target.value)}
                    placeholder="Paste your NEXT_PUBLIC_ENCRYPTION_KEY"
                    className="w-full px-3 py-2 border-2 border-red-500 rounded-md bg-background font-mono text-sm"
                    disabled={wipeLoading}
                  />
                  <p className="text-xs text-muted-color mt-2">
                    Your encryption key can be found in your .env file
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowWipeModal(false);
                      setWipeEncryptionKey("");
                      setError(null);
                    }}
                    className="px-4 py-2 border border-border-color rounded-md hover:bg-hover-background"
                    disabled={wipeLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDatabaseWipe}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!wipeEncryptionKey || wipeLoading}
                  >
                    {wipeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                        Wiping Database...
                      </>
                    ) : (
                      'Yes, Wipe Everything'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseAdminPage;

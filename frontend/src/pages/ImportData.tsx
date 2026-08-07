import React, { useState } from 'react';
import { useGym, API_BASE } from '../context/GymContext';
import { 
  UploadCloud, CheckCircle, AlertTriangle, Play, FileSpreadsheet, 
  Trash2, FileText, ArrowRight, Sparkles 
} from 'lucide-react';
import * as XLSX from 'xlsx';

type ImportType = 'members' | 'attendance' | 'payments' | 'workouts' | 'diets';

export const ImportData: React.FC = () => {
  const { settings } = useGym();
  
  const [importType, setImportType] = useState<ImportType>('members');
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState('');
  
  // Validation and import states
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileData(null);
    setValidationErrors([]);
    setValidationPassed(false);
    setImportSuccessMessage('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        setFileData(data);
      } catch (err) {
        alert('Failed to parse spreadsheet file. Make sure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleRunValidation = async () => {
    if (!fileData || fileData.length === 0) return;
    
    setValidating(true);
    setValidationErrors([]);
    setValidationPassed(false);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        [importType]: fileData
      };

      const res = await fetch(`${API_BASE}/import/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setValidationPassed(true);
        } else {
          setValidationErrors(result.errors || ['Validation failed with unspecified errors.']);
        }
      } else {
        alert('Server validation endpoint returned an error.');
      }
    } catch (e) {
      alert('Network error running validation checks.');
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!fileData || fileData.length === 0 || !validationPassed) return;

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        [importType]: fileData
      };

      const res = await fetch(`${API_BASE}/import/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setImportSuccessMessage(result.message || 'Import completed successfully!');
        // Reset states
        setFileData(null);
        setFileName('');
        setValidationPassed(false);
      } else {
        alert('Import transactions failed on server.');
      }
    } catch (e) {
      alert('Network error committing imports.');
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFileData(null);
    setFileName('');
    setValidationErrors([]);
    setValidationPassed(false);
    setImportSuccessMessage('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs text-white">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Excel Data Import Engine</h2>
        <p className="text-slate-400 text-xs mt-1">
          Perform bulk spreadsheet onboarding for members, payments, routines, and check-ins.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: File Selector and Validation Controls */}
        <div className="lg:col-span-1 glass-card border rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <UploadCloud className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-sm">Onboarding Settings</h3>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Spreadsheet Data Type</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ImportType);
                clearFile();
              }}
              className="w-full h-11 px-3 rounded-xl glass-input text-white border-white/10 cursor-pointer"
            >
              <option value="members">Client Members List</option>
              <option value="attendance">Daily Attendance Logs</option>
              <option value="payments">Invoice Payments Ledger</option>
              <option value="workouts">Workout Routine splits</option>
              <option value="diets">Macro Diet Meals</option>
            </select>
          </div>

          {/* Drag & Drop File Container */}
          {!fileName ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/2 transition-colors relative">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <span className="font-bold text-slate-300 block mb-1">Pick spreadsheet file</span>
              <span className="text-[9px] text-slate-500 block">Supports .xlsx, .xls, .csv up to 2MB</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-white block truncate">{fileName}</span>
                  <span className="text-[9px] text-slate-400 block font-mono">{fileData?.length || 0} entries parsed</span>
                </div>
              </div>
              <button 
                onClick={clearFile}
                className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Validation Trigger Button */}
          {fileData && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleRunValidation}
                disabled={validating}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                {validating ? 'Running dry-run checks...' : 'Validate Spreadsheet Data'}
              </button>
            </div>
          )}

          {/* Success message or Commit buttons */}
          {validationPassed && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Validation Passed!
              </span>
              <p className="text-[10px] text-slate-300 leading-tight">
                Dry-run verify succeeded. Click below to write rows to active tables.
              </p>
              <button
                onClick={handleCommitImport}
                disabled={importing}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {importing ? 'Writing entries...' : 'Import to active database'}
              </button>
            </div>
          )}

          {importSuccessMessage && (
            <div className="p-4 rounded-2xl bg-primary/15 border border-primary/20 text-center space-y-1">
              <span className="font-bold text-primary block">Import Completed!</span>
              <p className="text-[10px] text-slate-300 leading-tight">{importSuccessMessage}</p>
            </div>
          )}
        </div>

        {/* Right Side: Tabular Previews or Validation logs */}
        <div className="lg:col-span-2 space-y-6">
          {validationErrors.length > 0 && (
            <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-3">
              <span className="font-bold text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                Spreadsheet Formatting Violations ({validationErrors.length})
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] text-red-400">
                {validationErrors.map((err, idx) => (
                  <div key={idx} className="p-2 rounded bg-red-500/10 border border-red-500/10">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="glass-card border rounded-3xl p-6 space-y-4">
            <span className="font-extrabold text-sm block border-b border-white/5 pb-3">Parsed Data Preview</span>
            
            {fileData && fileData.length > 0 ? (
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      {Object.keys(fileData[0]).map((key) => (
                        <th key={key} className="py-2.5 px-3 uppercase font-bold tracking-wide">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {fileData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/2 transition">
                        {Object.values(row).map((val: any, cellIdx) => (
                          <td key={cellIdx} className="py-2.5 px-3 truncate max-w-[120px]" title={String(val)}>
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fileData.length > 10 && (
                  <div className="text-center py-2 text-[9px] text-slate-500 italic">
                    Showing first 10 rows of {fileData.length} total rows.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 italic">
                Upload a spreadsheet to preview parses.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

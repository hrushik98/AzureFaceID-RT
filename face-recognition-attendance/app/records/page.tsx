'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

type AttendanceRecord = {
  id: string;
  timestamp: string;
  confidence: number;
  student_id: string;
  name: string;
  branch: string;
  year: number;
  roll_number: string;
  email: string;
};

export default function AttendanceRecords() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    date: '',
    branch: '',
    year: '',
    search: ''
  });

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('attendance_with_student')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      setRecords(data || []);
    } catch (err: any) {
      console.error("Error fetching attendance records:", err);
      setError("Failed to load attendance records. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilter({
      date: '',
      branch: '',
      year: '',
      search: ''
    });
  };

  const filteredRecords = records.filter(record => {
    // Date filter
    if (filter.date && !record.timestamp.includes(filter.date)) {
      return false;
    }
    
    // Branch filter
    if (filter.branch && record.branch !== filter.branch) {
      return false;
    }
    
    // Year filter
    if (filter.year && record.year.toString() !== filter.year) {
      return false;
    }
    
    // Search by name or roll number
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      const nameMatch = record.name.toLowerCase().includes(searchTerm);
      const rollMatch = record.roll_number.toLowerCase().includes(searchTerm);
      if (!nameMatch && !rollMatch) {
        return false;
      }
    }
    
    return true;
  });

  // Extract unique branches for filter dropdown
  const branches = [...new Set(records.map(r => r.branch))];
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Attendance Records</h1>
      
      {error && (
        <div className="p-4 mb-4 rounded bg-red-100 text-red-800">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* Filter controls */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 text-sm mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={filter.date}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm mb-1">Branch</label>
              <select
                name="branch"
                value={filter.branch}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm mb-1">Year</label>
              <select
                name="year"
                value={filter.year}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm mb-1">Search</label>
              <input
                type="text"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Name or Roll Number"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          
          <div className="mt-3 text-right">
            <button
              onClick={resetFilters}
              className="text-blue-600 text-sm hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        {/* Records table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {records.length === 0 ? 
                "No attendance records found." : 
                "No records match the selected filters."}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{record.name}</div>
                      <div className="text-sm text-gray-500">{record.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.roll_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.branch}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.confidence >= 90 ? 'bg-green-100 text-green-800' :
                          record.confidence >= 80 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.confidence?.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Export button */}
        {filteredRecords.length > 0 && (
          <div className="mt-6 text-right">
            <button
              onClick={() => {
                // Simple CSV export
                const headers = ['Name', 'Roll Number', 'Branch', 'Year', 'Email', 'Timestamp', 'Confidence'];
                const csvContent = [
                  headers.join(','),
                  ...filteredRecords.map(r => [
                    r.name,
                    r.roll_number,
                    r.branch,
                    r.year,
                    r.email,
                    new Date(r.timestamp).toLocaleString(),
                    r.confidence?.toFixed(2)
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `attendance_export_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Export to CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
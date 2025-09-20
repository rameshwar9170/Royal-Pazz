import React, { useState } from 'react';
import { CSVLink } from 'react-csv';

const CommissionReport = () => {
  const [commissionData, setCommissionData] = useState([]); // Populate this with your commission logic
  
  // Example data structure
  const exampleData = [
    { employeeId: 'USER001', name: 'John Doe', sales: 50000, rate: '10%', commission: 5000, status: 'Paid' },
    { employeeId: 'USER002', name: 'Jane Smith', sales: 75000, rate: '12%', commission: 9000, status: 'Pending' }
  ];

  const csvHeaders = [
    { label: 'Employee ID', key: 'employeeId' },
    { label: 'Name', key: 'name' },
    { label: 'Total Sales', key: 'sales' },
    { label: 'Commission Rate', key: 'rate' },
    { label: 'Commission Earned', key: 'commission' },
    { label: 'Status', key: 'status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Commission Report</h2>
        <CSVLink 
          data={exampleData} // Replace with real commissionData when ready
          headers={csvHeaders} 
          filename={"commission-report.csv"}
          className="export-btn"
          style={{ textDecoration: 'none', color: 'white' }}
        >
          Export to CSV
        </CSVLink>
      </div>
      <p>Commission calculation logic to be implemented.</p>
    </div>
  );
};

export default CommissionReport;

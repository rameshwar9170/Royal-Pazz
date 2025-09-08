// htams-ca-report-generator.js
const fs = require('fs');
const path = require('path');

class CAReportGenerator {
    constructor(dataPath) {
        try {
            const rawData = fs.readFileSync(dataPath, 'utf8');
            this.data = JSON.parse(rawData);
        } catch (error) {
            console.error('Error loading data file:', error.message);
            this.data = {};
        }
        
        this.reportDate = new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.reportTime = new Date().toLocaleTimeString('en-IN');
    }

    // Extract and analyze commission data
    extractCommissionData() {
        const commissions = this.data.commissions || {};
        const users = this.data.users || {};
        const salesDetails = this.data.salesDetails || {};
        
        console.log('Processing commission data...');
        
        const commissionAnalysis = [];
        const userSummary = {};
        let totalCommissions = 0;
        let totalOrders = 0;

        // Process each commission entry
        Object.keys(commissions).forEach(commissionId => {
            const commission = commissions[commissionId];
            const baseAmount = commission.amount || 0;
            totalCommissions += baseAmount;
            totalOrders++;

            // Process individual user commissions within this entry
            Object.keys(commission.commissions || {}).forEach(userId => {
                const userCommission = commission.commissions[userId];
                const user = users[userId] || {};
                const commissionAmount = userCommission.amount || 0;

                // Initialize user summary if not exists
                if (!userSummary[userId]) {
                    userSummary[userId] = {
                        userId: userId,
                        userName: user.name || `User-${userId}`,
                        role: userCommission.role || 'Agency',
                        totalEarned: 0,
                        orderCount: 0,
                        commissionRate: userCommission.rate || 20,
                        orders: []
                    };
                }

                // Update user summary
                userSummary[userId].totalEarned += commissionAmount;
                userSummary[userId].orderCount++;
                userSummary[userId].orders.push({
                    orderId: commission.orderId || commissionId,
                    amount: commissionAmount,
                    productName: commission.product?.name || 'Unknown Product',
                    date: commission.date || 'N/A'
                });

                // Add to detailed analysis
                commissionAnalysis.push({
                    commissionId,
                    userId,
                    userName: user.name || `User-${userId}`,
                    role: userCommission.role || 'Agency',
                    amount: commissionAmount,
                    rate: userCommission.rate || 20,
                    orderId: commission.orderId,
                    productName: commission.product?.name || 'Unknown Product',
                    baseOrderAmount: baseAmount
                });
            });
        });

        return {
            totalCommissions,
            totalOrders,
            commissionBreakdown: commissionAnalysis,
            userSummary: Object.values(userSummary),
            averageCommissionPerOrder: totalOrders > 0 ? totalCommissions / totalOrders : 0
        };
    }

    // Extract and analyze training data
    extractTrainingData() {
        const trainings = this.data.trainings || {};
        
        console.log('Processing training data...');
        
        const trainingAnalysis = {
            totalPrograms: 0,
            completedPrograms: 0,
            activePrograms: 0,
            pendingPrograms: 0,
            totalRevenuePotential: 0,
            actualCollections: 0,
            totalParticipants: 0,
            programs: [],
            trainerSummary: {},
            costAnalysis: {}
        };

        Object.keys(trainings).forEach(trainingId => {
            const training = trainings[trainingId];
            const fees = parseFloat(training.fees) || 0;
            const joinedCount = parseInt(training.joinedCount) || 0;
            const duration = training.duration || '1 day';
            const trainerName = training.trainerName || 'Unknown Trainer';
            const status = training.status || 'pending';

            trainingAnalysis.totalPrograms++;
            trainingAnalysis.totalRevenuePotential += fees;
            trainingAnalysis.actualCollections += (fees * joinedCount);
            trainingAnalysis.totalParticipants += joinedCount;

            // Count by status
            switch(status.toLowerCase()) {
                case 'completed':
                    trainingAnalysis.completedPrograms++;
                    break;
                case 'active':
                    trainingAnalysis.activePrograms++;
                    break;
                default:
                    trainingAnalysis.pendingPrograms++;
            }

            // Trainer summary
            if (!trainingAnalysis.trainerSummary[trainerName]) {
                trainingAnalysis.trainerSummary[trainerName] = {
                    name: trainerName,
                    programCount: 0,
                    totalRevenue: 0,
                    totalParticipants: 0,
                    estimatedAnnualSalary: 0
                };
            }

            trainingAnalysis.trainerSummary[trainerName].programCount++;
            trainingAnalysis.trainerSummary[trainerName].totalRevenue += (fees * joinedCount);
            trainingAnalysis.trainerSummary[trainerName].totalParticipants += joinedCount;

            // Add program details
            trainingAnalysis.programs.push({
                id: trainingId,
                trainerName,
                duration,
                fees,
                joinedCount,
                revenue: fees * joinedCount,
                status,
                collectionRate: fees > 0 ? ((fees * joinedCount) / fees * 100).toFixed(2) : 0,
                description: training.description || 'No description'
            });
        });

        // Calculate trainer salary estimates
        Object.keys(trainingAnalysis.trainerSummary).forEach(trainerName => {
            const trainer = trainingAnalysis.trainerSummary[trainerName];
            // Estimate based on program count and market rates
            if (trainer.programCount >= 5) {
                trainer.estimatedAnnualSalary = 600000; // Senior trainer
            } else if (trainer.programCount >= 3) {
                trainer.estimatedAnnualSalary = 450000; // Mid-level trainer
            } else {
                trainer.estimatedAnnualSalary = 300000; // Junior trainer
            }
        });

        return trainingAnalysis;
    }

    // Extract and analyze sales data
    extractSalesData() {
        const salesDetails = this.data.salesDetails || {};
        const products = this.data.products || {};
        
        console.log('Processing sales data...');
        
        const salesAnalysis = {
            totalSales: 0,
            totalOrders: 0,
            productBreakdown: {},
            salesByUser: {},
            salesByMonth: {},
            topProducts: [],
            topSellers: []
        };

        Object.keys(salesDetails).forEach(saleId => {
            const sale = salesDetails[saleId];
            const amount = parseFloat(sale.amount) || 0;
            const sellerId = sale.sellerId || sale.userId || 'Unknown';
            const productId = sale.product?.id || 'unknown-product';
            const productName = sale.product?.name || 'Unknown Product';
            const saleDate = sale.date || sale.createdAt || 'Unknown Date';

            salesAnalysis.totalSales += amount;
            salesAnalysis.totalOrders++;

            // Product breakdown
            if (!salesAnalysis.productBreakdown[productId]) {
                salesAnalysis.productBreakdown[productId] = {
                    id: productId,
                    name: productName,
                    totalSales: 0,
                    orderCount: 0,
                    averagePrice: 0,
                    highestSale: 0
                };
            }

            const productData = salesAnalysis.productBreakdown[productId];
            productData.totalSales += amount;
            productData.orderCount++;
            productData.averagePrice = productData.totalSales / productData.orderCount;
            productData.highestSale = Math.max(productData.highestSale, amount);

            // Sales by user
            if (!salesAnalysis.salesByUser[sellerId]) {
                salesAnalysis.salesByUser[sellerId] = {
                    sellerId,
                    totalSales: 0,
                    orderCount: 0,
                    averageOrderValue: 0
                };
            }

            const userData = salesAnalysis.salesByUser[sellerId];
            userData.totalSales += amount;
            userData.orderCount++;
            userData.averageOrderValue = userData.totalSales / userData.orderCount;

            // Sales by month (if date is available)
            if (saleDate !== 'Unknown Date') {
                const month = new Date(saleDate).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                
                if (!salesAnalysis.salesByMonth[month]) {
                    salesAnalysis.salesByMonth[month] = {
                        month,
                        sales: 0,
                        orders: 0
                    };
                }
                
                salesAnalysis.salesByMonth[month].sales += amount;
                salesAnalysis.salesByMonth[month].orders++;
            }
        });

        // Calculate top products and sellers
        salesAnalysis.topProducts = Object.values(salesAnalysis.productBreakdown)
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5);

        salesAnalysis.topSellers = Object.values(salesAnalysis.salesByUser)
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5);

        return salesAnalysis;
    }

    // Calculate comprehensive cost analysis
    calculateCostAnalysis() {
        const trainingData = this.extractTrainingData();
        const users = this.data.users || {};
        
        console.log('Calculating cost analysis...');
        
        // Employee cost estimation
        const roles = {
            admin: { count: 0, avgSalary: 60000 },
            subadmin: { count: 0, avgSalary: 45000 },
            agency: { count: 0, avgSalary: 35000 },
            user: { count: 0, avgSalary: 25000 }
        };

        Object.keys(users).forEach(userId => {
            const user = users[userId];
            const role = user.role?.toLowerCase() || 'user';
            if (roles[role]) {
                roles[role].count++;
            } else {
                roles.user.count++;
            }
        });

        const employeeCosts = {
            breakdown: roles,
            monthlyTotal: 0,
            annualTotal: 0
        };

        Object.keys(roles).forEach(role => {
            const roleData = roles[role];
            const monthlyCost = roleData.count * roleData.avgSalary;
            employeeCosts.monthlyTotal += monthlyCost;
            roleData.monthlyCost = monthlyCost;
            roleData.annualCost = monthlyCost * 12;
        });

        employeeCosts.annualTotal = employeeCosts.monthlyTotal * 12;

        // Trainer costs
        const trainerCosts = {
            totalTrainers: Object.keys(trainingData.trainerSummary).length,
            annualTotal: 0,
            breakdown: trainingData.trainerSummary
        };

        Object.values(trainingData.trainerSummary).forEach(trainer => {
            trainerCosts.annualTotal += trainer.estimatedAnnualSalary;
        });

        // Infrastructure and operational costs (estimated)
        const operationalCosts = {
            infrastructure: 200000, // Annual server, software costs
            marketing: 150000, // Annual marketing budget
            utilities: 120000, // Office utilities
            miscellaneous: 100000, // Other operational expenses
            total: 570000
        };

        const totalCosts = {
            employees: employeeCosts.annualTotal,
            trainers: trainerCosts.annualTotal,
            operational: operationalCosts.total,
            grandTotal: employeeCosts.annualTotal + trainerCosts.annualTotal + operationalCosts.total
        };

        return {
            employeeCosts,
            trainerCosts,
            operationalCosts,
            totalCosts
        };
    }

    // Calculate financial ratios and KPIs
    calculateFinancialRatios() {
        const commissionData = this.extractCommissionData();
        const trainingData = this.extractTrainingData();
        const salesData = this.extractSalesData();
        const costData = this.calculateCostAnalysis();

        const totalRevenue = salesData.totalSales + trainingData.actualCollections;
        const totalCosts = costData.totalCosts.grandTotal + commissionData.totalCommissions;

        return {
            revenue: {
                total: totalRevenue,
                fromSales: salesData.totalSales,
                fromTraining: trainingData.actualCollections,
                salesPercentage: totalRevenue > 0 ? (salesData.totalSales / totalRevenue * 100).toFixed(2) : 0,
                trainingPercentage: totalRevenue > 0 ? (trainingData.actualCollections / totalRevenue * 100).toFixed(2) : 0
            },
            costs: {
                total: totalCosts,
                employees: costData.employeeCosts.annualTotal,
                trainers: costData.trainerCosts.annualTotal,
                commissions: commissionData.totalCommissions,
                operational: costData.operationalCosts.total
            },
            profitability: {
                netProfit: totalRevenue - totalCosts,
                profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(2) : 0,
                breakEvenRevenue: totalCosts,
                revenueDeficit: Math.max(0, totalCosts - totalRevenue)
            },
            efficiency: {
                commissionToRevenueRatio: totalRevenue > 0 ? (commissionData.totalCommissions / totalRevenue * 100).toFixed(2) : 0,
                trainingCollectionRate: trainingData.totalRevenuePotential > 0 ? (trainingData.actualCollections / trainingData.totalRevenuePotential * 100).toFixed(4) : 0,
                costRecoveryRatio: totalCosts > 0 ? (totalRevenue / totalCosts * 100).toFixed(2) : 0,
                revenuePerEmployee: Object.keys(this.data.users || {}).length > 0 ? (totalRevenue / Object.keys(this.data.users || {}).length).toFixed(2) : 0,
                averageOrderValue: salesData.totalOrders > 0 ? (salesData.totalSales / salesData.totalOrders).toFixed(2) : 0
            }
        };
    }

    // Generate recommendations based on analysis
    generateRecommendations() {
        const financialRatios = this.calculateFinancialRatios();
        const recommendations = [];

        // Revenue-related recommendations
        if (financialRatios.profitability.netProfit < 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Profitability',
                issue: `Business is operating at a loss of ₹${Math.abs(financialRatios.profitability.netProfit).toLocaleString('en-IN')}`,
                suggestion: 'Immediate action required: Reduce operational costs by 40% and increase revenue by 300%',
                impact: 'Business Survival'
            });
        }

        if (parseFloat(financialRatios.efficiency.trainingCollectionRate) < 10) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Training Revenue',
                issue: `Training collection rate is only ${financialRatios.efficiency.trainingCollectionRate}%`,
                suggestion: 'Restructure training pricing - reduce fees by 70-80% to increase participation',
                impact: 'Revenue Optimization'
            });
        }

        if (parseFloat(financialRatios.efficiency.commissionToRevenueRatio) > 25) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Commission Structure',
                issue: `Commission ratio ${financialRatios.efficiency.commissionToRevenueRatio}% is too high`,
                suggestion: 'Review commission structure and product margins',
                impact: 'Cost Control'
            });
        }

        if (parseFloat(financialRatios.efficiency.revenuePerEmployee) < 100000) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Employee Productivity',
                issue: `Revenue per employee is only ₹${financialRatios.efficiency.revenuePerEmployee}`,
                suggestion: 'Improve employee productivity or reduce workforce',
                impact: 'Operational Efficiency'
            });
        }

        return recommendations;
    }

    // Generate complete CA report
    generateCompleteCAReport() {
        console.log('Generating comprehensive CA report...');
        
        const commissionData = this.extractCommissionData();
        const trainingData = this.extractTrainingData();
        const salesData = this.extractSalesData();
        const costData = this.calculateCostAnalysis();
        const financialRatios = this.calculateFinancialRatios();
        const recommendations = this.generateRecommendations();

        const report = {
            metadata: {
                title: 'HTAMS System - Comprehensive CA Report',
                subtitle: 'Financial Analysis for Chartered Accountant Review',
                generatedDate: this.reportDate,
                generatedTime: this.reportTime,
                reportVersion: '2.0',
                dataSource: 'HTAMS Firebase Database Export',
                currency: 'INR (₹)'
            },
            
            executiveSummary: {
                businessOverview: {
                    totalRevenue: financialRatios.revenue.total,
                    totalCosts: financialRatios.costs.total,
                    netPosition: financialRatios.profitability.netProfit,
                    profitMargin: financialRatios.profitability.profitMargin + '%',
                    totalUsers: Object.keys(this.data.users || {}).length,
                    totalOrders: salesData.totalOrders,
                    activeCommissionAgents: commissionData.userSummary.length
                },
                keyMetrics: {
                    revenueFromSales: salesData.totalSales,
                    revenueFromTraining: trainingData.actualCollections,
                    totalCommissionsPaid: commissionData.totalCommissions,
                    totalTrainingPrograms: trainingData.totalPrograms,
                    trainingCollectionRate: financialRatios.efficiency.trainingCollectionRate + '%',
                    averageOrderValue: financialRatios.efficiency.averageOrderValue
                }
            },

            detailedAnalysis: {
                commissions: commissionData,
                training: trainingData,
                sales: salesData,
                costs: costData
            },

            financialRatios,
            recommendations,

            complianceNotes: {
                taxImplications: [
                    'Commission payments require TDS deduction as per IT Act',
                    'Training revenue should be recognized on accrual basis',
                    'Employee costs include statutory contributions (PF, ESI)',
                    'GST compliance required for training services'
                ],
                auditRequirements: [
                    'Verify commission calculation accuracy',
                    'Review training fee collection procedures',
                    'Validate employee cost provisions',
                    'Check product inventory valuation'
                ]
            }
        };

        return report;
    }

    // Export functions
    exportToJSON(filename = 'htams-ca-report.json') {
        try {
            const report = this.generateCompleteCAReport();
            const jsonContent = JSON.stringify(report, null, 2);
            fs.writeFileSync(filename, jsonContent, 'utf8');
            console.log(`✓ JSON report exported: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error exporting JSON:', error.message);
            return null;
        }
    }

    exportToCSV(filename = 'htams-ca-report.csv') {
        try {
            const report = this.generateCompleteCAReport();
            let csv = 'Section,Category,Metric,Value,Unit\n';
            
            // Executive Summary
            csv += `Executive Summary,Business Overview,Total Revenue,${report.executiveSummary.businessOverview.totalRevenue},INR\n`;
            csv += `Executive Summary,Business Overview,Total Costs,${report.executiveSummary.businessOverview.totalCosts},INR\n`;
            csv += `Executive Summary,Business Overview,Net Position,${report.executiveSummary.businessOverview.netPosition},INR\n`;
            csv += `Executive Summary,Business Overview,Profit Margin,${report.executiveSummary.businessOverview.profitMargin},Percentage\n`;
            csv += `Executive Summary,Business Overview,Total Users,${report.executiveSummary.businessOverview.totalUsers},Count\n`;
            csv += `Executive Summary,Business Overview,Total Orders,${report.executiveSummary.businessOverview.totalOrders},Count\n`;

            // Commission Summary
            report.detailedAnalysis.commissions.userSummary.forEach(user => {
                csv += `Commissions,User Summary,${user.userName} Total Earned,${user.totalEarned},INR\n`;
                csv += `Commissions,User Summary,${user.userName} Orders,${user.orderCount},Count\n`;
                csv += `Commissions,User Summary,${user.userName} Rate,${user.commissionRate},Percentage\n`;
            });

            // Training Summary
            csv += `Training,Overview,Total Programs,${report.detailedAnalysis.training.totalPrograms},Count\n`;
            csv += `Training,Overview,Completed Programs,${report.detailedAnalysis.training.completedPrograms},Count\n`;
            csv += `Training,Overview,Total Revenue Potential,${report.detailedAnalysis.training.totalRevenuePotential},INR\n`;
            csv += `Training,Overview,Actual Collections,${report.detailedAnalysis.training.actualCollections},INR\n`;

            // Cost Summary
            csv += `Costs,Employee,Annual Total,${report.detailedAnalysis.costs.employeeCosts.annualTotal},INR\n`;
            csv += `Costs,Trainer,Annual Total,${report.detailedAnalysis.costs.trainerCosts.annualTotal},INR\n`;
            csv += `Costs,Operational,Annual Total,${report.detailedAnalysis.costs.operationalCosts.total},INR\n`;

            fs.writeFileSync(filename, csv, 'utf8');
            console.log(`✓ CSV report exported: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error exporting CSV:', error.message);
            return null;
        }
    }

    exportToHTML(filename = 'htams-ca-report.html') {
        try {
            const report = this.generateCompleteCAReport();
            
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.metadata.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header h2 { font-size: 1.3em; opacity: 0.9; }
        .meta-info { 
            background: #f8f9fa; 
            padding: 15px 30px; 
            border-bottom: 2px solid #e9ecef; 
            display: flex; 
            justify-content: space-between; 
            flex-wrap: wrap;
        }
        .section { margin: 30px; }
        .section h2 { 
            color: #495057; 
            border-bottom: 3px solid #007bff; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        .section h3 { 
            color: #6c757d; 
            margin: 20px 0 10px 0; 
            font-size: 1.2em; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        th { 
            background: #007bff; 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-weight: 600;
        }
        td { 
            padding: 10px 12px; 
            border-bottom: 1px solid #dee2e6; 
        }
        tr:nth-child(even) { background: #f8f9fa; }
        tr:hover { background: #e3f2fd; }
        .amount { text-align: right; font-weight: 600; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .warning { color: #ffc107; }
        .critical { 
            background: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .high { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .medium { 
            background: #d1ecf1; 
            border: 1px solid #bee5eb; 
            color: #0c5460; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .card h4 { 
            color: #495057; 
            margin-bottom: 15px; 
            font-size: 1.1em; 
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0; 
            padding: 5px 0; 
            border-bottom: 1px solid #eee; 
        }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: 600; }
        @media (max-width: 768px) {
            .container { margin: 10px; }
            .section { margin: 15px; }
            .meta-info { flex-direction: column; }
            table { font-size: 0.9em; }
        }
        .footer { 
            background: #343a40; 
            color: white; 
            text-align: center; 
            padding: 20px; 
            margin-top: 40px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${report.metadata.title}</h1>
            <h2>${report.metadata.subtitle}</h2>
        </div>

        <div class="meta-info">
            <span><strong>Generated:</strong> ${report.metadata.generatedDate} at ${report.metadata.generatedTime}</span>
            <span><strong>Version:</strong> ${report.metadata.reportVersion}</span>
            <span><strong>Currency:</strong> ${report.metadata.currency}</span>
        </div>

        <div class="section">
            <h2>📊 Executive Summary</h2>
            <div class="grid">
                <div class="card">
                    <h4>Business Overview</h4>
                    <div class="metric">
                        <span>Total Revenue</span>
                        <span class="metric-value">₹${report.executiveSummary.businessOverview.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Total Costs</span>
                        <span class="metric-value">₹${report.executiveSummary.businessOverview.totalCosts.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Net Position</span>
                        <span class="metric-value ${report.executiveSummary.businessOverview.netPosition >= 0 ? 'positive' : 'negative'}">
                            ₹${report.executiveSummary.businessOverview.netPosition.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div class="metric">
                        <span>Profit Margin</span>
                        <span class="metric-value">${report.executiveSummary.businessOverview.profitMargin}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h4>Key Metrics</h4>
                    <div class="metric">
                        <span>Total Users</span>
                        <span class="metric-value">${report.executiveSummary.businessOverview.totalUsers}</span>
                    </div>
                    <div class="metric">
                        <span>Total Orders</span>
                        <span class="metric-value">${report.executiveSummary.businessOverview.totalOrders}</span>
                    </div>
                    <div class="metric">
                        <span>Commission Agents</span>
                        <span class="metric-value">${report.executiveSummary.businessOverview.activeCommissionAgents}</span>
                    </div>
                    <div class="metric">
                        <span>Training Programs</span>
                        <span class="metric-value">${report.executiveSummary.keyMetrics.totalTrainingPrograms}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>💰 Commission Analysis</h2>
            <h3>User Commission Summary</h3>
            <table>
                <thead>
                    <tr>
                        <th>User Name</th>
                        <th>Role</th>
                        <th>Total Earned</th>
                        <th>Orders</th>
                        <th>Commission Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.detailedAnalysis.commissions.userSummary.map(user => `
                        <tr>
                            <td>${user.userName}</td>
                            <td>${user.role}</td>
                            <td class="amount">₹${user.totalEarned.toLocaleString('en-IN')}</td>
                            <td>${user.orderCount}</td>
                            <td>${user.commissionRate}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="grid">
                <div class="card">
                    <h4>Commission Overview</h4>
                    <div class="metric">
                        <span>Total Commissions</span>
                        <span class="metric-value">₹${report.detailedAnalysis.commissions.totalCommissions.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Total Orders</span>
                        <span class="metric-value">${report.detailedAnalysis.commissions.totalOrders}</span>
                    </div>
                    <div class="metric">
                        <span>Average Commission/Order</span>
                        <span class="metric-value">₹${Math.round(report.detailedAnalysis.commissions.averageCommissionPerOrder).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎓 Training Analysis</h2>
            <div class="grid">
                <div class="card">
                    <h4>Training Overview</h4>
                    <div class="metric">
                        <span>Total Programs</span>
                        <span class="metric-value">${report.detailedAnalysis.training.totalPrograms}</span>
                    </div>
                    <div class="metric">
                        <span>Completed</span>
                        <span class="metric-value">${report.detailedAnalysis.training.completedPrograms}</span>
                    </div>
                    <div class="metric">
                        <span>Active</span>
                        <span class="metric-value">${report.detailedAnalysis.training.activePrograms}</span>
                    </div>
                    <div class="metric">
                        <span>Total Participants</span>
                        <span class="metric-value">${report.detailedAnalysis.training.totalParticipants}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h4>Financial Performance</h4>
                    <div class="metric">
                        <span>Revenue Potential</span>
                        <span class="metric-value">₹${report.detailedAnalysis.training.totalRevenuePotential.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Actual Collections</span>
                        <span class="metric-value">₹${report.detailedAnalysis.training.actualCollections.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Collection Rate</span>
                        <span class="metric-value">${report.financialRatios.efficiency.trainingCollectionRate}%</span>
                    </div>
                </div>
            </div>

            <h3>Trainer Summary</h3>
            <table>
                <thead>
                    <tr>
                        <th>Trainer Name</th>
                        <th>Programs</th>
                        <th>Revenue Generated</th>
                        <th>Participants</th>
                        <th>Estimated Annual Salary</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.values(report.detailedAnalysis.training.trainerSummary).map(trainer => `
                        <tr>
                            <td>${trainer.name}</td>
                            <td>${trainer.programCount}</td>
                            <td class="amount">₹${trainer.totalRevenue.toLocaleString('en-IN')}</td>
                            <td>${trainer.totalParticipants}</td>
                            <td class="amount">₹${trainer.estimatedAnnualSalary.toLocaleString('en-IN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>💼 Cost Analysis</h2>
            <div class="grid">
                <div class="card">
                    <h4>Employee Costs</h4>
                    <div class="metric">
                        <span>Monthly Total</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.employeeCosts.monthlyTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Annual Total</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.employeeCosts.annualTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h4>Trainer Costs</h4>
                    <div class="metric">
                        <span>Total Trainers</span>
                        <span class="metric-value">${report.detailedAnalysis.costs.trainerCosts.totalTrainers}</span>
                    </div>
                    <div class="metric">
                        <span>Annual Total</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.trainerCosts.annualTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h4>Total Cost Summary</h4>
                    <div class="metric">
                        <span>Employee Costs</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.totalCosts.employees.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Trainer Costs</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.totalCosts.trainers.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span>Operational Costs</span>
                        <span class="metric-value">₹${report.detailedAnalysis.costs.totalCosts.operational.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="metric">
                        <span><strong>Grand Total</strong></span>
                        <span class="metric-value"><strong>₹${report.detailedAnalysis.costs.totalCosts.grandTotal.toLocaleString('en-IN')}</strong></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📈 Financial Ratios & KPIs</h2>
            <div class="grid">
                <div class="card">
                    <h4>Profitability</h4>
                    <div class="metric">
                        <span>Net Profit</span>
                        <span class="metric-value ${report.financialRatios.profitability.netProfit >= 0 ? 'positive' : 'negative'}">
                            ₹${report.financialRatios.profitability.netProfit.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div class="metric">
                        <span>Profit Margin</span>
                        <span class="metric-value">${report.financialRatios.profitability.profitMargin}%</span>
                    </div>
                    <div class="metric">
                        <span>Break-even Revenue</span>
                        <span class="metric-value">₹${report.financialRatios.profitability.breakEvenRevenue.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h4>Efficiency Ratios</h4>
                    <div class="metric">
                        <span>Commission/Revenue</span>
                        <span class="metric-value">${report.financialRatios.efficiency.commissionToRevenueRatio}%</span>
                    </div>
                    <div class="metric">
                        <span>Training Collection Rate</span>
                        <span class="metric-value">${report.financialRatios.efficiency.trainingCollectionRate}%</span>
                    </div>
                    <div class="metric">
                        <span>Cost Recovery</span>
                        <span class="metric-value">${report.financialRatios.efficiency.costRecoveryRatio}%</span>
                    </div>
                    <div class="metric">
                        <span>Revenue per Employee</span>
                        <span class="metric-value">₹${parseFloat(report.financialRatios.efficiency.revenuePerEmployee).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>⚠️ Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="${rec.priority.toLowerCase()}">
                    <h4>[${rec.priority}] ${rec.category}</h4>
                    <p><strong>Issue:</strong> ${rec.issue}</p>
                    <p><strong>Suggestion:</strong> ${rec.suggestion}</p>
                    <p><strong>Impact:</strong> ${rec.impact}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📋 Compliance Notes</h2>
            <h3>Tax Implications</h3>
            <ul>
                ${report.complianceNotes.taxImplications.map(item => `<li>${item}</li>`).join('')}
            </ul>
            
            <h3>Audit Requirements</h3>
            <ul>
                ${report.complianceNotes.auditRequirements.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>

        <div class="footer">
            <p>&copy; 2025 HTAMS System | Generated on ${report.metadata.generatedDate} | For CA Review</p>
        </div>
    </div>
</body>
</html>`;

            fs.writeFileSync(filename, html, 'utf8');
            console.log(`✓ HTML report exported: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error exporting HTML:', error.message);
            return null;
        }
    }

    // Generate all reports
    generateAllReports() {
        console.log('🚀 Starting comprehensive report generation...\n');
        
        const files = {
            json: this.exportToJSON(),
            csv: this.exportToCSV(),
            html: this.exportToHTML()
        };
        
        console.log('\n✅ All reports generated successfully!');
        console.log('📁 Generated files:');
        Object.entries(files).forEach(([type, filename]) => {
            if (filename) {
                console.log(`   - ${type.toUpperCase()}: ${filename}`);
            }
        });
        
        return files;
    }
}

// Export the class
module.exports = CAReportGenerator;

// If running directly
if (require.main === module) {
    const generator = new CAReportGenerator('./conpany-1dffc-default-rtdb-HTAMS-export.json');
    const report = generator.generateCompleteCAReport();
    generator.generateAllReports();
}

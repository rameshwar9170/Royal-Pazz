import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase/config';
import * as XLSX from 'xlsx';
import '../styles/SalesDashboard.css';

const SalesDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCommissions: 0
  });
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerDetails, setSellerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('totalSales');
  const [sortOrder, setSortOrder] = useState('desc');
  const [allSellersData, setAllSellersData] = useState([]); // Store detailed seller data

  // Enhanced date validation function
  const isValidDate = (dateValue) => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Safe date formatting
  const formatDate = (dateValue) => {
    if (!isValidDate(dateValue)) return 'Invalid Date';
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Safe month extraction
  const getMonthFromDate = (dateValue) => {
    if (!isValidDate(dateValue)) return null;
    try {
      return new Date(dateValue).toISOString().slice(0, 7);
    } catch (error) {
      return null;
    }
  };

  // Safe number formatting
  const safeNumberFormat = (value) => {
    if (value == null || value === undefined || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  // Format large amounts with abbreviations
  const formatAmount = (amount) => {
    const num = safeNumberFormat(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString()}`;
  };

  // Get actual user level based on role
  const getUserLevel = (user) => {
    if (user.currentLevel) return user.currentLevel;
    if (user.role) {
      return user.role.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return 'User';
  };

  // Calculate team commission and members from commission history
  const calculateTeamMetrics = (user, allUsers) => {
    let teamCommission = 0;
    let ownCommission = 0;
    let teamMembers = 0;

    if (allUsers) {
      teamMembers = Object.values(allUsers).filter(member => 
        member.referredBy === user.uid
      ).length;
    }

    if (user.commissionHistory) {
      Object.values(user.commissionHistory).forEach(commission => {
        const commissionAmount = safeNumberFormat(commission.amount);
        if (commission.fromUser && commission.fromUser !== user.uid) {
          teamCommission += commissionAmount;
        } else {
          ownCommission += commissionAmount;
        }
      });
    }

    return {
      teamCommission,
      ownCommission,
      teamMembers,
      totalCommission: teamCommission + ownCommission
    };
  };

  // Enhanced function to fetch detailed seller data
  const fetchAllSellersDetailedData = async (sellersBasicData) => {
    const detailedSellers = [];
    
    for (const seller of sellersBasicData) {
      try {
        // Fetch sales history
        const salesHistoryRef = ref(db, `HTAMS/users/${seller.uid}/salesHistory`);
        const salesHistorySnapshot = await get(salesHistoryRef);
        const salesIds = Object.keys(salesHistorySnapshot.val() || {});
        
        let recentSales = [];
        let topProducts = [];
        let monthlyTrend = [];
        let averageOrderValue = 0;
        let highestSale = 0;
        let lastSaleDate = null;
        
        if (salesIds.length > 0) {
          // Fetch detailed sales data (limit to last 50 for performance)
          const salesPromises = salesIds.slice(-50).map(saleId =>
            get(ref(db, `HTAMS/salesDetails/${saleId}`))
              .then(saleSnapshot => {
                const saleData = saleSnapshot.val();
                return saleData ? { id: saleId, ...saleData } : null;
              })
          );
          
          const salesDetails = await Promise.all(salesPromises);
          const validSales = salesDetails.filter(sale => sale && sale.sellerId === seller.uid);
          
          recentSales = validSales.slice(0, 10);
          topProducts = getTopProducts(validSales);
          monthlyTrend = getMonthlyTrend(validSales);
          averageOrderValue = seller.totalOrders > 0 ? seller.totalSales / seller.totalOrders : 0;
          
          // Find highest sale
          highestSale = Math.max(...validSales.map(sale => safeNumberFormat(sale.amount)));
          
          // Find last sale date
          const sortedSales = validSales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
          lastSaleDate = sortedSales.length > 0 ? sortedSales[0].saleDate : null;
        }
        
        detailedSellers.push({
          ...seller,
          recentSales,
          topProducts,
          monthlyTrend,
          averageOrderValue,
          highestSale,
          lastSaleDate,
          performanceScore: calculatePerformanceScore(seller),
          salesGrowth: calculateSalesGrowth(recentSales)
        });
        
      } catch (error) {
        console.error(`Error fetching details for seller ${seller.name}:`, error);
        // Add seller with basic data if detailed fetch fails
        detailedSellers.push({
          ...seller,
          recentSales: [],
          topProducts: [],
          monthlyTrend: [],
          averageOrderValue: seller.totalOrders > 0 ? seller.totalSales / seller.totalOrders : 0,
          highestSale: 0,
          lastSaleDate: null,
          performanceScore: calculatePerformanceScore(seller),
          salesGrowth: { current: 0, previous: 0, growth: '0%' }
        });
      }
    }
    
    return detailedSellers;
  };

  // Calculate performance score
  const calculatePerformanceScore = (seller) => {
    const salesScore = Math.min((seller.totalSales / 100000) * 20, 40); // Max 40 points
    const ordersScore = Math.min((seller.totalOrders / 50) * 20, 30); // Max 30 points
    const teamScore = Math.min((seller.teamMembers / 10) * 15, 20); // Max 20 points
    const commissionScore = Math.min((seller.totalCommissions / 50000) * 10, 10); // Max 10 points
    
    return Math.round(salesScore + ordersScore + teamScore + commissionScore);
  };

  // Enhanced Export complete Sales Analytics Report with detailed data
  const exportSalesAnalyticsReport = async () => {
    try {
      setLoading(true);
      
      // Fetch detailed data for all sellers
      const detailedSellers = await fetchAllSellersDetailedData(sellers);
      
      // Prepare workbook
      const wb = XLSX.utils.book_new();

      // 1. Dashboard Summary
      const dashboardData = [
        ['Sales Analytics Dashboard Report - Comprehensive Analysis'],
        ['Generated on:', new Date().toLocaleDateString()],
        ['Generated at:', new Date().toLocaleTimeString()],
        [''],
        ['Overall Performance Metrics'],
        ['Metric', 'Value'],
        ['Total Sales Revenue', `₹${dashboardStats.totalSales.toLocaleString()}`],
        ['Total Orders', dashboardStats.totalOrders.toLocaleString()],
        ['Total Commissions', `₹${dashboardStats.totalCommissions.toLocaleString()}`],
        ['Average Order Value', `₹${dashboardStats.totalOrders ? Math.round(dashboardStats.totalSales / dashboardStats.totalOrders).toLocaleString() : 0}`],
        ['Active Sellers', sellers.length.toString()],
        ['Top Performer', sellers.length > 0 ? sellers[0].name : 'N/A'],
        ['Highest Single Sale', `₹${Math.max(...detailedSellers.map(s => s.highestSale)).toLocaleString()}`],
        [''],
        ['Report Configuration'],
        ['Search Query:', searchQuery || 'None'],
        ['Sort By:', sortBy],
        ['Sort Order:', sortOrder === 'desc' ? 'Highest First' : 'Lowest First'],
        ['Data Coverage:', `${sellers.length} sellers with sales history`]
      ];

      const dashboardWS = XLSX.utils.aoa_to_sheet(dashboardData);
      XLSX.utils.book_append_sheet(wb, dashboardWS, 'Executive Summary');

      // 2. Complete Sellers Performance with detailed metrics
      if (detailedSellers.length > 0) {
        const sellersData = [
          ['Comprehensive Sellers Performance Report'],
          [''],
          ['Rank', 'Seller Name', 'Email', 'Phone', 'Level', 'Role', 'Join Date', 'Total Sales', 'Total Orders', 'Avg Order Value', 'Highest Sale', 'Total Commission', 'Own Commission', 'Team Commission', 'Team Members', 'Performance Score', 'Last Sale Date', 'Department', 'Location', 'Sales Growth %']
        ];
        
        detailedSellers.forEach((seller, index) => {
          sellersData.push([
            `#${index + 1}`,
            seller.name,
            seller.email,
            seller.phone,
            seller.currentLevel,
            seller.role,
            seller.joinDate,
            seller.totalSales,
            seller.totalOrders,
            Math.round(seller.averageOrderValue),
            seller.highestSale,
            seller.totalCommissions,
            seller.ownCommission,
            seller.teamCommission,
            seller.teamMembers,
            seller.performanceScore,
            seller.lastSaleDate ? formatDate(seller.lastSaleDate) : 'No Sales',
            seller.department,
            seller.location,
            seller.salesGrowth.growth
          ]);
        });

        const sellersWS = XLSX.utils.aoa_to_sheet(sellersData);
        XLSX.utils.book_append_sheet(wb, sellersWS, 'Complete Sellers Data');
      }

      // 3. Top Performers Analysis (Top 20)
      const topPerformers = detailedSellers.slice(0, 20);
      if (topPerformers.length > 0) {
        const topPerformersData = [
          ['Top 20 Performing Sellers - Detailed Analysis'],
          [''],
          ['Rank', 'Name', 'Level', 'Sales Revenue', 'Orders', 'Avg Order Value', 'Highest Sale', 'Commission Earned', 'Team Size', 'Performance Score', 'Monthly Growth', 'Top Product', 'Last Sale']
        ];
        
        topPerformers.forEach((seller, index) => {
          const topProduct = seller.topProducts.length > 0 ? seller.topProducts[0].name : 'N/A';
          topPerformersData.push([
            `#${index + 1}`,
            seller.name,
            seller.currentLevel,
            `₹${seller.totalSales.toLocaleString()}`,
            seller.totalOrders,
            `₹${Math.round(seller.averageOrderValue).toLocaleString()}`,
            `₹${seller.highestSale.toLocaleString()}`,
            `₹${seller.totalCommissions.toLocaleString()}`,
            seller.teamMembers,
            seller.performanceScore,
            seller.salesGrowth.growth,
            topProduct,
            seller.lastSaleDate ? formatDate(seller.lastSaleDate) : 'No Sales'
          ]);
        });

        const topPerformersWS = XLSX.utils.aoa_to_sheet(topPerformersData);
        XLSX.utils.book_append_sheet(wb, topPerformersWS, 'Top 20 Performers');
      }

      // 4. Level-wise Performance Analysis
      const levelAnalysis = {};
      detailedSellers.forEach(seller => {
        const level = seller.currentLevel;
        if (!levelAnalysis[level]) {
          levelAnalysis[level] = {
            count: 0,
            totalSales: 0,
            totalOrders: 0,
            totalCommissions: 0,
            avgPerformanceScore: 0,
            highestSale: 0,
            teamMembers: 0
          };
        }
        levelAnalysis[level].count++;
        levelAnalysis[level].totalSales += seller.totalSales;
        levelAnalysis[level].totalOrders += seller.totalOrders;
        levelAnalysis[level].totalCommissions += seller.totalCommissions;
        levelAnalysis[level].avgPerformanceScore += seller.performanceScore;
        levelAnalysis[level].highestSale = Math.max(levelAnalysis[level].highestSale, seller.highestSale);
        levelAnalysis[level].teamMembers += seller.teamMembers;
      });

      const levelData = [
        ['Level-wise Performance Deep Analysis'],
        [''],
        ['Level', 'Seller Count', 'Total Sales', 'Avg Sales per Seller', 'Total Orders', 'Total Commission', 'Avg Performance Score', 'Highest Single Sale', 'Total Team Members', 'Avg Team Size']
      ];

      Object.entries(levelAnalysis).forEach(([level, data]) => {
        const avgSales = data.count > 0 ? Math.round(data.totalSales / data.count) : 0;
        const avgScore = data.count > 0 ? Math.round(data.avgPerformanceScore / data.count) : 0;
        const avgTeamSize = data.count > 0 ? Math.round(data.teamMembers / data.count) : 0;
        
        levelData.push([
          level,
          data.count,
          `₹${data.totalSales.toLocaleString()}`,
          `₹${avgSales.toLocaleString()}`,
          data.totalOrders,
          `₹${data.totalCommissions.toLocaleString()}`,
          `${avgScore}/100`,
          `₹${data.highestSale.toLocaleString()}`,
          data.teamMembers,
          avgTeamSize
        ]);
      });

      const levelWS = XLSX.utils.aoa_to_sheet(levelData);
      XLSX.utils.book_append_sheet(wb, levelWS, 'Level Analysis');

      // 5. Detailed Commission Analysis
      const commissionData = [
        ['Comprehensive Commission Analysis'],
        [''],
        ['Seller Name', 'Level', 'Own Sales', 'Own Commission', 'Team Commission', 'Total Commission', 'Commission Rate (%)', 'Team Members', 'Avg Commission per Team Member', 'Performance Score']
      ];

      detailedSellers.forEach(seller => {
        const commissionRate = seller.totalSales > 0 ? ((seller.totalCommissions / seller.totalSales) * 100).toFixed(2) : 0;
        const avgCommissionPerMember = seller.teamMembers > 0 ? Math.round(seller.teamCommission / seller.teamMembers) : 0;
        
        commissionData.push([
          seller.name,
          seller.currentLevel,
          `₹${seller.totalSales.toLocaleString()}`,
          `₹${seller.ownCommission.toLocaleString()}`,
          `₹${seller.teamCommission.toLocaleString()}`,
          `₹${seller.totalCommissions.toLocaleString()}`,
          `${commissionRate}%`,
          seller.teamMembers,
          `₹${avgCommissionPerMember.toLocaleString()}`,
          seller.performanceScore
        ]);
      });

      const commissionWS = XLSX.utils.aoa_to_sheet(commissionData);
      XLSX.utils.book_append_sheet(wb, commissionWS, 'Commission Analysis');

      // 6. Team Building Excellence
      const teamBuilders = detailedSellers
        .filter(seller => seller.teamMembers > 0)
        .sort((a, b) => b.teamMembers - a.teamMembers);

      if (teamBuilders.length > 0) {
        const teamBuildingData = [
          ['Team Building Excellence Report'],
          [''],
          ['Rank', 'Seller Name', 'Level', 'Team Members', 'Team Commission', 'Own Sales', 'Team Performance Ratio', 'Avg Commission per Member', 'Performance Score', 'Join Date']
        ];

        teamBuilders.forEach((seller, index) => {
          const avgCommissionPerMember = seller.teamMembers > 0 ? Math.round(seller.teamCommission / seller.teamMembers) : 0;
          const teamPerformanceRatio = seller.ownCommission > 0 ? (seller.teamCommission / seller.ownCommission).toFixed(2) : 0;
          
          teamBuildingData.push([
            `#${index + 1}`,
            seller.name,
            seller.currentLevel,
            seller.teamMembers,
            `₹${seller.teamCommission.toLocaleString()}`,
            `₹${seller.totalSales.toLocaleString()}`,
            teamPerformanceRatio,
            `₹${avgCommissionPerMember.toLocaleString()}`,
            seller.performanceScore,
            seller.joinDate
          ]);
        });

        const teamBuildingWS = XLSX.utils.aoa_to_sheet(teamBuildingData);
        XLSX.utils.book_append_sheet(wb, teamBuildingWS, 'Team Building Leaders');
      }

      // 7. Top Products Across All Sellers
      const allProducts = {};
      detailedSellers.forEach(seller => {
        seller.topProducts.forEach(product => {
          if (!allProducts[product.name]) {
            allProducts[product.name] = {
              quantity: 0,
              revenue: 0,
              sellers: []
            };
          }
          allProducts[product.name].quantity += product.quantity;
          allProducts[product.name].revenue += product.revenue;
          if (!allProducts[product.name].sellers.includes(seller.name)) {
            allProducts[product.name].sellers.push(seller.name);
          }
        });
      });

      const topProductsGlobal = Object.entries(allProducts)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .slice(0, 20);

      if (topProductsGlobal.length > 0) {
        const productsData = [
          ['Top 20 Products - Company Wide Performance'],
          [''],
          ['Rank', 'Product Name', 'Total Quantity Sold', 'Total Revenue', 'Number of Sellers', 'Avg Revenue per Seller', 'Top Selling Sellers']
        ];

        topProductsGlobal.forEach(([productName, data], index) => {
          const avgRevenuePerSeller = data.sellers.length > 0 ? Math.round(data.revenue / data.sellers.length) : 0;
          productsData.push([
            `#${index + 1}`,
            productName,
            data.quantity,
            `₹${data.revenue.toLocaleString()}`,
            data.sellers.length,
            `₹${avgRevenuePerSeller.toLocaleString()}`,
            data.sellers.slice(0, 3).join(', ') + (data.sellers.length > 3 ? '...' : '')
          ]);
        });

        const productsWS = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, productsWS, 'Top Products Company-Wide');
      }

      // 8. Monthly Performance Trends
      const monthlyTrends = {};
      detailedSellers.forEach(seller => {
        seller.monthlyTrend.forEach(trend => {
          if (!monthlyTrends[trend.month]) {
            monthlyTrends[trend.month] = {
              sales: 0,
              orders: 0,
              sellers: 0
            };
          }
          monthlyTrends[trend.month].sales += trend.sales;
          monthlyTrends[trend.month].orders += trend.orders;
          monthlyTrends[trend.month].sellers++;
        });
      });

      const monthlyData = [
        ['Monthly Performance Trends - Company Overview'],
        [''],
        ['Month', 'Total Sales', 'Total Orders', 'Active Sellers', 'Avg Sales per Seller', 'Avg Orders per Seller']
      ];

      Object.entries(monthlyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, data]) => {
          const avgSalesPerSeller = data.sellers > 0 ? Math.round(data.sales / data.sellers) : 0;
          const avgOrdersPerSeller = data.sellers > 0 ? Math.round(data.orders / data.sellers) : 0;
          
          monthlyData.push([
            month,
            `₹${data.sales.toLocaleString()}`,
            data.orders,
            data.sellers,
            `₹${avgSalesPerSeller.toLocaleString()}`,
            avgOrdersPerSeller
          ]);
        });

      const monthlyWS = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, monthlyWS, 'Monthly Trends');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `Comprehensive_Sales_Analytics_Report_${currentDate}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);

      alert(`Comprehensive Sales Analytics Report with ${detailedSellers.length} sellers exported successfully!`);
    } catch (error) {
      console.error('Error exporting comprehensive Sales Analytics Report:', error);
      alert('Failed to export comprehensive Sales Analytics Report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel function for individual seller (unchanged)
  const exportToExcel = () => {
    if (!selectedSeller || !sellerDetails) return;

    try {
      // Prepare workbook
      const wb = XLSX.utils.book_new();

      // Summary Data
      const summaryData = [
        ['Individual Seller Performance Report'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['Metric', 'Value'],
        ['Seller Name', selectedSeller.name],
        ['Email', selectedSeller.email],
        ['Level', selectedSeller.currentLevel],
        ['Role', selectedSeller.role],
        ['Join Date', selectedSeller.joinDate],
        ['Own Sales', `₹${sellerDetails.totalRevenue.toLocaleString()}`],
        ['Total Commission', `₹${sellerDetails.totalCommissions.toLocaleString()}`],
        ['Own Commission', `₹${sellerDetails.ownCommission.toLocaleString()}`],
        ['Team Commission', `₹${sellerDetails.teamCommission.toLocaleString()}`],
        ['Total Orders', sellerDetails.totalOrders],
        ['Team Members', sellerDetails.teamMembers],
        ['Average Order Value', `₹${Math.round(sellerDetails.averageOrderValue).toLocaleString()}`]
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

      // Top Products Data
      if (sellerDetails.topProducts.length > 0) {
        const productsData = [
          ['Top Products Performance'],
          [''],
          ['Rank', 'Product Name', 'Quantity Sold', 'Revenue Generated', 'Avg Price per Unit']
        ];
        sellerDetails.topProducts.forEach((product, index) => {
          const avgPrice = product.quantity > 0 ? Math.round(product.revenue / product.quantity) : 0;
          productsData.push([
            `#${index + 1}`,
            product.name,
            product.quantity,
            `₹${product.revenue.toLocaleString()}`,
            `₹${avgPrice.toLocaleString()}`
          ]);
        });

        const productsWS = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, productsWS, 'Top Products');
      }

      // Recent Sales Data
      if (sellerDetails.recentSales.length > 0) {
        const salesData = [
          ['Recent Sales History'],
          [''],
          ['Date', 'Product', 'Customer', 'Amount', 'Commission', 'Payment Method']
        ];
        sellerDetails.recentSales.slice(0, 50).forEach(sale => {
          salesData.push([
            formatDate(sale.saleDate),
            sale.product?.name || 'N/A',
            sale.customerName || 'N/A',
            `₹${safeNumberFormat(sale.amount).toLocaleString()}`,
            `₹${safeNumberFormat(sale.commissions?.[selectedSeller.uid]?.amount).toLocaleString()}`,
            sale.paymentMethod || 'N/A'
          ]);
        });

        const salesWS = XLSX.utils.aoa_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, salesWS, 'Recent Sales');
      }

      // Monthly Trend Data
      if (sellerDetails.monthlyTrend.length > 0) {
        const trendData = [
          ['Monthly Performance Trend'],
          [''],
          ['Month', 'Sales Amount', 'Orders Count', 'Avg Order Value']
        ];
        sellerDetails.monthlyTrend.forEach(trend => {
          const avgOrderValue = trend.orders > 0 ? Math.round(trend.sales / trend.orders) : 0;
          trendData.push([
            trend.month,
            `₹${trend.sales.toLocaleString()}`,
            trend.orders,
            `₹${avgOrderValue.toLocaleString()}`
          ]);
        });

        const trendWS = XLSX.utils.aoa_to_sheet(trendData);
        XLSX.utils.book_append_sheet(wb, trendWS, 'Monthly Trend');
      }

      // Generate filename with current date and seller name
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${selectedSeller.name}_Detailed_Report_${currentDate}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting individual seller report:', error);
      alert('Failed to export individual seller report. Please try again.');
    }
  };

  // Fetch dashboard aggregates with error handling (unchanged)
  useEffect(() => {
    const analyticsRef = ref(db, 'HTAMS/analytics');
    const unsubscribe = onValue(analyticsRef, (snapshot) => {
      try {
        const data = snapshot.val() || {};
        setDashboardStats({
          totalSales: safeNumberFormat(data.totalSales),
          totalOrders: safeNumberFormat(data.totalOrders),
          totalCommissions: safeNumberFormat(data.totalCommissions)
        });
        setError('');
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to fetch dashboard statistics');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Analytics listener error:', err);
      setError('Failed to connect to analytics data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch users who have made sales with enhanced team metrics (unchanged)
  useEffect(() => {
    const usersRef = ref(db, 'HTAMS/users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      try {
        const users = snapshot.val() || {};
        let sellersWithSales = Object.entries(users)
          .filter(([uid, user]) => user.analytics?.totalOrders > 0)
          .map(([uid, user]) => {
            const teamMetrics = calculateTeamMetrics({ uid, ...user }, users);
            
            return {
              uid,
              name: user.name || 'Unknown User',
              email: user.email || '',
              currentLevel: getUserLevel(user),
              role: user.role || 'User',
              totalSales: safeNumberFormat(user.analytics?.totalSales),
              totalOrders: safeNumberFormat(user.analytics?.totalOrders),
              totalCommissions: teamMetrics.totalCommission,
              ownCommission: teamMetrics.ownCommission,
              teamCommission: teamMetrics.teamCommission,
              teamMembers: teamMetrics.teamMembers,
              joinDate: user.createdAt ? formatDate(user.createdAt) : 'N/A',
              phone: user.phone || 'N/A',
              department: user.department || 'Sales',
              location: user.location || 'N/A'
            };
          });

        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          sellersWithSales = sellersWithSales.filter(seller =>
            seller.name.toLowerCase().includes(query) ||
            seller.email.toLowerCase().includes(query) ||
            seller.currentLevel.toLowerCase().includes(query)
          );
        }

        // Apply sorting
        sellersWithSales.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];
          
          if (sortOrder === 'desc') {
            return typeof aValue === 'string' ? bValue.localeCompare(aValue) : bValue - aValue;
          } else {
            return typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue;
          }
        });
        
        setSellers(sellersWithSales);
      } catch (err) {
        console.error('Error processing sellers data:', err);
        setError('Failed to process sellers data');
      }
    }, (err) => {
      console.error('Users listener error:', err);
      setError('Failed to fetch sellers data');
    });

    return () => unsubscribe();
  }, [searchQuery, sortBy, sortOrder]);

  // Enhanced seller details fetching (unchanged)
  const fetchSellerDetails = async (seller) => {
    setSelectedSeller(seller);
    setLoading(true);
    
    try {
      const salesHistoryRef = ref(db, `HTAMS/users/${seller.uid}/salesHistory`);
      onValue(salesHistoryRef, async (snapshot) => {
        try {
          const salesIds = Object.keys(snapshot.val() || {});
          
          if (salesIds.length === 0) {
            setSellerDetails({
              recentSales: [],
              totalRevenue: seller.totalSales,
              totalOrders: seller.totalOrders,
              totalCommissions: seller.totalCommissions,
              ownCommission: seller.ownCommission,
              teamCommission: seller.teamCommission,
              teamMembers: seller.teamMembers,
              averageOrderValue: seller.totalOrders > 0 ? seller.totalSales / seller.totalOrders : 0,
              topProducts: [],
              monthlyTrend: []
            });
            setLoading(false);
            return;
          }
          
          // Fetch detailed sales data (limit to last 50 for performance)
          const salesPromises = salesIds.slice(-50).map(saleId =>
            new Promise((resolve) => {
              const saleRef = ref(db, `HTAMS/salesDetails/${saleId}`);
              onValue(saleRef, (saleSnapshot) => {
                const saleData = saleSnapshot.val();
                resolve(saleData ? { id: saleId, ...saleData } : null);
              }, { onlyOnce: true });
            })
          );
          
          const salesDetails = await Promise.all(salesPromises);
          const validSales = salesDetails.filter(sale => sale && sale.sellerId === seller.uid);
          
          const sellerAnalytics = {
            recentSales: validSales.slice(0, 20),
            totalRevenue: seller.totalSales,
            totalOrders: seller.totalOrders,
            totalCommissions: seller.totalCommissions,
            ownCommission: seller.ownCommission,
            teamCommission: seller.teamCommission,
            teamMembers: seller.teamMembers,
            averageOrderValue: seller.totalOrders > 0 ? seller.totalSales / seller.totalOrders : 0,
            topProducts: getTopProducts(validSales),
            monthlyTrend: getMonthlyTrend(validSales),
            salesGrowth: calculateSalesGrowth(validSales)
          };
          
          setSellerDetails(sellerAnalytics);
        } catch (err) {
          console.error('Error processing seller details:', err);
          setError('Failed to process seller details');
        } finally {
          setLoading(false);
        }
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error fetching seller details:', error);
      setError('Failed to fetch seller details');
      setLoading(false);
    }
  };

  const getTopProducts = (sales) => {
    const productMap = {};
    sales.forEach(sale => {
      if (sale.product?.name) {
        const productName = sale.product.name;
        if (!productMap[productName]) {
          productMap[productName] = { quantity: 0, revenue: 0 };
        }
        productMap[productName].quantity += safeNumberFormat(sale.quantity) || 1;
        productMap[productName].revenue += safeNumberFormat(sale.amount);
      }
    });
    
    return Object.entries(productMap)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  };

  const getMonthlyTrend = (sales) => {
    const monthlyData = {};
    
    sales.forEach(sale => {
      const month = getMonthFromDate(sale.saleDate);
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { sales: 0, orders: 0 };
        }
        monthlyData[month].sales += safeNumberFormat(sale.amount);
        monthlyData[month].orders += 1;
      }
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        sales: data.sales,
        orders: data.orders
      }));
  };

  const calculateSalesGrowth = (sales) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }).reduce((sum, sale) => sum + safeNumberFormat(sale.amount), 0);
    
    const lastMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
    }).reduce((sum, sale) => sum + safeNumberFormat(sale.amount), 0);
    
    const growth = lastMonthSales > 0 ? ((currentMonthSales - lastMonthSales) / lastMonthSales * 100).toFixed(2) : 0;
    return { current: currentMonthSales, previous: lastMonthSales, growth: `${growth}%` };
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('totalSales');
    setSortOrder('desc');
    setTimeRange('all');
  };

  if (loading && sellers.length === 0) {
    return (
      <div className="sales-dash-container">
        <div className="sales-dash-loading">
          <div className="sales-dash-spinner"></div>
          <p>Loading sales dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dash-container">
      {/* Header Section */}
      <div className="sales-dash-header">
        <div className="sales-dash-title-section">
          <h1 className="sales-dash-title">
            <span className="sales-dash-icon">📊</span>
            Sales Analytics Dashboard
          </h1>
          <p className="sales-dash-subtitle">Real-time insights into sales performance and team analytics</p>
        </div>
        
        <div className="sales-dash-quick-actions">
          <button className="sales-dash-refresh-btn" onClick={() => window.location.reload()}>
            🔄 Refresh Data
          </button>
          <button 
            className="sales-dash-export-btn"
            onClick={exportSalesAnalyticsReport}
            disabled={loading || sellers.length === 0}
          >
            📤 Export Complete Report
          </button>
        </div>
      </div>

      {error && (
        <div className="sales-dash-error">
          <span className="sales-dash-error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="sales-dash-stats-grid">
        <div className="sales-dash-stat-card sales-dash-primary">
          <div className="sales-dash-stat-icon">💰</div>
          <div className="sales-dash-stat-content">
            <h4>Total Sales Revenue</h4>
            <p className="sales-dash-stat-value" title={`₹${dashboardStats.totalSales.toLocaleString()}`}>
              {formatAmount(dashboardStats.totalSales)}
            </p>
            <span className="sales-dash-stat-change">+12.5% from last month</span>
          </div>
        </div>
        
        <div className="sales-dash-stat-card sales-dash-secondary">
          <div className="sales-dash-stat-icon">📦</div>
          <div className="sales-dash-stat-content">
            <h4>Total Orders</h4>
            <p className="sales-dash-stat-value">{dashboardStats.totalOrders.toLocaleString()}</p>
            <span className="sales-dash-stat-change">+8.3% from last month</span>
          </div>
        </div>
        
        <div className="sales-dash-stat-card sales-dash-success">
          <div className="sales-dash-stat-icon">💎</div>
          <div className="sales-dash-stat-content">
            <h4>Total Commissions</h4>
            <p className="sales-dash-stat-value" title={`₹${dashboardStats.totalCommissions.toLocaleString()}`}>
              {formatAmount(dashboardStats.totalCommissions)}
            </p>
            <span className="sales-dash-stat-change">+15.7% from last month</span>
          </div>
        </div>
        
        <div className="sales-dash-stat-card sales-dash-info">
          <div className="sales-dash-stat-icon">📈</div>
          <div className="sales-dash-stat-content">
            <h4>Average Order Value</h4>
            <p className="sales-dash-stat-value" title={`₹${dashboardStats.totalOrders ? Math.round(dashboardStats.totalSales / dashboardStats.totalOrders).toLocaleString() : 0}`}>
              {dashboardStats.totalOrders ? formatAmount(Math.round(dashboardStats.totalSales / dashboardStats.totalOrders)) : '₹0'}
            </p>
            <span className="sales-dash-stat-change">+4.2% from last month</span>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="sales-dash-controls">
        <div className="sales-dash-search-section">
          <div className="sales-dash-search-wrapper">
            <span className="sales-dash-search-icon">🔍</span>
            <input
              type="text"
              className="sales-dash-search-input"
              placeholder="Search sellers by name, email, or level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="sales-dash-filter-section">
          <select 
            className="sales-dash-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="totalSales">Sort by Revenue</option>
            <option value="totalOrders">Sort by Orders</option>
            <option value="totalCommissions">Sort by Commission</option>
            <option value="teamMembers">Sort by Team Size</option>
            <option value="name">Sort by Name</option>
          </select>

          <select 
            className="sales-dash-select" 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Highest First</option>
            <option value="asc">Lowest First</option>
          </select>

          <button className="sales-dash-reset-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Sellers Grid */}
      <div className="sales-dash-sellers-section">
        <h2 className="sales-dash-section-title">
          <span className="sales-dash-section-icon">🏆</span>
          Top Performing Sellers ({sellers.length})
        </h2>
        
        {sellers.length === 0 ? (
          <div className="sales-dash-no-data">
            <div className="sales-dash-no-data-icon">📊</div>
            <h3>No Sales Data Available</h3>
            <p>No sellers have made any sales yet or data is still loading.</p>
          </div>
        ) : (
          <div className="sales-dash-sellers-grid">
            {sellers.map((seller, index) => (
              <div 
                key={seller.uid} 
                className="sales-dash-seller-card"
                onClick={() => fetchSellerDetails(seller)}
              >
                <div className="sales-dash-seller-rank">#{index + 1}</div>
                <div className="sales-dash-seller-avatar">
                  {seller.name.charAt(0).toUpperCase()}
                </div>
                <div className="sales-dash-seller-info">
                  <h4 className="sales-dash-seller-name">{seller.name}</h4>
                  <p className="sales-dash-seller-level">{seller.currentLevel}</p>
                  <p className="sales-dash-seller-email">{seller.email}</p>
                </div>
                <div className="sales-dash-seller-stats">
                  <div className="sales-dash-stat-item">
                    <span className="sales-dash-stat-label">Revenue</span>
                    <span className="sales-dash-stat-number" title={`₹${seller.totalSales.toLocaleString()}`}>
                      {formatAmount(seller.totalSales)}
                    </span>
                  </div>
                  <div className="sales-dash-stat-item">
                    <span className="sales-dash-stat-label">Orders</span>
                    <span className="sales-dash-stat-number">{seller.totalOrders}</span>
                  </div>
                  <div className="sales-dash-stat-item">
                    <span className="sales-dash-stat-label">Commission</span>
                    <span className="sales-dash-stat-number" title={`₹${seller.totalCommissions.toLocaleString()}`}>
                      {formatAmount(seller.totalCommissions)}
                    </span>
                  </div>
                </div>
                <div className="sales-dash-seller-actions">
                  <button className="sales-dash-view-btn">View Details →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact Responsive Modal */}
      {selectedSeller && (
        <div className="compact-modal-overlay" onClick={() => setSelectedSeller(null)}>
          <div className="compact-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Compact Header */}
            <div className="compact-modal-header">
              <div className="compact-header-info">
                <div className="compact-avatar">
                  {selectedSeller.name.charAt(0).toUpperCase()}
                </div>
                <div className="compact-user-details">
                  <h3>{selectedSeller.name}</h3>
                  <p>{selectedSeller.currentLevel} • {selectedSeller.email}</p>
                </div>
              </div>
              <button 
                className="compact-close-btn"
                onClick={() => setSelectedSeller(null)}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="compact-modal-body">
              {loading ? (
                <div className="compact-loading">
                  <div className="compact-spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : sellerDetails ? (
                <>
                  {/* Compact Metrics Grid */}
                  <div className="compact-metrics-grid">
                    <div className="compact-metric-card">
                      <div className="metric-icon">💰</div>
                      <div className="metric-info">
                        <span className="metric-label">Own Sales</span>
                        <span className="metric-value" title={`₹${sellerDetails.totalRevenue.toLocaleString()}`}>
                          {formatAmount(sellerDetails.totalRevenue)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="compact-metric-card">
                      <div className="metric-icon">💎</div>
                      <div className="metric-info">
                        <span className="metric-label">Total Commission</span>
                        <span className="metric-value" title={`₹${sellerDetails.totalCommissions.toLocaleString()}`}>
                          {formatAmount(sellerDetails.totalCommissions)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="compact-metric-card">
                      <div className="metric-icon">🎯</div>
                      <div className="metric-info">
                        <span className="metric-label">Own Commission</span>
                        <span className="metric-value" title={`₹${sellerDetails.ownCommission.toLocaleString()}`}>
                          {formatAmount(sellerDetails.ownCommission)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="compact-metric-card">
                      <div className="metric-icon">👥</div>
                      <div className="metric-info">
                        <span className="metric-label">Team Commission</span>
                        <span className="metric-value" title={`₹${sellerDetails.teamCommission.toLocaleString()}`}>
                          {formatAmount(sellerDetails.teamCommission)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="compact-metric-card">
                      <div className="metric-icon">📦</div>
                      <div className="metric-info">
                        <span className="metric-label">Total Orders</span>
                        <span className="metric-value">{sellerDetails.totalOrders}</span>
                      </div>
                    </div>
                    
                    <div className="compact-metric-card">
                      <div className="metric-icon">👨‍👩‍👧‍👦</div>
                      <div className="metric-info">
                        <span className="metric-label">Team Members</span>
                        <span className="metric-value">{sellerDetails.teamMembers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  {sellerDetails.topProducts.length > 0 && (
                    <div className="compact-section">
                      <h4>🛍️ Top Products</h4>
                      <div className="compact-products">
                        {sellerDetails.topProducts.slice(0, 3).map((product, index) => (
                          <div key={index} className="compact-product-item">
                            <span className="product-rank">#{index + 1}</span>
                            <div className="product-details">
                              <span className="product-name">{product.name}</span>
                              <span className="product-stats">{product.quantity} sold • {formatAmount(product.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Sales */}
                  {sellerDetails.recentSales.length > 0 && (
                    <div className="compact-section">
                      <h4>🕒 Recent Sales</h4>
                      <div className="compact-sales-list">
                        {sellerDetails.recentSales.slice(0, 5).map(sale => (
                          <div key={sale.id} className="compact-sale-item">
                            <div className="sale-date">{formatDate(sale.saleDate)}</div>
                            <div className="sale-details">
                              <span className="sale-product">{sale.product?.name || 'N/A'}</span>
                              <span className="sale-amount" title={`₹${safeNumberFormat(sale.amount).toLocaleString()}`}>
                                {formatAmount(safeNumberFormat(sale.amount))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="compact-no-data">
                  <p>No data available</p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="compact-modal-footer">
              <button 
                className="compact-btn secondary"
                onClick={() => setSelectedSeller(null)}
              >
                Close
              </button>
              <button 
                className="compact-btn primary"
                onClick={exportToExcel}
                disabled={!sellerDetails}
              >
                📤 Export Individual Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Modal Styles */}
      <style jsx>{`
        .compact-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 10px;
        }

        .compact-modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .compact-modal-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 16px 16px 0 0;
        }

        .compact-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .compact-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .compact-user-details {
          min-width: 0;
          flex: 1;
        }

        .compact-user-details h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compact-user-details p {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.9;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compact-close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .compact-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .compact-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          min-height: 0;
        }

        .compact-loading {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .compact-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .compact-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .compact-metric-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          transition: all 0.2s ease;
        }

        .compact-metric-card:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
        }

        .metric-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }

        .metric-info {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .metric-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1f2937;
          word-break: break-all;
          overflow-wrap: break-word;
        }

        .compact-section {
          margin-bottom: 24px;
        }

        .compact-section h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 12px 0;
        }

        .compact-products {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .compact-product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .product-rank {
          background: #667eea;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .product-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .product-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .product-stats {
          color: #6b7280;
          font-size: 0.75rem;
          word-break: break-all;
        }

        .compact-sales-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .compact-sale-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .sale-date {
          color: #6b7280;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .sale-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 0;
        }

        .sale-product {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 150px;
        }

        .sale-amount {
          color: #059669;
          font-weight: 600;
          font-size: 0.8rem;
          word-break: break-all;
        }

        .compact-no-data {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .compact-modal-footer {
          padding: 16px 20px;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          border-radius: 0 0 16px 16px;
          flex-shrink: 0;
        }

        .compact-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .compact-btn.secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .compact-btn.secondary:hover {
          background: #d1d5db;
        }

        .compact-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .compact-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .compact-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        /* Enhanced export button styles */
        .sales-dash-export-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sales-dash-export-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .sales-dash-export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        /* Amount formatting fixes */
        .sales-dash-stat-value {
          word-break: break-all;
          overflow-wrap: break-word;
          hyphens: auto;
          max-width: 100%;
        }

        .sales-dash-stat-number {
          word-break: break-all;
          overflow-wrap: break-word;
          font-size: 0.85rem;
          max-width: 100%;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .compact-modal-overlay {
            padding: 5px;
          }

          .compact-modal-content {
            max-height: 95vh;
          }

          .compact-modal-header {
            padding: 16px;
          }

          .compact-avatar {
            width: 40px;
            height: 40px;
            font-size: 1.2rem;
          }

          .compact-user-details h3 {
            font-size: 1rem;
          }

          .compact-user-details p {
            font-size: 0.75rem;
          }

          .compact-modal-body {
            padding: 16px;
          }

          .compact-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .compact-metric-card {
            padding: 12px;
          }

          .metric-icon {
            font-size: 1.2rem;
            margin-bottom: 6px;
          }

          .metric-label {
            font-size: 0.7rem;
          }

          .metric-value {
            font-size: 0.8rem;
          }

          .compact-section h4 {
            font-size: 0.9rem;
          }

          .compact-modal-footer {
            padding: 12px 16px;
            gap: 8px;
          }

          .compact-btn {
            padding: 12px;
            font-size: 0.85rem;
          }

          .sales-dash-stat-value {
            font-size: 1.1rem;
          }

          .sales-dash-stat-number {
            font-size: 0.75rem;
          }
        }

        /* Ultra small screens */
        @media (max-width: 360px) {
          .compact-metrics-grid {
            grid-template-columns: 1fr;
          }

          .compact-header-info {
            gap: 8px;
          }

          .compact-user-details h3 {
            font-size: 0.9rem;
          }

          .compact-user-details p {
            font-size: 0.7rem;
          }
        }

        /* Scrollbar styling */
        .compact-modal-body::-webkit-scrollbar {
          width: 4px;
        }

        .compact-modal-body::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .compact-modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .compact-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SalesDashboard;

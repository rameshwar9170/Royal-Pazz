// Cache busting utility to ensure fresh data loading
export const clearNonEssentialCache = () => {
  const essentialKeys = [
    'htamsUser', 
    'lastLoginType', 
    'caUser', 
    'employeeData', 
    'firstLoginUser', 
    'firstLoginTrainer', 
    'htamsTrainer',
    'dashboardTheme',
    'autoTheme'
  ];
  
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (!essentialKeys.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Add cache-busting timestamp
  localStorage.setItem('appCacheBuster', Date.now().toString());
  localStorage.setItem('dataRefreshTime', Date.now().toString());
  
  console.log('Cache cleared - fresh data will be loaded');
};

export const getCacheBuster = () => {
  return localStorage.getItem('appCacheBuster') || Date.now().toString();
};

export const shouldRefreshData = (lastFetchTime) => {
  const cacheBuster = getCacheBuster();
  const currentTime = parseInt(cacheBuster);
  return !lastFetchTime || currentTime > lastFetchTime;
};

// Force refresh all data by clearing cache and setting new timestamp
export const forceDataRefresh = () => {
  clearNonEssentialCache();
  return Date.now();
};


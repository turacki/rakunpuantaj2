import axios from 'axios';

const formatDateShort = (date: Date) => {
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export const adisyoService = {
  // Base URL for Adisyo API
  BASE_URL: 'https://api.adisyo.com/api',
  EXT_URL: 'https://ext.adisyo.com/api',
  
  // Hardcoded token for now as per user request
  // In a real app, this should be managed securely
  TOKEN: (typeof window !== 'undefined' && localStorage.getItem('adisyo_token')) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJOYW1lIjoiUmFrdW4iLCJTdXNuYW1lIjoiUHViIiwiUGhvbmUiOiI1MDY0MTQ0MDAxIiwiVXNlcklkIjoiMjI4OTEyIiwiRW1haWwiOiJyYWt1bnB1YkBnbWFpbC5jb20iLCJFbWFpbENvbmZpcm1lZCI6IkZhbHNlIiwiUGluIjoiMCIsIlJlc3RhdXJhbnRJZCI6IjIxMjc2IiwiQ3VzdG9tZXJJZCI6IjIxMjc1IiwiQ3VzdG9tZXJXb3JraW5nVHlwZSI6IjEiLCJQYWNrYWdlRHVlRGF0ZSI6IjIwMjctMDAtMTFUMDc6MTI6MTUuNjMzWiIsIklzSGFzTXVsdGlwbGVSZXN0YXVyYW50cyI6IkZhbHNlIiwiSXNVc2luZ0NvbXBhbnlQcm9kdWN0IjoiRmFsc2UiLCJJc0NhbGxlcklkVXNlciI6IkZhbHNlIiwiVGltZVpvbmUiOiItMTgwIiwiSXNVc2luZ05ld1VybCI6IkZhbHNlIiwiUm9sZXMiOlsiUmVzdGF1cmFudEFkbWluIiwiQ2VudHJhbERlZmluaXRpb25zIiwiQjJiT3BlcmF0aW9ucyIsIlJlcG9ydGluZ3MiLCJDZW50cmFsTWFuYWdlciIsIkIyYkZpbmFuY2UiXSwiUmlnaHRzIjpbIlRhYmxlT3BlcmF0aW9ucyIsIlJlc3RhdXJhbnREZWZpbml0aW9uIiwiUHJvZHVjdERlZmluaXRpb25PcGVyYXRpb25zIiwiVXNlcnNPcGVyYXRpb25zIiwiT3JkZXJPcGVyYXRpb25zIiwiQ2FuY2VsT3JkZXJPcGVyYXRpb25zIiwiS2l0Y2hlbk9wZXJhdGlvbnMiLCJTdG9ja09wZXJhdGlvbnMiLCJEZWxpdmVyeU9wZXJhdGlvbnMiLCJQYWNrYWdlT3JkZXJPcGVyYXRpb25zIiwiRGlyZWN0T3JkZXJPcGVyYXRpb25zIiwiQ2FuRGVsZXRlT3JkZXJEZXRhaWwiLCJDYW5HZW5lcmFsRGlzY291bnRJbk9yZGVyIiwiQ2FuRGlzY291bnRJbk9yZGVyRGV0YWlscyIsIkNhbk9yZGVyUGF5bWVudCIsIkNhblZpZXdSZXBvcnRzIiwiRW5kT2ZEYXlPcGVyYXRpb25zIiwiRXhwZW5zZU9wZXJhdGlvbnMiLCJDYW5Nb3ZlT3JkZXJEZXRhaWwiLCJWaWV3Q2xvc2VkQ2FuY2VsZWRPcmRlciIsIkdldERlYml0Q29sbGVjdGlvbiIsIkF1dGhvcml6YXRpb25PcGVyYXRpb25zIiwiQ2FuQ2hhbmdlRGVsaXZlcnlTdGF0dXMiLCJDYW5CMmJPcmRlciIsIkNhblZpZXdTdG9ja1F1YW50aXRpZXMiLCJDYW5DaGFuZ2VPcmRlckJyYW5jaCIsIkNlbnRyYWxQYWlyaW5nQWxsb3dlZCIsIkNhbkNoYW5nZVVuaXRQcmljZUluT3JkZXIiLCJDYW5DaGFuZ2VDZW50cmFsSW50ZWdyYXRpb25TdGF0dXNlcyIsIkNhbkNoYW5nZVF1YW50aXR5SW5PcmRlciIsIkNhbkFkZEV4cGVuc2UiLCJDYW5FZGl0QW5kRGVsZXRlRXhwZW5zZSIsIkNhbkVkaXRDZW50cmFsUHJvZHVjdFByaWNlIiwiQ2FuUHJpbnRNYW51YWxPcmRlciIsIkludGVncmF0aW9uUHJvZHVjdE9wZXJhdGlvbnMiLCJDYW5WaWV3SW50ZWdyYXRpb25zU2NyZWVuIiwiQ2FuQ2hhbmdlT3JkZXJQYXltZW50VHlwZSIsIkNhbkNoYW5nZUNhc2hEcmF3ZXJTdGF0ZSIsIkNhbkRpc2FibGVkT2tjRGV2aWNlIiwiQ2FuQ2hhbmdlQ2xvc2VkU2hpZnRBbW91bnRzIiwiSW50ZWdyYXRpb25Qcm9kdWN0UHJpY2VPcGVyYXRpb25zIiwiUHJvZHVjdFByaWNlT3BlcmF0aW9ucyIsIkNhbkFkZENvdmVyQ2hhcmdlT3JTZXJ2aWNlVG9PcmRlciIsIkNhbk1hbmFnZVNoaXBtZW50RGF5cyJdLCJuYmYiOjE3NzMxNzI0NjEsImV4cCI6MTc3MzYwNDQ2MSwiaWF0IjoxNzczMTcyNDYxfQ.ICZF0hAqfRSWll3CzC3K04TK4qWtKe2TDv5FYrKaXGU" as string,

  setToken(newToken: string) {
    this.TOKEN = newToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('adisyo_token', newToken);
    }
  },

  // Login to Adisyo
  async login() {
    try {
      // Kullanıcının belirttiği doğru payload yapısı
      const response = await axios.post(`${this.BASE_URL}/security/login`, {
        username: 'rakunpub@gmail.com',
        password: '12091209Os',
        rememberMe: false
      });
      
      // Kullanıcının belirttiği gibi token "access_token" alanında geliyor
      const token = response.data.access_token || response.data.access_Token || response.data.token || response.data.Token;
      
      if (token) {
        this.setToken(token);
        return token;
      }

      throw new Error('Giriş başarısız: Sunucudan geçerli bir token (access_token) dönmedi.');
    } catch (error: any) {
      console.error('Adisyo login error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Helper to check if token is expired
  isTokenExpired() {
    if (!this.TOKEN) return true;
    try {
      const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return true;
      // exp is in seconds, Date.now() is in ms
      return Date.now() >= exp * 1000;
    } catch (e) {
      return true;
    }
  },

  // Ensure we have a valid token
  async ensureToken() {
    if (this.isTokenExpired()) {
      console.log('Token expired or missing, logging in...');
      await this.login();
    }
  },

  // Helper to get headers
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.TOKEN}`,
      'Content-Type': 'application/json',
    };
  },

  // Helper for retrying requests on 429
  async requestWithRetry(requestFn: () => Promise<any>, maxRetries = 10, delay = 3000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        if (error.response?.status === 429) {
          // Check for Retry-After header (could be in seconds or a date)
          const retryAfter = error.response.headers?.['retry-after'];
          let waitTime = delay * Math.pow(2, i); // Exponential backoff
          
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              waitTime = seconds * 1000 + 1000; // Add 1 second buffer
            }
          }
          
          console.warn(`Rate limited (429). Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  },

  // Get top sales by category
  async getTopSalesByCategory(startDate: string, endDate: string) {
    return this.requestWithRetry(async () => {
      await this.ensureToken();
      let restaurantId = "21276";
      try {
        const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
        if (payload.RestaurantId) restaurantId = payload.RestaurantId;
      } catch (e) {}

      // Format dates for Adisyo (YYYY-MM-DDTHH:mm:ss)
      const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
      const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;

      const response = await axios.post(`${this.EXT_URL}/reporting/GetTopSalesByCategory?restaurantId=${restaurantId}`, {
        restaurantId: restaurantId,
        startDateTime: start,
        endDateTime: end,
        startDateTimeLocal: start,
        endDateTimeLocal: end,
        areaIds: [],
        marketPlaceIds: [],
        orderTypes: [],
        limit: 10000
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    });
  },

  // Get top sales by product
  async getTopSalesByProduct(startDate: string, endDate: string) {
    return this.requestWithRetry(async () => {
      await this.ensureToken();
      let restaurantId = "21276";
      try {
        const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
        if (payload.RestaurantId) restaurantId = payload.RestaurantId;
      } catch (e) {}

      const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
      const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;

      const response = await axios.post(`${this.EXT_URL}/reporting/GetTopSalesByProduct?restaurantId=${restaurantId}`, {
        restaurantId: restaurantId,
        startDateTime: start,
        endDateTime: end,
        startDateTimeLocal: start,
        endDateTimeLocal: end,
        areaIds: [],
        marketPlaceIds: [],
        orderTypes: [],
        limit: 10000
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    });
  },

  // Get sales by users (waiter performance)
  async getSalesByUsers(startDate: string, endDate: string) {
    return this.requestWithRetry(async () => {
      await this.ensureToken();
      let restaurantId = "21276";
      try {
        const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
        if (payload.RestaurantId) restaurantId = payload.RestaurantId;
      } catch (e) {}

      const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
      const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;

      const payload = {
        restaurantId: restaurantId,
        startDateTime: start,
        endDateTime: end,
        startDateTimeLocal: start,
        endDateTimeLocal: end,
        areaIds: [],
        marketPlaceIds: [],
        orderTypes: [],
        limit: 10000
      };

      const response = await axios.post(`${this.EXT_URL}/reporting/GetSalesByUsers?restaurantId=${restaurantId}`, payload, {
        headers: this.getHeaders(),
      });
      return response.data;
    });
  },

  // Get expenses by date
  async getExpenses(startDate: string, endDate: string) {
    return this.requestWithRetry(async () => {
      await this.ensureToken();
      let restaurantId = "21276";
      try {
        const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
        if (payload.RestaurantId) restaurantId = payload.RestaurantId;
      } catch (e) {}

      const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
      const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;

      const response = await axios.post(`${this.BASE_URL}/expenses/GetExpensesByDate`, {
        restaurantId: restaurantId,
        startDate: start,
        endDate: end,
        startDateTime: start,
        endDateTime: end,
        startDateTimeLocal: start,
        endDateTimeLocal: end
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    });
  },

  // Get expense types
  async getExpenseTypes() {
    await this.ensureToken();
    let restaurantId = "21276";
    try {
      const payload = JSON.parse(atob(this.TOKEN.split('.')[1]));
      if (payload.RestaurantId) restaurantId = payload.RestaurantId;
    } catch (e) {}

    try {
      const response = await axios.post(`${this.BASE_URL}/expenses/GetExpenseTypes`, {
        restaurantId: restaurantId
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching expense types:', error);
      throw error;
    }
  },

  // Get weekly sales totals (Monday to Sunday)
  async getWeeklySalesByCategory(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const weeklyData: any[] = [];
    let current = new Date(start);
    
    // Find the first Monday on or before start
    // getDay(): 0 is Sunday, 1 is Monday...
    // To get to Monday: if 0 -> -6, if 1 -> 0, if 2 -> -1, if 3 -> -2...
    // Formula: (current.getDay() === 0 ? -6 : 1 - current.getDay())
    
    while (current <= end) {
      // Calculate start of the week (Monday)
      const day = current.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() + diffToMonday);
      
      // Calculate end of the week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Clamp to user range if desired, but user wants Mon-Sun totals
      // Adisyo API handles ranges, so we just need the strings
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      try {
        const data = await this.getTopSalesByCategory(startStr, endStr);
        const totalSum = data.reduce((acc: number, curr: any) => acc + (curr.sum || 0), 0);
        
        weeklyData.push({
          label: `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`,
          weekStart: startStr,
          weekEnd: endStr,
          sum: totalSum,
          categories: data
        });
        
        // Wait to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Error fetching weekly data for ${startStr}:`, error);
      }
      
      // Move to next week
      current = new Date(weekEnd);
      current.setDate(current.getDate() + 1);
    }
    
    return weeklyData;
  },

  // Get daily sales by category (for trend analysis)
  async getDailySalesByCategory(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dailyData: any[] = [];
    
    // Gün gün döngü kuralım
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      try {
        // Her gün için mevcut özeti çekelim
        const data = await this.getTopSalesByCategory(dateStr, dateStr);
        dailyData.push({
          date: dateStr,
          categories: data
        });
        // API'yi yormamak için bekleme (1 saniye)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching data for ${dateStr}:`, error);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dailyData;
  },

  // Save expense to Adisyo
  async saveExpense(expenseData: any) {
    await this.ensureToken();
    let restaurantId = "21276";
    let userId = 0;
    try {
      const tokenPayload = JSON.parse(atob(this.TOKEN.split('.')[1]));
      if (tokenPayload.RestaurantId) restaurantId = tokenPayload.RestaurantId;
      if (tokenPayload.UserId) userId = parseInt(tokenPayload.UserId);
    } catch (e) {}

    const formatDate = (date: Date) => {
      return date.toISOString().replace('Z', '');
    };
    
    const now = new Date();
    const nowStr = formatDate(now);
    
    const fullPayload = {
      id: 0,
      expenseTypeId: expenseData.expenseTypeId,
      note: expenseData.note,
      expenseDate: expenseData.expenseDate || nowStr,
      amount: expenseData.amount,
      shiftId: expenseData.shiftId || 0,
      paymentTypeId: 2, // Nakit/Cari
      userId: 0,
      restaurantId: parseInt(restaurantId),
      customerId: null,
      rowVersion: null,
      isActive: true,
      insertDate: nowStr,
      updateDate: nowStr,
      insertUserId: userId,
      updateUserId: 0,
      isError: false,
      errorMessage: null,
      errorTitle: null
    };

    try {
      const response = await fetch(`${this.BASE_URL}/expenses/SaveExpense`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fullPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Adisyo API Hatası (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error saving expense:', error);
      throw error;
    }
  },
};

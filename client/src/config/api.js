const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const getAuthToken = () => localStorage.getItem('authToken');

const makeRequest = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (getAuthToken()) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json().catch(() => null);
};

// ======== Auth API ========
export const authAPI = {
  login: (email, password) =>
    makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (email, password) =>
    makeRequest(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
};

// ======== Accounts API ========
export const accountsAPI = {
  getAll: () =>
    makeRequest(`${API_BASE_URL}/accounts`),

  getById: (id) =>
    makeRequest(`${API_BASE_URL}/accounts/${id}`),

  create: (accountData) =>
    makeRequest(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      body: JSON.stringify(accountData)
    }),

  update: (id, accountData) =>
    makeRequest(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData)
    }),

  delete: (id) =>
    makeRequest(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE'
    })
};

// ======== Transactions API ========
export const transactionsAPI = {
  getAll: () =>
    makeRequest(`${API_BASE_URL}/transactions`),

  getById: (id) =>
    makeRequest(`${API_BASE_URL}/transactions/${id}`),

  getByCategory: (category) =>
    makeRequest(`${API_BASE_URL}/transactions/category/${category}`),

  getByDateRange: (startDate, endDate) =>
    makeRequest(`${API_BASE_URL}/transactions/date-range?startDate=${startDate}&endDate=${endDate}`),

  create: (transactionData) =>
    makeRequest(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transactionData)
    }),

  update: (id, transactionData) =>
    makeRequest(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData)
    }),

  delete: (id) =>
    makeRequest(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE'
    })
};

// ======== Groups API ========
export const groupsAPI = {
  getAll: () =>
    makeRequest(`${API_BASE_URL}/groups`),

  getById: (id) =>
    makeRequest(`${API_BASE_URL}/groups/${id}`),

  create: (groupData) =>
    makeRequest(`${API_BASE_URL}/groups`, {
      method: 'POST',
      body: JSON.stringify(groupData)
    }),

  update: (id, groupData) =>
    makeRequest(`${API_BASE_URL}/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupData)
    }),

  addMember: (id, memberId) =>
    makeRequest(`${API_BASE_URL}/groups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberId })
    }),

  delete: (id) =>
    makeRequest(`${API_BASE_URL}/groups/${id}`, {
      method: 'DELETE'
    })
};

// ======== Splits API ========
export const splitsAPI = {
  getAll: () =>
    makeRequest(`${API_BASE_URL}/splits`),

  getById: (id) =>
    makeRequest(`${API_BASE_URL}/splits/${id}`),

  getByGroupId: (groupId) =>
    makeRequest(`${API_BASE_URL}/splits/group/${groupId}`),

  create: (splitData) =>
    makeRequest(`${API_BASE_URL}/splits`, {
      method: 'POST',
      body: JSON.stringify(splitData)
    }),

  update: (id, splitData) =>
    makeRequest(`${API_BASE_URL}/splits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(splitData)
    }),

  delete: (id) =>
    makeRequest(`${API_BASE_URL}/splits/${id}`, {
      method: 'DELETE'
    }),

  getBalance: (groupId) =>
    makeRequest(`${API_BASE_URL}/splits/group/${groupId}/balance`)
};

// ======== Ledgers API ========
export const ledgersAPI = {
  getAll: () =>
    makeRequest(`${API_BASE_URL}/ledgers`),

  getByGroupId: (groupId) =>
    makeRequest(`${API_BASE_URL}/ledgers/group/${groupId}`)
};

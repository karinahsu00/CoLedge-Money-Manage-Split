import React, { useState } from 'react';

const DashboardPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [transaction, setTransaction] = useState({
    date: '',
    amount: '',
    category: '',
    account: '',
    member: '',
    notes: '',
    type: 'expense', // types: expense, income, transfer
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction({ ...transaction, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTransactions([...transactions, transaction]);
    setTransaction({
      date: '',
      amount: '',
      category: '',
      account: '',
      member: '',
      notes: '',
      type: 'expense',
    });
  };

  return (
    <div>
      <h1>Transaction Dashboard</h1>
      <form onSubmit={handleSubmit}>
        <input type="date" name="date" value={transaction.date} onChange={handleChange} required />
        <input type="number" name="amount" value={transaction.amount} onChange={handleChange} required />
        <input type="text" name="category" value={transaction.category} onChange={handleChange} required />
        <input type="text" name="account" value={transaction.account} onChange={handleChange} required />
        <input type="text" name="member" value={transaction.member} onChange={handleChange} required />
        <textarea name="notes" value={transaction.notes} onChange={handleChange} placeholder="Notes"></textarea>
        <select name="type" value={transaction.type} onChange={handleChange}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <button type="submit">Add Transaction</button>
      </form>
      <div>
        <h2>Transactions</h2>
        <ul>
          {transactions.map((trans, index) => (
            <li key={index}>[{trans.date}] ${trans.amount} - {trans.category} - {trans.account} - {trans.member} - {trans.notes} - {trans.type}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
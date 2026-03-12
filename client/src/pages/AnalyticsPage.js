// Updated AnalyticsPage.js with minimal changes for Expense by Member and by Account

// Assuming you have the following imports
import React from 'react';
import { accountsAPI } from '../api/accountsAPI'; // Add the correct import for accountsAPI

const AnalyticsPage = ({ transactions }) => {
    // Existing code...

    const renderExpenseByMember = () => {
        return transactions.map(transaction => {
            // Fallback for members
            const members = transaction.members && transaction.members.length > 0 ? transaction.members : [transaction.member || 'You'];
            const splitAmount = transaction.amount / members.length;
            return members.map(member => (
                <div key={member}>{member}: ${splitAmount.toFixed(2)}</div>
            ));
        });
    };

    const renderExpenseByAccount = () => {
        const accounts = accountsAPI.getAll(); // Get all accounts
        return transactions.map(transaction => {
            const accountName = accounts[transaction.accountId] || 'Unknown Account';
            return <div key={transaction.id}>{accountName}: ${transaction.amount.toFixed(2)}</div>;
        });
    };

    return (
        <div>
            {/* Preserving existing UI */}
            <div>{renderExpenseByMember()}</div>
            <div>{renderExpenseByAccount()}</div>
            {/* Existing date range selector and other analytics logic */}
        </div>
    );
};

export default AnalyticsPage;
import React from 'react';

const DashboardPage = () => {
    // Sample data for user ledgers
    const ledgers = [
        { id: 1, date: '2026-01-01', amount: 100, description: 'Spent on groceries' },
        { id: 2, date: '2026-01-10', amount: 200, description: 'Electricity bill' },
        { id: 3, date: '2026-01-15', amount: 150, description: 'Dinner out' },
    ];

    return (
        <div>
            <h1>User Ledgers</h1>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {ledgers.map((ledger) => (
                        <tr key={ledger.id}>
                            <td>{ledger.date}</td>
                            <td>{ledger.amount}</td>
                            <td>{ledger.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DashboardPage;

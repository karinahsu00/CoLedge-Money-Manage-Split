import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <div>
        <Switch>
          {/* Define your routes here */}
          <Route path="/" exact>
            <h1>Welcome to Colledge Money Manager!</h1>
          </Route>
          {/* Add more routes as needed */}
        </Switch>
      </div>
    </Router>
  );
};

export default App;
import React from 'react';
import MobileTabBar from './MobileTabBar';
import './MobileLayout.css';

const MobileLayout = ({ children }) => {
  return (
    <div className="mobile-layout">
      <div className="mobile-layout__content">{children}</div>
      <MobileTabBar />
    </div>
  );
};

export default MobileLayout;
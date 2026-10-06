import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import AuthView from './views/AuthView';
import ElderDashboard from './views/ElderDashboard';
import FamilyDashboard from './views/FamilyDashboard';
import SOSModal from './components/SOSModal';
import AIChatDrawer from './components/AIChatDrawer';

function MainApp() {
  const { currentUser } = useApp();
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const role = currentUser?.role?.toLowerCase();

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar 
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSOS={() => setIsSOSOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {!currentUser ? (
          <AuthView />
        ) : role === 'elder' ? (
          <ElderDashboard
            onOpenChat={() => setIsChatOpen(true)}
            onOpenSOS={() => setIsSOSOpen(true)}
          />
        ) : (
          <FamilyDashboard
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}
      </main>

      {/* Global SOS Emergency Modal */}
      <SOSModal 
        isOpen={isSOSOpen} 
        onClose={() => setIsSOSOpen(false)} 
      />

      {/* Global AI CareBot Chat Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

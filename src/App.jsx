import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Drawer from './components/common/Drawer';
import CustomerDetail from './components/CustomerDetail';
import { AtRiskScreen, BlastBuilderScreen, LogsScreen, PromoCodesScreen, AnalyticsScreen } from './screens';
import { useToasts } from './hooks/useToasts';
import { useAsync } from './hooks/useAsync';
import { getCustomer, getAtRiskCustomers, getDispatchLog, listPromoCodes } from './api';

const TITLES = {
  'at-risk': ['Customers', 'At-risk list'],
  builder: ['Campaigns', 'Blast builder'],
  logs: ['Records', 'Dispatch logs'],
  promos: ['Records', 'Promo codes'],
  analytics: ['Records', 'Analytics'],
};

export default function App() {
  const [screen, setScreen] = useState('at-risk');
  const [drawerCustomerId, setDrawerCustomerId] = useState(null);
  const [blastPreselected, setBlastPreselected] = useState([]);
  const { push, ToastHost } = useToasts();

  // Nav badge counts (lightweight; mock resolves instantly).
  const { data: counts } = useAsync(async () => {
    const [c, d, p] = await Promise.all([getAtRiskCustomers(), getDispatchLog(), listPromoCodes()]);
    return { 'at-risk': c.length, logs: d.length, promos: p.length };
  }, []);

  // Customer detail for the drawer, fetched on demand by id.
  const { data: drawerCustomer } = useAsync(
    () => (drawerCustomerId ? getCustomer(drawerCustomerId) : Promise.resolve(null)),
    [drawerCustomerId],
  );

  function startBlast(ids) {
    setBlastPreselected(ids);
    setScreen('builder');
  }

  const [crumb, title] = TITLES[screen];

  return (
    <div className="app">
      <Sidebar screen={screen} onNavigate={setScreen} counts={counts || {}} />

      <main className="main">
        <Topbar crumb={crumb} title={title} />

        {screen === 'at-risk' && (
          <AtRiskScreen onOpenCustomer={setDrawerCustomerId} onStartBlast={startBlast} />
        )}
        {screen === 'builder' && (
          <BlastBuilderScreen
            preselected={blastPreselected}
            onSent={() => { push('Blast complete — see Dispatch logs.', 'ok'); setBlastPreselected([]); }}
          />
        )}
        {screen === 'logs' && <LogsScreen />}
        {screen === 'promos' && <PromoCodesScreen pushToast={push} />}
        {screen === 'analytics' && <AnalyticsScreen />}
      </main>

      <Drawer
        open={!!drawerCustomer}
        onClose={() => setDrawerCustomerId(null)}
        title={drawerCustomer ? drawerCustomer.name : ''}
        sub={drawerCustomer ? `${drawerCustomer.id} · ${drawerCustomer.phone}` : ''}
        footer={
          drawerCustomer ? (
            <>
              <button className="btn" onClick={() => setDrawerCustomerId(null)}>Close</button>
              <button
                className="btn btn-accent"
                onClick={() => { startBlast([drawerCustomer.id]); setDrawerCustomerId(null); }}
              >
                Blast this customer →
              </button>
            </>
          ) : null
        }
      >
        {drawerCustomer && <CustomerDetail customer={drawerCustomer} />}
      </Drawer>

      <ToastHost />
    </div>
  );
}

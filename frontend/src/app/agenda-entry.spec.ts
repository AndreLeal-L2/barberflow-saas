import { routes } from './app.routes';
import { Bookings } from './pages/bookings/bookings';

describe('Agenda entry', () => {
  it('opens the daily agenda as the dashboard landing page', async () => {
    const dashboard = routes.find((route) => route.path === 'dashboard');
    const landing = dashboard?.children?.find((route) => route.path === '');
    expect(await (landing!.loadComponent as () => Promise<unknown>)()).toBe(Bookings);
  });
});

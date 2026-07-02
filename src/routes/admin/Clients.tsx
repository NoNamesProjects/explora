import * as Tabs from '@radix-ui/react-tabs';
import { useTranslation } from 'react-i18next';
import { BookingsTab } from '@/components/admin/clients/BookingsTab';
import { ContactsTab } from '@/components/admin/clients/ContactsTab';

const TAB = 'px-4 py-2 text-sm font-medium text-ink-500 border-b-2 border-transparent transition-colors ' +
  'data-[state=active]:border-ink data-[state=active]:text-ink hover:text-ink';

export function Clients() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.clients.title', { defaultValue: 'Clients' })}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('admin.clients.subtitle', { defaultValue: 'Booking requests and contact-form enquiries.' })}</p>

      <Tabs.Root defaultValue="bookings" className="mt-5">
        <Tabs.List className="mb-5 flex gap-1 border-b border-cream-300">
          <Tabs.Trigger value="bookings" className={TAB}>{t('admin.clients.tabs.bookings', { defaultValue: 'Bookings' })}</Tabs.Trigger>
          <Tabs.Trigger value="contacts" className={TAB}>{t('admin.clients.tabs.contacts', { defaultValue: 'Contacts' })}</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="bookings"><BookingsTab /></Tabs.Content>
        <Tabs.Content value="contacts"><ContactsTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

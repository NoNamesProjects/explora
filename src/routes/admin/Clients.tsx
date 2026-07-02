import * as Tabs from '@radix-ui/react-tabs';
import { BookingsTab } from '@/components/admin/clients/BookingsTab';
import { ContactsTab } from '@/components/admin/clients/ContactsTab';

const TAB = 'px-4 py-2 text-sm font-medium text-ink-500 border-b-2 border-transparent transition-colors ' +
  'data-[state=active]:border-ink data-[state=active]:text-ink hover:text-ink';

export function Clients() {
  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Clients</h1>
      <p className="mt-1 text-sm text-ink-500">Booking requests and contact-form enquiries.</p>

      <Tabs.Root defaultValue="bookings" className="mt-5">
        <Tabs.List className="mb-5 flex gap-1 border-b border-cream-300">
          <Tabs.Trigger value="bookings" className={TAB}>Bookings</Tabs.Trigger>
          <Tabs.Trigger value="contacts" className={TAB}>Contacts</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="bookings"><BookingsTab /></Tabs.Content>
        <Tabs.Content value="contacts"><ContactsTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

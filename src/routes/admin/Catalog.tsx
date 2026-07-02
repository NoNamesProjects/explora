import * as Tabs from '@radix-ui/react-tabs';
import { HealthPanel } from '@/components/admin/catalog/HealthPanel';
import { JourneysTab } from '@/components/admin/catalog/JourneysTab';
import { ShipsTab, PortsTab } from '@/components/admin/catalog/ReferenceTabs';

const TAB = 'px-4 py-2 text-sm font-medium text-ink-500 border-b-2 border-transparent transition-colors ' +
  'data-[state=active]:border-ink data-[state=active]:text-ink hover:text-ink';

export function Catalog() {
  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Catalog</h1>
      <p className="mt-1 text-sm text-ink-500">The live data the site serves — and its health.</p>

      <div className="mt-5"><HealthPanel /></div>

      <Tabs.Root defaultValue="journeys" className="mt-7">
        <Tabs.List className="mb-5 flex gap-1 border-b border-cream-300">
          <Tabs.Trigger value="journeys" className={TAB}>Journeys</Tabs.Trigger>
          <Tabs.Trigger value="ships" className={TAB}>Ships</Tabs.Trigger>
          <Tabs.Trigger value="ports" className={TAB}>Ports</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="journeys"><JourneysTab /></Tabs.Content>
        <Tabs.Content value="ships"><ShipsTab /></Tabs.Content>
        <Tabs.Content value="ports"><PortsTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

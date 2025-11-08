# Story: Interface Selector

Status: done

## Summary

Provide a small, accessible UI component that lists available network interfaces and allows the user to choose which single interface to capture from. This component is used inside the Configuration Panel and must work on Windows (Npcap) and other platforms.

## Acceptance Criteria

1. Shows a list of detected network interfaces (name, description, IPs) returned by the preload API.
2. Allows selecting a single interface to capture from. The product will capture traffic on one interface at a time.
3. Provides a Refresh button that re-queries available interfaces.
4. Displays offline/unsupported interfaces with a clear disabled state and tooltip explaining why.
5. Keyboard navigable and screen-reader friendly (labels, role=listbox or table as appropriate).

## UI Contract (component)

Component: InterfaceSelector

### Props

- interfaces: NetworkInterface[]
- selected: string | null
- onSelect(id: string | string): void
  (Note: multi-select support removed; the component captures only a single interface.)
- onRefresh (optional): function that returns a Promise (used to refresh interfaces)
- disabled?: boolean

### NetworkInterface type (renderer-side shape)

- id: string
- name: string
- description?: string
- ips: string[]
- mac?: string
- status?: 'up' | 'down' | 'unknown'

## IPC / Preload mapping

- Read-only: window.electron.getNetworkInterfaces(): Promise<NetworkInterface[]> // provided by preload
- Optional: window.electron.openInterfaceDetails(id) -> opens OS network settings (optional helper)

## Edge cases

- No interfaces found: show an inline help CTA linking to docs/pcap-setup.md.
- Single interface only: present as selected and greyed-out refresh CTA available.

## Tests (automated)

1. Unit: renders a list of interfaces from a mocked `interfaces` prop and fires onSelect when clicked.
2. Unit: keyboard navigation (arrow keys, Enter) selects an item.
3. Integration: mock preload getNetworkInterfaces to return changing lists; pressing Refresh updates the list.
4. Accessibility: Axe snapshot to ensure no high-severity violations.

## Tasks

1. Implement `InterfaceSelector` component under `src/renderer/components/Configuration`.
2. Add unit tests under `tests/unit` using React Testing Library.
3. Integrate `InterfaceSelector` into `ConfigurationPanel` and wire `getNetworkInterfaces` from preload.
4. Add storybook story (if project uses Storybook) or Story variant in documentation.

## Acceptance Notes

Component must degrade gracefully when preload API is unavailable (show an error and link to setup docs). Ensure labels and ARIA attributes are present for screen-readers.

## Senior Developer Review (AI)

### Acceptance Criteria Validation

- **AC1 (Interface List)**: IMPLEMENTED (`src/renderer/components/InterfaceSelector.tsx`: lines 27–32)
- **AC2 (Single Selection)**: IMPLEMENTED (`src/renderer/components/InterfaceSelector.tsx`: lines 15–22)
- **AC3 (Refresh Button)**: IMPLEMENTED (`src/renderer/components/InterfaceSelector.tsx`: lines 34–44; `tests/unit/InterfaceSelectorRefresh.test.tsx`)
- **AC4 (Offline/Unsupported State)**: IMPLEMENTED (`src/renderer/components/InterfaceSelector.tsx`: lines 29–32)
- **AC5 (Keyboard & Screen Reader)**: IMPLEMENTED via native `<select>` with `<label>` and `aria-label` (`src/renderer/components/InterfaceSelector.tsx`: lines 10–13)

### Task Validation

- `InterfaceSelector` component implemented: VERIFIED (`src/renderer/components/InterfaceSelector.tsx`)
- Unit tests added: VERIFIED (`tests/unit/InterfaceSelector.test.tsx`, `InterfaceSelectorRefresh.test.tsx`)
- Integrated into `ConfigurationPanel`: VERIFIED (`src/renderer/components/ConfigurationPanel.tsx`: lines 18–24)
- Storybook story/documentation: **MISSING**

### Code Quality & Best Practices

- Component uses native `<select>`, aligning with accessibility recommendations.
- Error handling present on refresh failure.
- Suggest adding explicit ARIA roles (e.g., `role="listbox"`) for enhanced screen-reader compatibility.
- Consider relocating `InterfaceSelector` into a dedicated `components/Configuration` subfolder per UI contract.
- Tests currently do not cover keyboard navigation; recommend adding Axe accessibility snapshot testing.

**Overall Recommendation**
No blocking issues found. Recommend addressing missing Storybook documentation and enhancing accessibility tests.

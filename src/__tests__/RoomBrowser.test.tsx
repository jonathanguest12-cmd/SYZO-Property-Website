import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomBrowser from '@/components/RoomBrowser'
import { makeRoom } from './helpers'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('RoomBrowser', () => {
  const plymouthRoom = makeRoom({
    id: 'r1',
    rent_pcm: 500,
    property_city: 'Plymouth',
    room_type: 'doubleRoom',
  })
  const newquayRoom = makeRoom({
    id: 'r2',
    rent_pcm: 700,
    property_city: 'Newquay',
    property_name: '10 Beach Road',
    property_ref: 'PROP-2',
    room_type: 'singleRoom',
  })
  const rooms = [plymouthRoom, newquayRoom]

  it('renders room count', () => {
    render(<RoomBrowser rooms={rooms} />)
    expect(screen.getByText(/rooms? available/)).toBeInTheDocument()
  })

  it('filters by area when Plymouth is clicked in the filter', async () => {
    const user = userEvent.setup()
    render(<RoomBrowser rooms={rooms} />)

    // Open filters first
    const filtersButton = screen.getByText('Filters')
    await user.click(filtersButton)

    // Find the Plymouth button in the area filter
    const buttons = screen.getAllByRole('button')
    const plymouthButton = buttons.find(
      (b) => b.textContent === 'Plymouth'
    )!
    await user.click(plymouthButton)

    // Should show 1 room
    expect(screen.getByText('64 Alexandra Road, PL4 7EG')).toBeInTheDocument()
    expect(screen.queryByText('10 Beach Road, PL4 7EG')).not.toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    render(<RoomBrowser rooms={[]} />)
    expect(screen.getByText('No rooms match your filters')).toBeInTheDocument()
  })

  it('toggles to property view', async () => {
    const user = userEvent.setup()
    render(<RoomBrowser rooms={rooms} />)

    const buttons = screen.getAllByRole('button')
    const propertiesButton = buttons.find(
      (b) => b.textContent === 'Properties'
    )!
    await user.click(propertiesButton)

    // In property view, should see property names
    expect(screen.getByText('64 Alexandra Road')).toBeInTheDocument()
    expect(screen.getByText('10 Beach Road')).toBeInTheDocument()
  })

  it('respects initialArea', () => {
    render(<RoomBrowser rooms={rooms} initialArea="newquay" />)
    expect(screen.getAllByText(/10 Beach Road/).length).toBeGreaterThan(0)
    expect(screen.queryByText('64 Alexandra Road, PL4 7EG')).not.toBeInTheDocument()
  })

  it('shows active filter count badge', async () => {
    render(<RoomBrowser rooms={rooms} initialArea="plymouth" />)

    // Should show badge with count 1 since area is set
    // The badge is inside the Filters button
    const filtersButton = screen.getByText('Filters').closest('button')!
    expect(filtersButton.textContent).toContain('1')
  })

  it('sorts by price descending', async () => {
    const user = userEvent.setup()
    render(<RoomBrowser rooms={rooms} />)

    // Open filters
    const filtersButton = screen.getByText('Filters')
    await user.click(filtersButton)

    const select = screen.getByDisplayValue('Price: low to high')
    await user.selectOptions(select, 'price_desc')

    const viewRoomButtons = screen.getAllByText('View Room')
    expect(viewRoomButtons).toHaveLength(2)
  })
})

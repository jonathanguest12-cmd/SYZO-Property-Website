import { render, screen } from '@testing-library/react'
import RoomCard from '@/components/RoomCard'
import { makeRoom } from './helpers'

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('RoomCard', () => {
  it('renders room details correctly', () => {
    const room = makeRoom()
    render(<RoomCard room={room} />)

    expect(screen.getByText('Plymouth')).toBeInTheDocument()
    expect(screen.getByText(/550/)).toBeInTheDocument()
    expect(screen.getByText('Bills inc.')).toBeInTheDocument()
    expect(screen.getByText(/View Room/)).toBeInTheDocument()
  })

  it('shows "Available Now" for past dates', () => {
    const room = makeRoom({ available_from: '2024-01-01' })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Available Now')).toBeInTheDocument()
  })

  it('shows "Bills extra" when bills not included', () => {
    const room = makeRoom({ bills_included: false })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Bills extra')).toBeInTheDocument()
  })

  it('shows gradient placeholder with house icon when no photos', () => {
    const room = makeRoom({ photo_urls: [] })
    render(<RoomCard room={room} />)

    expect(screen.getByText('No photo')).toBeInTheDocument()
  })

  it('links to room detail page', () => {
    const room = makeRoom({ id: 'test-uuid' })
    render(<RoomCard room={room} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/room/test-uuid')
  })

  it('always uses property_name as card title', () => {
    const room = makeRoom({ advert_title: 'Lovely Double Room with Garden View', property_name: '64 Alexandra Road' })
    render(<RoomCard room={room} />)

    // Title should be property name, not advert_title
    expect(screen.getByText('64 Alexandra Road')).toBeInTheDocument()
    expect(screen.queryByText('Lovely Double Room with Garden View')).not.toBeInTheDocument()
  })

  it('shows city and postcode as subtitle', () => {
    const room = makeRoom({ property_city: 'Plymouth', property_postcode: 'PL4 7EG' })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Plymouth, PL4 7EG')).toBeInTheDocument()
  })

  it('does not show truncated description (removed per design)', () => {
    const longDesc = '<p>' + 'A'.repeat(100) + '</p>'
    const room = makeRoom({ room_description: longDesc })
    render(<RoomCard room={room} />)

    expect(screen.queryByText(/A{10,}/)).not.toBeInTheDocument()
  })

  it('shows Double pill for double rooms', () => {
    const room = makeRoom({ room_type: 'doubleRoom' })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Double')).toBeInTheDocument()
  })

  it('shows En-suite pill when en-suite is in amenities', () => {
    const room = makeRoom({ room_amenities: ['En-suite bathroom', 'Desk'] })
    render(<RoomCard room={room} />)

    expect(screen.getByText('En-suite')).toBeInTheDocument()
  })

  it('shows "Available from" prefix for future dates', () => {
    const room = makeRoom({ available_from: '2026-12-01' })
    render(<RoomCard room={room} />)

    expect(screen.getByText(/Available from/)).toBeInTheDocument()
  })
})

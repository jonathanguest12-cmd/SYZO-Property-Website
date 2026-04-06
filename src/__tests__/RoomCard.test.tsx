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

    expect(screen.getByText('64 Alexandra Road')).toBeInTheDocument()
    expect(screen.getByText('Plymouth')).toBeInTheDocument()
    expect(screen.getByText(/550/)).toBeInTheDocument()
    expect(screen.getByText('Double')).toBeInTheDocument()
    expect(screen.getByText('Bills Inc.')).toBeInTheDocument()
    expect(screen.getByText('Apply to Rent')).toBeInTheDocument()
  })

  it('shows "Available Now" for past dates', () => {
    const room = makeRoom({ available_from: '2024-01-01' })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Available Now')).toBeInTheDocument()
  })

  it('shows "Bills Extra" when bills not included', () => {
    const room = makeRoom({ bills_included: false })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Bills Extra')).toBeInTheDocument()
  })

  it('shows "Single" badge for single rooms', () => {
    const room = makeRoom({ room_type: 'singleRoom' })
    render(<RoomCard room={room} />)

    expect(screen.getByText('Single')).toBeInTheDocument()
  })

  it('shows placeholder when no photos', () => {
    const room = makeRoom({ photo_urls: [] })
    render(<RoomCard room={room} />)

    expect(screen.getByText('No photo')).toBeInTheDocument()
  })

  it('links to apply page', () => {
    const room = makeRoom({ id: 'test-uuid' })
    render(<RoomCard room={room} />)

    const link = screen.getByText('Apply to Rent')
    expect(link.closest('a')).toHaveAttribute('href', '/apply/test-uuid')
  })
})

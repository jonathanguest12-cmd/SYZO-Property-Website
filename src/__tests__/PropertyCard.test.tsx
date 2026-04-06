import { render, screen } from '@testing-library/react'
import PropertyCard from '@/components/PropertyCard'
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

describe('PropertyCard', () => {
  it('renders property details', () => {
    const rooms = [
      makeRoom({ id: 'r1', rent_pcm: 500 }),
      makeRoom({ id: 'r2', rent_pcm: 600 }),
    ]
    render(<PropertyCard propertyRef="PROP-1" rooms={rooms} />)

    expect(screen.getByText('64 Alexandra Road')).toBeInTheDocument()
    expect(screen.getByText('Plymouth')).toBeInTheDocument()
    expect(screen.getByText('2 rooms available')).toBeInTheDocument()
    expect(screen.getByText('View Property')).toBeInTheDocument()
  })

  it('shows price range', () => {
    const rooms = [
      makeRoom({ id: 'r1', rent_pcm: 450 }),
      makeRoom({ id: 'r2', rent_pcm: 600 }),
    ]
    render(<PropertyCard propertyRef="PROP-1" rooms={rooms} />)

    // Uses en-dash between prices
    expect(screen.getByText(/450/)).toBeInTheDocument()
    expect(screen.getByText(/600/)).toBeInTheDocument()
  })

  it('returns null for empty rooms', () => {
    const { container } = render(<PropertyCard propertyRef="PROP-1" rooms={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('links to property page', () => {
    const rooms = [makeRoom()]
    render(<PropertyCard propertyRef="PROP-1" rooms={rooms} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/property/PROP-1')
  })

  it('shows singular "room" for single room', () => {
    const rooms = [makeRoom()]
    render(<PropertyCard propertyRef="PROP-1" rooms={rooms} />)

    expect(screen.getByText('1 room available')).toBeInTheDocument()
  })
})

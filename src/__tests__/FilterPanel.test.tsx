import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterPanel from '@/components/FilterPanel'

describe('FilterPanel', () => {
  const defaultProps = {
    area: 'all' as const,
    onAreaChange: jest.fn(),
    priceRange: 'any' as const,
    onPriceRangeChange: jest.fn(),
    availabilityFilter: 'any' as const,
    onAvailabilityFilterChange: jest.fn(),
    sort: 'price_asc' as const,
    onSortChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all filter controls', () => {
    render(<FilterPanel {...defaultProps} />)

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Plymouth')).toBeInTheDocument()
    expect(screen.getByText('Newquay')).toBeInTheDocument()
    // Price pills
    expect(screen.getByText(/Under/)).toBeInTheDocument()
    expect(screen.getByText(/650\+/)).toBeInTheDocument()
    // Availability pills
    expect(screen.getByText('Available Now')).toBeInTheDocument()
    expect(screen.getByText('Within 1 month')).toBeInTheDocument()
  })

  it('calls onAreaChange when area pill clicked', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    await user.click(screen.getByText('Plymouth'))
    expect(defaultProps.onAreaChange).toHaveBeenCalledWith('plymouth')
  })

  it('calls onPriceRangeChange when price pill clicked', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    await user.click(screen.getByText(/Under/))
    expect(defaultProps.onPriceRangeChange).toHaveBeenCalledWith('under_450')
  })

  it('calls onAvailabilityFilterChange when availability pill clicked', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    await user.click(screen.getByText('Available Now'))
    expect(defaultProps.onAvailabilityFilterChange).toHaveBeenCalledWith('now')
  })

  it('calls onSortChange when sort changes', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    const select = screen.getByDisplayValue('Price: low to high')
    await user.selectOptions(select, 'price_desc')
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('price_desc')
  })
})

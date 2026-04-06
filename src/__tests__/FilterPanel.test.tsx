import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterPanel from '@/components/FilterPanel'

describe('FilterPanel', () => {
  const defaultProps = {
    area: 'all' as const,
    onAreaChange: jest.fn(),
    roomType: 'any' as const,
    onRoomTypeChange: jest.fn(),
    minPrice: '',
    onMinPriceChange: jest.fn(),
    maxPrice: '',
    onMaxPriceChange: jest.fn(),
    availableFrom: '',
    onAvailableFromChange: jest.fn(),
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
    expect(screen.getByText('Any')).toBeInTheDocument()
    expect(screen.getByText('Single')).toBeInTheDocument()
    expect(screen.getByText('Double')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument()
  })

  it('calls onAreaChange when area toggle clicked', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    await user.click(screen.getByText('Plymouth'))
    expect(defaultProps.onAreaChange).toHaveBeenCalledWith('plymouth')
  })

  it('calls onRoomTypeChange when room type toggle clicked', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    await user.click(screen.getByText('Double'))
    expect(defaultProps.onRoomTypeChange).toHaveBeenCalledWith('double')
  })

  it('calls onSortChange when sort changes', async () => {
    const user = userEvent.setup()
    render(<FilterPanel {...defaultProps} />)

    const select = screen.getByDisplayValue('Price: low to high')
    await user.selectOptions(select, 'price_desc')
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('price_desc')
  })
})

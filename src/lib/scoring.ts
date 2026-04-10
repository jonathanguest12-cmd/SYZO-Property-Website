/**
 * Tenant screening scoring logic.
 *
 * Pure function: takes the answers + room rent, returns a tier and reason.
 * Used by the API route — never imported by client code, never exposed to
 * the tenant. The tier (and red_reason) is for Verity only.
 */

export type IncomeBracket = 'under_low' | 'low' | 'medium' | 'high'

export interface ScreeningAnswers {
  whoMovingIn: string
  moveInTimeline: string
  employmentStatus: string
  monthlyIncome: IncomeBracket
  smokes: boolean
  hasPets: boolean
  lengthOfStay: string
  adverseCredit: boolean
  hasGuarantor: boolean | null
  rentPcm: number
}

export type Tier = 'green' | 'amber' | 'red'

export interface ScoreResult {
  score: number
  maxScore: number
  percentage: number
  tier: Tier
  redReason: string | null
  flags: string[]
}

export function scoreApplication(answers: ScreeningAnswers): ScoreResult {
  const flags: string[] = []
  let redReason: string | null = null

  // Hard disqualifiers — still save and still score, but force red.
  if (answers.smokes && answers.hasPets) redReason = 'smoker_and_pets'
  else if (answers.smokes) redReason = 'smoker'
  else if (answers.hasPets) redReason = 'pets'

  const moveInScore =
    answers.moveInTimeline === 'Within 4 weeks' ? 3
      : answers.moveInTimeline === '1\u20133 months' ? 2
      : 1

  const employmentScore =
    answers.employmentStatus === 'Employed' ? 3
      : answers.employmentStatus === 'Self-employed' ? 2
      : answers.employmentStatus === 'Student' ? 2
      : 1

  let incomeScore = 0
  if (answers.monthlyIncome === 'under_low') {
    incomeScore = 0
    flags.push('income_very_low')
  } else if (answers.monthlyIncome === 'low') {
    incomeScore = 1
    flags.push('income_low')
  } else if (answers.monthlyIncome === 'medium') {
    incomeScore = 2
  } else {
    incomeScore = 3
  }

  const stayScore =
    answers.lengthOfStay === '12+ months' ? 3
      : answers.lengthOfStay === '6\u201312 months' ? 2
      : 1
  if (answers.lengthOfStay === 'Under 6 months') flags.push('short_stay')

  const creditScore = answers.adverseCredit ? 1 : 3
  if (answers.adverseCredit) flags.push('adverse_credit')

  const guarantorBonus = answers.hasGuarantor === true ? 2 : 0

  if (answers.whoMovingIn === 'Me and family') flags.push('family')

  const maxScore = answers.hasGuarantor !== null ? 17 : 15
  const total =
    moveInScore + employmentScore + incomeScore + stayScore + creditScore + guarantorBonus
  const percentage = Math.round((total / maxScore) * 100)

  let tier: Tier
  if (redReason || percentage < 50) {
    tier = 'red'
  } else if (
    percentage < 75 ||
    flags.includes('income_very_low') ||
    flags.includes('income_low') ||
    flags.includes('short_stay') ||
    flags.includes('adverse_credit') ||
    flags.includes('family')
  ) {
    tier = 'amber'
  } else {
    tier = 'green'
  }

  return { score: total, maxScore, percentage, tier, redReason, flags }
}

/**
 * Compute the income bracket boundaries for a given rent, rounded to £50.
 * Returned values are the upper bound of `under_low`, `low`, and `medium`.
 * `high` has no upper bound.
 */
export function incomeBrackets(rentPcm: number): {
  underLowMax: number
  lowMax: number
  mediumMax: number
} {
  const round50 = (n: number) => Math.round(n / 50) * 50
  return {
    underLowMax: round50(rentPcm * 1.5),
    lowMax: round50(rentPcm * 2),
    mediumMax: round50(rentPcm * 2.5),
  }
}

/**
 * Tenant screening scoring logic.
 *
 * Pure function: takes the answers + room rent, returns a tier and reason.
 * Used by the API route — never imported by client code, never exposed to
 * the tenant. The tier (and red_reason) is for Verity only.
 */

export type IncomeBracket = 'under_low' | 'low' | 'medium' | 'high'

/**
 * Fixed annual gross income brackets, in £.
 * Display labels are derived from these constants — they are not
 * calculated from rent. Scoring values for each bracket are unchanged.
 */
export const INCOME_BRACKETS = {
  underLowMax: 20000, // Under £20,000
  lowMax: 28000,      // £20,000 – £28,000
  mediumMax: 40000,   // £28,000 – £40,000
  // high: £40,000 or more
} as const

export interface ScreeningAnswers {
  whoMovingIn: string
  moveInTimeline: string
  employmentStatus: string
  annualIncome: IncomeBracket
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
  incomeRiskMitigated: boolean
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
  if (answers.annualIncome === 'under_low') {
    incomeScore = 0
    flags.push('income_very_low')
  } else if (answers.annualIncome === 'low') {
    incomeScore = 1
    flags.push('income_low')
  } else if (answers.annualIncome === 'medium') {
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

  // Income risk is mitigated when an applicant with a low/very-low income
  // bracket also provides a UK guarantor. This clears the income amber floor
  // but does NOT clear adverse_credit, short_stay, or family flags.
  const incomeRiskMitigated =
    (flags.includes('income_very_low') || flags.includes('income_low')) &&
    answers.hasGuarantor === true

  let tier: Tier
  if (redReason) {
    // Hard disqualifier — always red.
    tier = 'red'
  } else if (percentage < 50) {
    // Score too weak regardless of flags.
    tier = 'red'
  } else if (
    flags.includes('short_stay') ||
    flags.includes('adverse_credit') ||
    flags.includes('family') ||
    (!incomeRiskMitigated &&
      (flags.includes('income_very_low') || flags.includes('income_low')))
  ) {
    // Amber-forcing flags:
    //  - short_stay     room may not suit (min tenancy concern)
    //  - adverse_credit always Verity review — guarantor does NOT clear this
    //  - family         HMO suitability — always Verity review
    //  - income flag without guarantor — affordability risk
    tier = 'amber'
  } else if (percentage >= 75) {
    tier = 'green'
  } else {
    // 50–74% with no amber-forcing flags.
    tier = 'amber'
  }

  return {
    score: total,
    maxScore,
    percentage,
    tier,
    redReason,
    flags,
    incomeRiskMitigated,
  }
}

'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { INCOME_BRACKETS, type IncomeBracket } from '@/lib/scoring'

interface ApplyClientProps {
  roomId: string
  roomName: string
  propertyName: string
  propertyRef: string
  rentPcm: number
  availableLabel: string
}

type Step =
  | 0  // welcome
  | 1  // who's moving in
  | 2  // move-in timeline
  | 3  // employment
  | 4  // income
  | 5  // smokes
  | 6  // pets
  | 7  // length of stay
  | 8  // adverse credit
  | 9  // guarantor (conditional)
  | 10 // contact details
  | 11 // submitting

type ResultTier = 'green' | 'amber' | 'red'

interface Answers {
  whoMovingIn: string | null
  moveInTimeline: string | null
  employmentStatus: string | null
  annualIncome: IncomeBracket | null
  smokes: boolean | null
  hasPets: boolean | null
  lengthOfStay: string | null
  adverseCredit: boolean | null
  hasGuarantor: boolean | null
}

const EMPTY_ANSWERS: Answers = {
  whoMovingIn: null,
  moveInTimeline: null,
  employmentStatus: null,
  annualIncome: null,
  smokes: null,
  hasPets: null,
  lengthOfStay: null,
  adverseCredit: null,
  hasGuarantor: null,
}

const TOTAL_QUESTIONS = 9

function stripHouseNumber(name: string): string {
  return name.replace(/^\d+[-\s]+/, '').trim()
}

function formatGBP(n: number): string {
  return `\u00a3${n.toLocaleString('en-GB')}`
}

// ---------------------------------------------------------------------------
// Human-readable display values for the review screen
// ---------------------------------------------------------------------------

const DISPLAY_VALUES: Record<string, string> = {
  'Just me': 'Just me',
  'Me and my partner': 'Me and my partner',
  'Me and family': 'Me and my family',
  'Within 4 weeks': 'Within 4 weeks',
  '1\u20133 months': '1\u20133 months',
  '3+ months': '3+ months',
  'Employed': 'Employed',
  'Self-employed': 'Self-employed',
  'Student': 'Student',
  'Unemployed': 'Unemployed',
  'under_low': `Under ${formatGBP(INCOME_BRACKETS.underLowMax)}`,
  'low': `${formatGBP(INCOME_BRACKETS.underLowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.lowMax)}`,
  'medium': `${formatGBP(INCOME_BRACKETS.lowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.mediumMax)}`,
  'high': `${formatGBP(INCOME_BRACKETS.mediumMax)}+`,
  '12+ months': '12+ months',
  '6\u201312 months': '6\u201312 months',
  'Under 6 months': 'Under 6 months',
}

function displayValue(raw: string | boolean | null): string {
  if (raw === null) return '\u2014'
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  return DISPLAY_VALUES[raw] || raw
}

export default function ApplyClient({
  roomId,
  roomName,
  propertyName,
  propertyRef,
  rentPcm,
  availableLabel,
}: ApplyClientProps) {
  const [step, setStep] = useState<Step>(0)
  const [history, setHistory] = useState<Step[]>([])
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [contact, setContact] = useState({ fullName: '', email: '', phone: '' })
  const [contactError, setContactError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultTier | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // Green flash state
  const [flashingAnswer, setFlashingAnswer] = useState<string | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Review screen state
  const [showReview, setShowReview] = useState(false)
  const returnToReviewRef = useRef(false)

  const cleanProperty = stripHouseNumber(propertyName)

  // ----- navigation helpers -----

  function goTo(next: Step) {
    setHistory((h) => [...h, step])
    setStep(next)
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setStep(prev)
      return h.slice(0, -1)
    })
  }

  // Flash an answer green, then advance after animation completes.
  const flashAndAdvance = useCallback(
    (value: string, advanceFn: () => void) => {
      // Cancel any pending flash
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
      setFlashingAnswer(value)
      flashTimeoutRef.current = setTimeout(() => {
        setFlashingAnswer(null)
        // If we came from the review screen, return there
        if (returnToReviewRef.current) {
          returnToReviewRef.current = false
          setShowReview(true)
        } else {
          advanceFn()
        }
      }, 650)
    },
    []
  )

  // ----- answer setters with flash + auto-advance + skip logic -----

  function answerWhoMovingIn(value: string) {
    setAnswers((a) => ({ ...a, whoMovingIn: value }))
    flashAndAdvance(value, () => goTo(2))
  }

  function answerMoveIn(value: string) {
    setAnswers((a) => ({ ...a, moveInTimeline: value }))
    flashAndAdvance(value, () => goTo(3))
  }

  function answerEmployment(value: string) {
    setAnswers((a) => ({ ...a, employmentStatus: value }))
    flashAndAdvance(value, () => goTo(4))
  }

  function answerIncome(value: IncomeBracket) {
    setAnswers((a) => ({ ...a, annualIncome: value, hasGuarantor: null }))
    flashAndAdvance(value, () => goTo(5))
  }

  function answerSmokes(value: boolean) {
    setAnswers((a) => ({
      ...a,
      smokes: value,
      // Clear downstream answers when gateway changes
      hasPets: value ? null : a.hasPets,
      lengthOfStay: value ? null : a.lengthOfStay,
      adverseCredit: value ? null : a.adverseCredit,
      hasGuarantor: value ? null : a.hasGuarantor,
    }))
    flashAndAdvance(value ? 'yes' : 'no', () => goTo(value ? 10 : 6))
  }

  function answerPets(value: boolean) {
    setAnswers((a) => ({
      ...a,
      hasPets: value,
      lengthOfStay: value ? null : a.lengthOfStay,
      adverseCredit: value ? null : a.adverseCredit,
      hasGuarantor: value ? null : a.hasGuarantor,
    }))
    flashAndAdvance(value ? 'yes' : 'no', () => goTo(value ? 10 : 7))
  }

  function answerLengthOfStay(value: string) {
    setAnswers((a) => ({ ...a, lengthOfStay: value }))
    flashAndAdvance(value, () => goTo(8))
  }

  function answerAdverseCredit(value: boolean) {
    setAnswers((a) => ({ ...a, adverseCredit: value, hasGuarantor: null }))
    const incomeFlagged =
      answers.annualIncome === 'under_low' || answers.annualIncome === 'low'
    flashAndAdvance(value ? 'yes' : 'no', () => goTo(incomeFlagged ? 9 : 10))
  }

  function answerGuarantor(value: boolean) {
    setAnswers((a) => ({ ...a, hasGuarantor: value }))
    flashAndAdvance(value ? 'yes' : 'no', () => goTo(10))
  }

  // ----- review helpers -----

  function editFromReview(targetStep: Step) {
    returnToReviewRef.current = true
    setShowReview(false)
    setStep(targetStep)
    setHistory([])
  }

  // Override goBack when editing from review — return to review screen
  const originalGoBack = goBack
  function goBackOrReview() {
    if (returnToReviewRef.current) {
      returnToReviewRef.current = false
      setShowReview(true)
    } else {
      originalGoBack()
    }
  }

  // Check if all required answers are filled (accounts for gateway skips).
  function isReviewComplete(): boolean {
    if (!answers.whoMovingIn || !answers.moveInTimeline || !answers.employmentStatus || !answers.annualIncome) return false
    if (answers.smokes === null) return false
    if (answers.smokes) return true // smokes=yes skips everything else
    if (answers.hasPets === null) return false
    if (answers.hasPets) return true // pets=yes skips stay/credit/guarantor
    if (!answers.lengthOfStay || answers.adverseCredit === null) return false
    const incomeFlagged = answers.annualIncome === 'under_low' || answers.annualIncome === 'low'
    if (incomeFlagged && answers.hasGuarantor === null) return false
    return true
  }

  // ----- submission -----

  function validateContact(): string | null {
    if (!contact.fullName.trim()) return 'Please enter your full name.'
    if (!contact.email.trim()) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      return 'Please enter a valid email address.'
    }
    if (!contact.phone.trim()) return 'Please enter your phone number.'
    return null
  }

  function handleContactSubmit() {
    const err = validateContact()
    if (err) {
      setContactError(err)
      return
    }
    setContactError(null)
    setShowReview(true)
  }

  async function handleSubmit() {
    setSubmitError(null)
    setShowReview(false)
    setStep(11)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          roomName,
          propertyName,
          propertyRef,
          rentPcm,
          contact: {
            fullName: contact.fullName.trim(),
            email: contact.email.trim(),
            phone: contact.phone.trim(),
          },
          answers: {
            whoMovingIn: answers.whoMovingIn,
            moveInTimeline: answers.moveInTimeline,
            employmentStatus: answers.employmentStatus,
            annualIncome: answers.annualIncome,
            smokes: answers.smokes ?? false,
            hasPets: answers.hasPets ?? false,
            lengthOfStay: answers.lengthOfStay ?? '12+ months',
            adverseCredit: answers.adverseCredit ?? false,
            hasGuarantor: answers.hasGuarantor,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data?.error || 'Submission failed. Please try again.')
        setShowReview(true)
        return
      }

      const data = await res.json()
      if (data?.tier === 'green' || data?.tier === 'amber' || data?.tier === 'red') {
        if (typeof data.applicationId === 'string') {
          setApplicationId(data.applicationId)
        }
        setResult(data.tier)
      } else {
        setSubmitError('Unexpected response. Please try again.')
        setShowReview(true)
      }
    } catch {
      setSubmitError('Submission failed. Please try again.')
      setShowReview(true)
    }
  }

  // ----- result page short-circuit -----

  if (result) {
    return <ResultView tier={result} roomId={roomId} applicationId={applicationId} />
  }

  // ----- review screen -----

  if (showReview) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <RoomBadge
          roomName={roomName}
          cleanProperty={cleanProperty}
          rentPcm={rentPcm}
          availableLabel={availableLabel}
        />

        <div
          className="rounded-2xl bg-white p-6 sm:p-8 border"
          style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <h2
            className="text-xl font-semibold tracking-tight md:text-2xl text-center mb-6"
            style={{ color: '#2D3038' }}
          >
            Review your answers
          </h2>

          <div className="flex flex-col">
            <ReviewRow label="Who's moving in?" value={displayValue(answers.whoMovingIn)} onEdit={() => editFromReview(1)} />
            <ReviewRow label="Move-in timeline" value={displayValue(answers.moveInTimeline)} onEdit={() => editFromReview(2)} />
            <ReviewRow label="Employment status" value={displayValue(answers.employmentStatus)} onEdit={() => editFromReview(3)} />
            <ReviewRow label="Annual income" value={displayValue(answers.annualIncome)} onEdit={() => editFromReview(4)} />
            <ReviewRow label="Do you smoke?" value={displayValue(answers.smokes)} onEdit={() => editFromReview(5)} />
            {answers.smokes === false && (
              <ReviewRow label="Do you have pets?" value={displayValue(answers.hasPets)} onEdit={() => editFromReview(6)} />
            )}
            {answers.smokes === false && answers.hasPets === false && (
              <>
                <ReviewRow label="Length of stay" value={displayValue(answers.lengthOfStay)} onEdit={() => editFromReview(7)} />
                <ReviewRow label="Any adverse credit history?" value={displayValue(answers.adverseCredit)} onEdit={() => editFromReview(8)} last={answers.hasGuarantor === null} />
              </>
            )}
            {answers.hasGuarantor !== null && (
              <ReviewRow label="Can you provide a guarantor?" value={displayValue(answers.hasGuarantor)} onEdit={() => editFromReview(9)} last />
            )}
          </div>

          <div
            className="mt-6 rounded-xl border p-4 relative"
            style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
          >
            <button
              type="button"
              onClick={() => { setShowReview(false); setStep(10) }}
              className="absolute top-4 right-4 transition-colors duration-150 cursor-pointer"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#4B5563' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
              aria-label="Edit contact details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <p
              className="text-xs font-semibold uppercase tracking-[0.08em] mb-2"
              style={{ color: '#9CA3AF' }}
            >
              Your details
            </p>
            <p className="text-sm font-medium" style={{ color: '#2D3038' }}>
              {contact.fullName}
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {contact.email}
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {contact.phone}
            </p>
          </div>

          {!isReviewComplete() && (
            <p className="mt-4 text-sm text-center" style={{ color: '#D97706' }}>
              Please complete all questions before submitting.
            </p>
          )}

          {submitError && (
            <p className="mt-4 text-sm text-center" style={{ color: '#B91C1C' }}>
              {submitError}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isReviewComplete()}
            className="mt-8 w-full inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#2D3038' }}
          >
            Submit Application
          </button>
        </div>
      </div>
    )
  }

  // ----- shared layout chrome -----

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <RoomBadge
        roomName={roomName}
        cleanProperty={cleanProperty}
        rentPcm={rentPcm}
        availableLabel={availableLabel}
      />

      <div
        className="rounded-2xl bg-white p-6 sm:p-8 border"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {step === 0 && <Welcome onStart={() => goTo(1)} roomId={roomId} />}

        {step >= 1 && step <= 9 && (
          <QuestionFrame
            questionNumber={step}
            totalQuestions={TOTAL_QUESTIONS}
            onBack={goBackOrReview}
          >
            {step === 1 && (
              <Question
                heading="Who's moving in?"
                options={['Just me', 'Me and my partner', 'Me and family']}
                onSelect={answerWhoMovingIn}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 2 && (
              <Question
                heading="When are you looking to move in?"
                options={['Within 4 weeks', '1\u20133 months', '3+ months']}
                onSelect={answerMoveIn}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 3 && (
              <Question
                heading="What's your employment status?"
                options={['Employed', 'Self-employed', 'Student', 'Unemployed']}
                onSelect={answerEmployment}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 4 && (
              <Question
                heading="What's your annual income before tax?"
                subheading="Include all sources — salary, self-employment, or benefits."
                options={[
                  { label: `Under ${formatGBP(INCOME_BRACKETS.underLowMax)}`, value: 'under_low' },
                  { label: `${formatGBP(INCOME_BRACKETS.underLowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.lowMax)}`, value: 'low' },
                  { label: `${formatGBP(INCOME_BRACKETS.lowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.mediumMax)}`, value: 'medium' },
                  { label: `${formatGBP(INCOME_BRACKETS.mediumMax)} or more`, value: 'high' },
                ]}
                onSelect={(v) => answerIncome(v as IncomeBracket)}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 5 && (
              <Question
                heading="Do you smoke?"
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' },
                ]}
                onSelect={(v) => answerSmokes(v === 'yes')}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 6 && (
              <Question
                heading="Do you have any pets?"
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' },
                ]}
                onSelect={(v) => answerPets(v === 'yes')}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 7 && (
              <Question
                heading="How long are you looking to stay?"
                options={['12+ months', '6\u201312 months', 'Under 6 months']}
                onSelect={answerLengthOfStay}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 8 && (
              <Question
                heading="Any adverse credit history?"
                subheading="CCJs, bankruptcy, IVAs"
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Yes', value: 'yes' },
                ]}
                onSelect={(v) => answerAdverseCredit(v === 'yes')}
                flashingAnswer={flashingAnswer}
              />
            )}
            {step === 9 && (
              <Question
                heading="Can you provide a UK-based guarantor?"
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
                onSelect={(v) => answerGuarantor(v === 'yes')}
                flashingAnswer={flashingAnswer}
              />
            )}
          </QuestionFrame>
        )}

        {step === 10 && (
          <ContactForm
            contact={contact}
            onChange={setContact}
            onSubmit={handleContactSubmit}
            onBack={goBackOrReview}
            error={contactError || submitError}
          />
        )}

        {step === 11 && <Submitting />}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function ReviewRow({
  label,
  value,
  onEdit,
  last = false,
}: {
  label: string
  value: string
  onEdit: () => void
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b'}`}
      style={{ borderColor: '#F3F4F6' }}
    >
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 transition-colors duration-150 cursor-pointer"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#4B5563' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
        aria-label={`Edit ${label}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <span className="text-sm flex-1 min-w-0" style={{ color: '#6B7280' }}>
        {label}
      </span>
      <span className="text-sm font-medium text-right shrink-0" style={{ color: '#1C1C1A' }}>
        {value}
      </span>
    </div>
  )
}

function RoomBadge({
  roomName,
  cleanProperty,
  rentPcm,
  availableLabel,
}: {
  roomName: string
  cleanProperty: string
  rentPcm: number
  availableLabel: string
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 mb-6"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#2D3038' }}>
          {roomName}
        </p>
        <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
          {cleanProperty} &middot; {availableLabel}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold tabular-nums" style={{ color: '#2D3038' }}>
          &pound;{Math.round(rentPcm)}
        </p>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          /month
        </p>
      </div>
    </div>
  )
}

function Welcome({ onStart, roomId }: { onStart: () => void; roomId: string }) {
  return (
    <div className="text-center py-4">
      <h1
        className="text-2xl font-bold tracking-tight md:text-3xl"
        style={{ color: '#2D3038' }}
      >
        Apply to Rent
      </h1>
      <p className="mt-4 text-base leading-relaxed" style={{ color: '#6B7280' }}>
        This short screening helps us match you with the right room.
        It takes around 2 minutes.
      </p>
      <p className="mt-6 text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
        Your information is handled in accordance with our Privacy Policy.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full sm:w-auto inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: '#2D3038' }}
      >
        Start Application
      </button>
      <div className="mt-6">
        <Link
          href={`/room/${roomId}`}
          className="text-sm font-medium transition-colors duration-200 hover:opacity-70"
          style={{ color: '#9CA3AF' }}
        >
          &larr; Back to room
        </Link>
      </div>
    </div>
  )
}

function QuestionFrame({
  questionNumber,
  totalQuestions,
  onBack,
  children,
}: {
  questionNumber: number
  totalQuestions: number
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70 cursor-pointer"
        style={{ color: '#9CA3AF' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div
        className="w-full h-1 rounded-full mb-3"
        style={{ background: '#E5E7EB' }}
      >
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{
            background: '#2D3038',
            width: `${(questionNumber / totalQuestions) * 100}%`,
          }}
        />
      </div>
      <p className="text-xs mb-6 text-center" style={{ color: '#9CA3AF' }}>
        Question {questionNumber} of {totalQuestions}
      </p>

      {children}
    </div>
  )
}

interface QuestionOption {
  label: string
  value: string
}

function Question({
  heading,
  subheading,
  options,
  onSelect,
  flashingAnswer,
}: {
  heading: string
  subheading?: string
  options: Array<string | QuestionOption>
  onSelect: (value: string) => void
  flashingAnswer: string | null
}) {
  const normalised: QuestionOption[] = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o
  )

  return (
    <div>
      <h2
        className="text-xl font-semibold tracking-tight md:text-2xl text-center"
        style={{ color: '#2D3038' }}
      >
        {heading}
      </h2>
      {subheading && (
        <p className="mt-2 text-sm text-center" style={{ color: '#9CA3AF' }}>
          {subheading}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {normalised.map((opt) => {
          const isFlashing = flashingAnswer === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              disabled={flashingAnswer !== null}
              className={`w-full rounded-full border px-6 py-4 text-base font-medium text-left transition-all duration-150 hover:border-current hover:shadow-sm cursor-pointer ${
                isFlashing ? 'flash-green' : ''
              }`}
              style={{
                borderColor: isFlashing ? '#4ADE80' : '#E5E7EB',
                color: '#2D3038',
                backgroundColor: '#FFFFFF',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ContactForm({
  contact,
  onChange,
  onSubmit,
  onBack,
  error,
}: {
  contact: { fullName: string; email: string; phone: string }
  onChange: (next: { fullName: string; email: string; phone: string }) => void
  onSubmit: () => void
  onBack: () => void
  error: string | null
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70 cursor-pointer"
        style={{ color: '#9CA3AF' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h2
        className="text-2xl font-semibold tracking-tight md:text-3xl text-center"
        style={{ color: '#2D3038' }}
      >
        Almost done
      </h2>
      <p className="mt-2 text-sm text-center" style={{ color: '#6B7280' }}>
        Just a few details so we can be in touch.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Field
          label="Full name"
          id="fullName"
          type="text"
          autoComplete="name"
          value={contact.fullName}
          onChange={(v) => onChange({ ...contact, fullName: v })}
        />
        <Field
          label="Email address"
          id="email"
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(v) => onChange({ ...contact, email: v })}
        />
        <Field
          label="Phone number"
          id="phone"
          type="tel"
          autoComplete="tel"
          value={contact.phone}
          onChange={(v) => onChange({ ...contact, phone: v })}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-center" style={{ color: '#B91C1C' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-8 w-full inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: '#2D3038' }}
      >
        Continue
      </button>
    </form>
  )
}

function Field({
  label,
  id,
  type,
  autoComplete,
  value,
  onChange,
}: {
  label: string
  id: string
  type: string
  autoComplete: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label htmlFor={id} className="block">
      <span
        className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
        style={{ color: '#6B7280' }}
      >
        {label}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors duration-150 focus:border-current"
        style={{ borderColor: '#E5E7EB', color: '#2D3038' }}
      />
    </label>
  )
}

function Submitting() {
  return (
    <div className="py-12 text-center">
      <div className="inline-block animate-spin rounded-full border-2 border-t-transparent" style={{ width: 32, height: 32, borderColor: '#2D3038', borderTopColor: 'transparent' }} />
      <p className="mt-4 text-sm" style={{ color: '#6B7280' }}>
        Submitting your application&hellip;
      </p>
    </div>
  )
}

function ResultView({
  tier,
  roomId,
  applicationId,
}: {
  tier: ResultTier
  roomId: string
  applicationId: string | null
}) {
  if (tier === 'green') {
    return (
      <ResultLayout
        icon={
          <div
            className="mx-auto flex items-center justify-center rounded-full"
            style={{ width: 72, height: 72, backgroundColor: '#DCFCE7' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        }
        heading="Great news."
        body="You're a strong fit for this room. Book a viewing slot below to secure your place."
        primaryCta={
          applicationId
            ? { label: 'Book a Viewing', href: `/book-viewing/${applicationId}` }
            : { label: 'Back to room', href: `/room/${roomId}` }
        }
        secondaryCta={
          applicationId
            ? { label: 'Back to room', href: `/room/${roomId}` }
            : undefined
        }
      />
    )
  }

  if (tier === 'amber') {
    return (
      <ResultLayout
        icon={<NeutralCircle />}
        heading="Thanks for applying."
        body="Thanks for applying. We'll review your application within 2 working days and be in touch."
        primaryCta={{ label: 'Back to room', href: `/room/${roomId}` }}
      />
    )
  }

  return (
    <ResultLayout
      icon={<NeutralCircle />}
      heading="Thanks for applying."
      body="Thanks for applying. Unfortunately we're unable to proceed with your application at this time."
      primaryCta={{ label: 'Browse other rooms', href: '/' }}
    />
  )
}

interface CtaSpec {
  label: string
  href: string
}

function ResultLayout({
  icon,
  heading,
  body,
  primaryCta,
  secondaryCta,
}: {
  icon: React.ReactNode
  heading: string
  body: string
  primaryCta: CtaSpec
  secondaryCta?: CtaSpec
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <div
        className="rounded-2xl bg-white p-8 sm:p-12 border text-center"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {icon}
        <h1
          className="mt-6 text-2xl font-bold tracking-tight md:text-3xl"
          style={{ color: '#2D3038' }}
        >
          {heading}
        </h1>
        <p
          className="mt-4 text-base leading-relaxed mx-auto max-w-md"
          style={{ color: '#6B7280' }}
        >
          {body}
        </p>
        <Link
          href={primaryCta.href}
          className="mt-8 inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
          style={{ backgroundColor: '#2D3038' }}
        >
          {primaryCta.label}
        </Link>
        {secondaryCta && (
          <div className="mt-4">
            <Link
              href={secondaryCta.href}
              className="text-sm font-medium transition-colors duration-200 hover:opacity-70"
              style={{ color: '#9CA3AF' }}
            >
              {secondaryCta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function NeutralCircle() {
  return (
    <div
      className="mx-auto flex items-center justify-center rounded-full"
      style={{ width: 72, height: 72, backgroundColor: '#F3F4F6' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    </div>
  )
}

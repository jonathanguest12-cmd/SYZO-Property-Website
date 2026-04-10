'use client'

import { useState } from 'react'
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

  // ----- answer setters with auto-advance + skip logic -----

  function answerWhoMovingIn(value: string) {
    setAnswers((a) => ({ ...a, whoMovingIn: value }))
    goTo(2)
  }

  function answerMoveIn(value: string) {
    setAnswers((a) => ({ ...a, moveInTimeline: value }))
    goTo(3)
  }

  function answerEmployment(value: string) {
    setAnswers((a) => ({ ...a, employmentStatus: value }))
    goTo(4)
  }

  function answerIncome(value: IncomeBracket) {
    setAnswers((a) => ({ ...a, annualIncome: value }))
    goTo(5)
  }

  function answerSmokes(value: boolean) {
    setAnswers((a) => ({ ...a, smokes: value }))
    // Smokes=yes is a hard disqualifier — skip remaining screening, collect contact, save.
    goTo(value ? 10 : 6)
  }

  function answerPets(value: boolean) {
    setAnswers((a) => ({ ...a, hasPets: value }))
    goTo(value ? 10 : 7)
  }

  function answerLengthOfStay(value: string) {
    setAnswers((a) => ({ ...a, lengthOfStay: value }))
    goTo(8)
  }

  function answerAdverseCredit(value: boolean) {
    setAnswers((a) => ({ ...a, adverseCredit: value }))
    // Conditional: guarantor question only shown for low income brackets.
    // hasGuarantor stays null otherwise → scoring uses 15-pt max.
    const incomeFlagged =
      answers.annualIncome === 'under_low' || answers.annualIncome === 'low'
    goTo(incomeFlagged ? 9 : 10)
  }

  function answerGuarantor(value: boolean) {
    setAnswers((a) => ({ ...a, hasGuarantor: value }))
    goTo(10)
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

  async function handleSubmit() {
    const err = validateContact()
    if (err) {
      setContactError(err)
      return
    }
    setContactError(null)
    setSubmitError(null)
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
            // Coerce nullable booleans to false for the API contract — at this
            // point in the flow we either asked the question or short-circuited.
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
        setStep(10)
        return
      }

      const data = await res.json()
      if (data?.tier === 'green' || data?.tier === 'amber' || data?.tier === 'red') {
        setResult(data.tier)
      } else {
        setSubmitError('Unexpected response. Please try again.')
        setStep(10)
      }
    } catch {
      setSubmitError('Submission failed. Please try again.')
      setStep(10)
    }
  }

  // ----- result page short-circuit -----

  if (result) {
    return <ResultView tier={result} roomId={roomId} />
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
            onBack={goBack}
          >
            {step === 1 && (
              <Question
                heading="Who’s moving in?"
                options={['Just me', 'Me and my partner', 'Me and family']}
                onSelect={answerWhoMovingIn}
              />
            )}
            {step === 2 && (
              <Question
                heading="When are you looking to move in?"
                options={['Within 4 weeks', '1\u20133 months', '3+ months']}
                onSelect={answerMoveIn}
              />
            )}
            {step === 3 && (
              <Question
                heading="What’s your employment status?"
                options={['Employed', 'Self-employed', 'Student', 'Unemployed']}
                onSelect={answerEmployment}
              />
            )}
            {step === 4 && (
              <Question
                heading="What’s your annual income before tax?"
                subheading="Include all sources — salary, self-employment, or benefits."
                options={[
                  { label: `Under ${formatGBP(INCOME_BRACKETS.underLowMax)}`, value: 'under_low' },
                  { label: `${formatGBP(INCOME_BRACKETS.underLowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.lowMax)}`, value: 'low' },
                  { label: `${formatGBP(INCOME_BRACKETS.lowMax)} \u2013 ${formatGBP(INCOME_BRACKETS.mediumMax)}`, value: 'medium' },
                  { label: `${formatGBP(INCOME_BRACKETS.mediumMax)} or more`, value: 'high' },
                ]}
                onSelect={(v) => answerIncome(v as IncomeBracket)}
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
              />
            )}
            {step === 7 && (
              <Question
                heading="How long are you looking to stay?"
                options={['12+ months', '6\u201312 months', 'Under 6 months']}
                onSelect={answerLengthOfStay}
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
              />
            )}
          </QuestionFrame>
        )}

        {step === 10 && (
          <ContactForm
            contact={contact}
            onChange={setContact}
            onSubmit={handleSubmit}
            onBack={goBack}
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
        className="mt-8 w-full sm:w-auto inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
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
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70"
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
}: {
  heading: string
  subheading?: string
  options: Array<string | QuestionOption>
  onSelect: (value: string) => void
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
        {normalised.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className="w-full rounded-full border px-6 py-4 text-base font-medium text-left transition-all duration-150 hover:border-current hover:shadow-sm"
            style={{
              borderColor: '#E5E7EB',
              color: '#2D3038',
              backgroundColor: '#FFFFFF',
            }}
          >
            {opt.label}
          </button>
        ))}
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
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70"
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
        className="mt-8 w-full inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
        style={{ backgroundColor: '#2D3038' }}
      >
        Submit Application
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

function ResultView({ tier, roomId }: { tier: ResultTier; roomId: string }) {
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
        body="You’re a strong fit for this room. We’ll be in touch within 24 hours to arrange a viewing — keep an eye on your email."
        ctaLabel="Back to room"
        ctaHref={`/room/${roomId}`}
      />
    )
  }

  if (tier === 'amber') {
    return (
      <ResultLayout
        icon={<NeutralCircle />}
        heading="Thanks for applying."
        body="We’re reviewing your application and will be in touch within 2 working days."
        ctaLabel="Back to room"
        ctaHref={`/room/${roomId}`}
      />
    )
  }

  return (
    <ResultLayout
      icon={<NeutralCircle />}
      heading="Thanks for applying."
      body="Unfortunately we’re unable to proceed with your application for this room at this time. We wish you the best with your search."
      ctaLabel="Browse other rooms"
      ctaHref="/"
    />
  )
}

function ResultLayout({
  icon,
  heading,
  body,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode
  heading: string
  body: string
  ctaLabel: string
  ctaHref: string
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
          href={ctaHref}
          className="mt-8 inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
          style={{ backgroundColor: '#2D3038' }}
        >
          {ctaLabel}
        </Link>
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

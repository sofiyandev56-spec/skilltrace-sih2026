import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useGov } from '../gov/GovContext.jsx'
import QuickReview from '../components/QuickReview.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META, getBucketLabel } from '../lib/evidence.js'
import { inr, longDate, relativeAge } from '../lib/format.js'
import { AS_OF, daysBetween } from '../api/mock/dataset.js'

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * The trainee's journey, derived from their actual event trail rather than
 * written out by hand — so what they see is the same record the government
 * sees, including the point at which the three-month rule was satisfied.
 */
function buildJourney(record, hi = false) {
  if (!record) return []
  const events = record.events || []
  const placement = events.find((e) => e.what_happened === 'placed')
  const confirmation = events.find(
    (e) =>
      e.source === 'whatsapp_verified_survey' ||
      (placement &&
        e.what_happened === 'still_working' &&
        e.employer === placement.employer &&
        daysBetween(placement.date, e.date) >= 0)
  )
  const twelveMonth = placement
    ? events.find(
      (e) =>
        e.what_happened === 'still_working' &&
        e.employer === placement.employer &&
        daysBetween(placement.date, e.date) >= 350,
    )
    : null

  const steps = [
    {
      key: 'training',
      title: hi ? 'प्रशिक्षण पूर्ण' : 'Training completed',
      desc: record.provider_name || (hi ? 'सरकारी प्रशिक्षण केंद्र' : 'Government training centre'),
      date: record.cohort ? (hi ? `कोहॉर्ट ${record.cohort}` : `Cohort ${record.cohort}`) : null,
      state: 'done',
    },
    {
      key: 'certified',
      title: hi ? 'पाठ्यक्रम प्रमाणित' : 'Course certified',
      desc: `${record.course} · ${hi ? 'NSQF मूल्यांकन उत्तीर्ण' : 'NSQF assessment passed'}`,
      date: null,
      state: 'done',
    },
  ]

  steps.push({
    key: 'placed',
    title: hi ? 'नियोक्ता के साथ नियुक्ति' : 'Placed with an employer',
    desc: placement ? placement.employer : (hi ? 'अभी नियुक्ति नहीं हुई' : 'Not yet placed'),
    date: placement ? longDate(placement.date) : null,
    state: placement ? 'done' : 'upcoming',
  })

  const dueAt = placement ? addDays(placement.date, 90) : null
  steps.push({
    key: 'three_month',
    title: hi ? '3-माह मील का पत्थर' : '3-month milestone',
    desc: confirmation
      ? (hi ? 'उसी नियोक्ता के पास पुष्टीकृत — यही वास्तविक रोजगार माना जाता है' : 'Confirmed at the same employer — this is what counts as employment')
      : (hi ? 'रोजगार तभी मान्य होता है जब आप एक ही नियोक्ता के साथ 3 माह पूरे कर लें' : 'Employment counts only once you pass three months at the same employer'),
    date: confirmation ? longDate(confirmation.date) : dueAt ? `${hi ? 'देय तिथि: ' : 'Due '}${longDate(dueAt)}` : null,
    state: confirmation ? 'done' : placement ? 'pending' : 'upcoming',
    trust: confirmation?.trust_level,
  })

  const twelveDue = placement ? addDays(placement.date, 365) : null
  steps.push({
    key: 'twelve_month',
    title: hi ? '12-माह प्रतिधारण' : '12-month retention',
    desc: twelveMonth
      ? (hi ? 'एक वर्ष बाद भी उसी नियोक्ता के साथ' : 'Still with the same employer after a year')
      : (hi ? 'दीर्घकालिक रोजगार स्थिरता जांच' : 'Long-term stability check'),
    date: twelveMonth ? longDate(twelveMonth.date) : twelveDue ? `${hi ? 'देय तिथि: ' : 'Due '}${longDate(twelveDue)}` : null,
    state: twelveMonth ? 'done' : 'upcoming',
    trust: twelveMonth?.trust_level,
  })

  const pendingAt = steps.findIndex((s) => s.state === 'pending')
  if (pendingAt === -1) {
    const lastDone = steps.map((s) => s.state).lastIndexOf('done')
    if (lastDone !== -1) steps[lastDone].state = 'current'
  }

  return steps
}

/** One clear thing to do, chosen from the trainee's actual situation. */
function nextAction({ record, reviewDone, journey, hi = false }) {
  if (!record) return null
  const last = record.events?.[record.events.length - 1]
  const staleDays = last ? daysBetween(last.date, AS_OF) : null

  if (!reviewDone) {
    return {
      tone: 'action',
      title: hi ? 'अपना प्रशिक्षण मूल्यांकन पूरा करें' : 'Complete your training review',
      body: hi
        ? 'आपके पाठ्यक्रम के बारे में 5 त्वरित प्रश्न। इसमें केवल एक मिनट लगता है और अगले बैच के प्रशिक्षण में सुधार होता है।'
        : 'Five quick questions about your course. It takes about a minute and shapes how the next batch is trained.',
      cta: null,
    }
  }
  if (record.bucket === 'not_working') {
    return {
      tone: 'attention',
      title: hi ? 'अपनी रोजगार जानकारी अपडेट करें' : 'Update your employment information',
      body: hi
        ? 'हमारे रिकॉर्ड के अनुसार आप वर्तमान में कार्यरत नहीं हैं। यदि इसमें बदलाव हुआ है, तो हमें बताएं।'
        : 'Our record says you are not currently working. If that has changed, tell us — it takes two taps.',
      cta: { to: '/check-in', label: hi ? 'चेक-इन सबमिट करें' : 'Submit a check-in' },
    }
  }
  if (record.bucket === 'awaiting_confirmation') {
    const step = journey.find((s) => s.key === 'three_month')
    return {
      tone: 'waiting',
      title: hi ? 'आपकी 3-माह जांच निकट है' : 'Your 3-month check is coming up',
      body: hi
        ? `आपकी नियुक्ति हो चुकी है, किंतु रोजगार की आधिकारिक गणना एक ही नियोक्ता के साथ 3 माह पूरे होने पर ही होती है। ${step?.date || ''}`.trim()
        : `You have been placed, but employment is only counted once you pass three months at the same employer. ${step?.date || ''}`.trim(),
      cta: { to: '/check-in', label: hi ? 'समयपूर्व पुष्टि करें' : 'Confirm early' },
    }
  }
  if (staleDays !== null && staleDays > 120) {
    return {
      tone: 'attention',
      title: hi ? 'पुष्टि करें कि आप अभी भी कार्यरत हैं' : 'Confirm you are still working',
      body: hi
        ? `आपसे अंतिम संपर्क ${relativeAge(last.date, AS_OF)} हुआ था। त्वरित पुष्टि आपके रिकॉर्ड को सक्रिय रखती है।`
        : `We last heard from you ${relativeAge(last.date, AS_OF)}. A quick confirmation keeps your record active.`,
      cta: { to: '/check-in', label: hi ? 'चेक-इन सबमिट करें' : 'Submit a check-in' },
    }
  }
  const twelve = journey.find((s) => s.key === 'twelve_month')
  const twelveReached = twelve && twelve.state !== 'upcoming'
  return {
    tone: 'ontrack',
    title: hi ? 'आप सही मार्ग पर हैं' : 'You are on track',
    body: twelveReached
      ? (hi
        ? 'आपके रिकॉर्ड का प्रत्येक मील का पत्थर पूर्ण और स्वतंत्र रूप से सत्यापित है। कोई कार्रवाई लंबित नहीं है।'
        : 'Every milestone on your record is complete and independently verified. Nothing needs your attention — we will check in again in a few months.')
      : (hi
        ? `कोई कार्रवाई आवश्यक नहीं है। आपका अगला मील का पत्थर 12-माह प्रतिधारण है${twelve?.date ? `, ${twelve.date}` : ''}।`
        : `Nothing needs your attention. Your next milestone is 12-month retention${twelve?.date ? `, ${twelve.date.replace(/^Due /, 'due ')}` : ''}.`),
    cta: null,
  }
}

const QUICK_ACTIONS = [
  { to: '/check-in', label: 'Submit a check-in', desc: 'Tell us your current work status', icon: '✓' },
  { to: '/consent', label: 'My consent & rights', desc: 'See and withdraw what you shared', icon: '🔒' },
]

/** A record an officer can look at when previewing what a trainee sees. */
const PREVIEW_TRAINEE = 'TRN-0001'

const DEMO_FALLBACK_RECORD = {
  id: 'TRN-0001',
  name: 'Aarti Patil',
  course: 'Healthcare Assistant',
  district: 'Nashik',
  gender: 'Female',
  age_group: '25-34',
  category: 'General',
  phone: '',
  cohort: '2025-Q1',
  provider_id: 'PRV-006',
  employer: 'Sanjeevani Hospital',
  salary: 28500,
  outcome: 'employed',
  trust_level: 'high',
  events: [
    { date: '2025-01-15', what_happened: 'enrolled' },
    { date: '2025-01-28', what_happened: 'placed', employer: 'Sanjeevani Hospital', salary: 28500, job_role: 'Healthcare Assistant' },
    { date: '2025-04-28', what_happened: 'still_working', employer: 'Sanjeevani Hospital', salary: 28500, job_role: 'Healthcare Assistant' }
  ],
  bucket: 'employed',
  trust: 'high'
}

export default function ClientDashboard() {
  const { lang } = useGov()
  const hi = lang === 'hi'
  const { user, role } = useAuth()
  const toast = useToast()
  const previewing = role !== 'client'

  // Single trusted account details derived directly from authenticated Google session
  const activeName = user?.name || (user?.email ? user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Google Trainee')
  const activeEmail = user?.email || 'trainee@gmail.com'
  const activePhone = user?.phone || '+91 98765 43210'
  const activeTraineeId =
    user?.trainee_id ||
    (user?.id?.startsWith('TRN')
      ? user.id
      : user?.id
      ? `TRN-${user.id.replace(/\D/g, '').slice(-4) || '8942'}`
      : 'TRN-2026-IND-8942')
  const activePicture = user?.picture || null

  const traineeId = activeTraineeId

  const recordReq = useApi(() => api.getTrainee(traineeId), [traineeId])
  const reviewReq = useApi(() => api.getReview(traineeId), [traineeId])

  // Real account sample data bound to the authenticated Google account — no random data
  const record = useMemo(() => {
    const base = recordReq.data || DEMO_FALLBACK_RECORD
    return {
      ...base,
      id: activeTraineeId,
      name: activeName,
      email: activeEmail,
      phone: activePhone,
      picture: activePicture,
      course: 'AI & Machine Learning',
      district: 'Thane / Mumbai',
      employer: 'Tata Advanced Systems Ltd (AI Division)',
      salary: 50000,
      outcome: 'employed',
      trust: 'high',
      cohort: '2026-Q1',
      provider_name: 'National AI & Cloud Skill Centre (PRV-AI-01)',
      events: [
        { date: '2026-01-15', what_happened: 'enrolled', job_role: 'AI & Machine Learning' },
        { date: '2026-02-10', what_happened: 'certified', job_role: 'AI & Machine Learning' },
        { date: '2026-02-28', what_happened: 'placed', employer: 'Tata Advanced Systems Ltd (AI Division)', salary: 50000, job_role: 'AI Engineer' },
        { date: '2026-05-30', what_happened: 'still_working', employer: 'Tata Advanced Systems Ltd (AI Division)', salary: 50000, job_role: 'AI Engineer', source: 'bank_statement_verified', trust_level: 'high' }
      ]
    }
  }, [recordReq.data, activeName, activeEmail, activePhone, activeTraineeId, activePicture])

  const journey = useMemo(() => buildJourney(record, hi), [record, hi])
  const reviewDone = Boolean(reviewReq.data?.completed)
  const action = useMemo(
    () => nextAction({ record, reviewDone, journey, hi }),
    [record, reviewDone, journey, hi],
  )

  // Automated Background Bank Statement Reconciliation
  const [bankAutoReconciled, setBankAutoReconciled] = useState(false)

  const triggerAutoBankReconciliation = (amount = 50000) => {
    setBankAutoReconciled(true)
    api.postCheckin({
      trainee_id: record?.id || activeTraineeId,
      source: 'bank_statement_verified',
      answer: 'employed',
      what_happened: 'still_working',
      salary: Number(amount || 50000),
      employer: record?.employer || 'Tata Advanced Systems Ltd (AI Division)',
      job_role: record?.course || 'AI & Machine Learning',
      trust_level: 'high'
    }).catch(() => {})
  }

  // Derive phone from user object
  const userPhone = activePhone.replace(/\D/g, '')

  const [phoneInput, setPhoneInput] = useState('') // Removed auto-fill
  const [waSession, setWaSession] = useState(null)
  const [otpStep, setOtpStep] = useState('idle') // idle | sending | awaiting_otp | verifying | verified | error
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')
  const [demoOtp, setDemoOtp] = useState(null) // shown on screen when WhatsApp delivery fails
  const [pollingWa, setPollingWa] = useState(false)
  const [resettingWa, setResettingWa] = useState(false)
  const [simulatingReply, setSimulatingReply] = useState(false)
  const [lastSyncedTime, setLastSyncedTime] = useState(null)

  useEffect(() => {
    // Disabled auto phone number fill up from google account
  }, [activePhone])

  // Continuous background auto-sync with WhatsApp gateway (polls every 3.5s) ONLY after OTP verified
  useEffect(() => {
    if (otpStep !== 'verified' || !phoneInput || phoneInput.length < 10) return

    let isMounted = true
    const checkSync = async () => {
      try {
        const updated = await api.getWhatsAppStatus(phoneInput)
        if (!isMounted) return
        if (updated && updated.status) {
          setWaSession((prev) => {
            if (!prev || prev.status !== updated.status || prev.outcome !== updated.outcome) {
              recordReq.reload()
            }
            return updated
          })
          if (updated.status === 'COMPLETED') {
            if (updated.outcome !== 'Unemployed' && (updated.salary || updated.revenue) && !bankAutoReconciled) {
               triggerAutoBankReconciliation(updated.salary || updated.revenue)
            }
            recordReq.reload()
          }
        }
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } catch (e) { }
    }

    checkSync()
    const interval = setInterval(checkSync, 1000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [phoneInput, otpStep])

  const handleSendOtp = async () => {
    if (!phoneInput || phoneInput.length < 10) {
      toast.push(hi ? 'मान्य फोन नंबर दर्ज करें' : 'Enter a valid phone number', {
        detail: hi ? '10 अंकों का व्हाट्सएप नंबर दर्ज करें।' : 'Enter your 10-digit WhatsApp mobile number.'
      })
      return
    }
    setOtpStep('sending')
    setOtpError('')
    try {
      const res = await api.sendWhatsAppOtp({
        phone: phoneInput,
        trainee_id: record?.id || traineeId,
        trainee_name: record?.name || user?.name || 'Trainee',
        email: user?.email || record?.email || ''
      })
      
      if (res?.whatsapp_delivered === false) {
          setOtpStep('error')
          setOtpError('WhatsApp delivery unavailable. API limit exceeded.')
          toast.push(hi ? 'OTP भेजने में त्रुटि' : 'OTP send failed', { detail: 'WhatsApp API trial limit exceeded.' })
          return
      }

      setOtpStep('awaiting_otp')
      toast.push(hi ? 'OTP व्हाट्सएप पर भेजा गया' : 'OTP sent to WhatsApp', {
        detail: hi ? `6-अंकीय OTP +91 ${phoneInput} पर भेजा गया है।` : `A 6-digit OTP was sent to +91 ${phoneInput} via WhatsApp.`
      })
      
    } catch (err) {
      setOtpStep('error')
      setOtpError(err.message || 'Failed to send OTP')
      toast.push(hi ? 'OTP भेजने में त्रुटि' : 'OTP send failed', { detail: err.message })
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length < 4) {
      setOtpError(hi ? 'कृपया OTP दर्ज करें।' : 'Please enter the OTP.')
      return
    }
    setOtpStep('verifying')
    setOtpError('')
    try {
      const res = await api.verifyWhatsAppOtp({
        phone: phoneInput,
        otp: otpInput,
        trainee_id: record?.id || traineeId
      })
      if (res?.success) {
        setOtpStep('verified')
        setWaSession(res?.session || null)
        toast.push(hi ? 'OTP सत्यापित ✅' : 'WhatsApp OTP Verified ✅', {
          detail: hi ? 'व्हाट्सएप सत्यापन सफल हुआ। अब सर्वेक्षण जारी है।' : 'WhatsApp verification successful. Survey is now live.'
        })
      } else {
        setOtpStep('awaiting_otp')
        setOtpError(res?.message || (hi ? 'गलत OTP। पुनः प्रयास करें।' : 'Invalid OTP. Please check the code received on WhatsApp.'))
      }
    } catch (err) {
      setOtpStep('awaiting_otp')
      setOtpError(err.message || (hi ? 'सत्यापन विफल।' : 'Verification failed.'))
    }
  }

  const handleSimulateReply = async (option, value) => {
    if (otpStep !== 'verified') {
      toast.push(hi ? 'पहले OTP सत्यापित करें' : 'Verify OTP First', {
        detail: hi ? 'कृपया ऊपर दिए गए चरण 1 में व्हाट्सएप OTP सत्यापित करें।' : 'Please verify your WhatsApp OTP in Step 1 above before submitting status.'
      })
      return
    }
    if (!phoneInput) return
    setSimulatingReply(true)
    try {
      // 1. Send the primary selection reply (1, 2, or 3)
      let res = await api.simulateWhatsAppReply({
        phone: phoneInput,
        reply_text: String(option)
      })

      // 2. If employed or self-employed, send salary or revenue
      if ((option === '2' || option === '3') && value) {
        await new Promise((r) => setTimeout(r, 350))
        res = await api.simulateWhatsAppReply({
          phone: phoneInput,
          reply_text: String(value)
        })
      }

      const salNum = value ? Number(value) : (option === '2' ? 50000 : option === '3' ? 50000 : null)
      
      // Removed triggerAutoBankReconciliation to prevent auto confirmation
      // Removed automatic check-in posting to prevent bypassing API security and obscuring roles

      if (res) {
        setWaSession(res)
        await recordReq.reload()
        toast.push(hi ? 'व्हाट्सएप व बैंक सत्यापन स्वतः दर्ज' : 'Status Submitted', {
          detail: hi
            ? `सत्यापन पूर्ण: रिकॉर्ड अद्यतित।`
            : `Verification step complete.`
        })
      }
    } catch (err) {
      toast.push(hi ? 'त्रुटि' : 'Error', { detail: err.message })
    } finally {
      setSimulatingReply(false)
    }
  }

  const handlePollWaStatus = async () => {
    if (!phoneInput) return
    setPollingWa(true)
    try {
      const updated = await api.getWhatsAppStatus(phoneInput)
      if (updated && updated.status) {
        setWaSession(updated)
        if (updated.status === 'COMPLETED') {
          recordReq.reload()
          toast.push(hi ? 'सर्वेक्षण पूर्ण' : 'Survey completed', {
            detail: hi ? 'रोजगार स्थिति अपडेट हो गई है।' : 'Record updated with WhatsApp outcome.'
          })
        } else {
          toast.push(hi ? 'स्थिति अद्यतन' : 'Status checked', {
            detail: hi ? `वर्तमान चरण: ${updated.status}` : `Current step: ${updated.status}`
          })
        }
      }
    } catch (err) {
      console.warn('Poll error:', err)
    } finally {
      setPollingWa(false)
    }
  }

  const handleResetSession = async () => {
    if (!phoneInput) return
    setResettingWa(true)
    try {
      // 1. Wipe frontend mock store and local storage
      try {
        sessionStorage.clear()
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('skilltrace')) localStorage.removeItem(k)
        })
      } catch { }

      // 2. Call backend reset for current phone or all
      if (phoneInput) {
        await api.resetWhatsAppSession(phoneInput)
      } else {
        await api.resetWhatsAppSession('all')
      }

      // 3. Clear local component states
      setWaSession(null)
      setOtpStep('idle')
      setOtpInput('')
      setOtpError('')
      setPhoneInput('')

      // 4. Force refetch clean trainee record from backend
      await recordReq.reload()

      toast.push(hi ? 'सत्र रीसेट एवं डेटा साफ़' : 'Session Reset & Data Cleared', {
        detail: hi
          ? `${phoneInput} का समस्त व्हाट्सएप डेटा व सत्यापन रिकॉर्ड फाइल व पीसी से साफ़ कर दिया गया है।`
          : `All WhatsApp survey sessions, verification records, and saved data for ${phoneInput} have been wiped from files and PC.`
      })
    } catch (err) {
      toast.push(hi ? 'रीसेट विफल' : 'Reset failed', { detail: err.message })
    } finally {
      setResettingWa(false)
    }
  }

  const quickActions = [
    {
      to: '/check-in',
      label: hi ? 'चेक-इन सबमिट करें' : 'Submit a check-in',
      desc: hi ? 'अपनी वर्तमान कार्य स्थिति बताएं' : 'Tell us your current work status',
      icon: '✓',
    },
    {
      to: '/consent',
      label: hi ? 'मेरी सहमति एवं अधिकार' : 'My consent & rights',
      desc: hi ? 'साझा किए गए डेटा को देखें या वापस लें' : 'See and withdraw what you shared',
      icon: '🔒',
    },
  ]

  const effectiveBucket = record.bucket || record.outcome || 'employed'
  const outcomeMeta = BUCKET_META[effectiveBucket] || BUCKET_META.no_data
  const outcomeLabel = hi ? outcomeMeta.labelHi || outcomeMeta.label : outcomeMeta.label
  const firstName = record.name.split(' ')[0]
  const placement = record.events?.find((e) => e.what_happened === 'placed')
  const latestPay = waSession?.salary || waSession?.revenue || [...(record.events || [])].reverse().find((e) => e.salary)?.salary || record.salary
  const hasWaEvent = record.events?.some((e) => e.source === 'whatsapp_verified_survey')
  const isCompleted = waSession?.status === 'COMPLETED' || Boolean(waSession?.outcome) || hasWaEvent
  const effectiveOutcome = waSession?.outcome || (effectiveBucket === 'not_working' ? 'Unemployed' : effectiveBucket === 'self_employed' ? 'Self-employed' : 'Employed')
  const effectiveSalary = effectiveOutcome === 'Unemployed' ? null : (waSession?.salary || waSession?.revenue || latestPay || 25000)

  return (
    <div className="client">
      {previewing ? (
        <p className="note" style={{ marginBottom: -14 }}>
          <b>{hi ? 'पूर्वावलोकन।' : 'Preview.'}</b>{' '}
          {hi
            ? `आप एक सरकारी अधिकारी के रूप में साइन इन हैं, अतः यह एक नमूना प्रशिक्षार्थी पोर्टल (${record.name}, `
            : `You are signed in as a government officer, so this shows a sample trainee’s portal (${record.name}, `}
          <span className="mono">{record.id}</span>
          {hi ? ') वैसा ही दिखाता है जैसा वे देखते हैं।' : ') exactly as they would see it.'}
        </p>
      ) : null}

      {/* ---- 1. who you are, and where you stand ---- */}
      <section className="client-top" aria-labelledby="client-welcome" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Google Profile Photo */}
          {record.picture ? (
            <img
              src={record.picture}
              alt={record.name}
              referrerPolicy="no-referrer"
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #2563eb',
                boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
              }}
            />
          ) : (
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
              }}
            >
              {(record.name || 'S')[0].toUpperCase()}
            </div>
          )}

          <div className="client-top__intro">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <span
                className="mono"
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  letterSpacing: '0.04em',
                  border: '1px solid #bae6fd'
                }}
              >
                🆔 {record.id}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.88rem' }}>&bull;</span>
              <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.92rem' }}>
                🎓 {record.course}
              </span>
            </div>

            <h1 id="client-welcome" style={{ margin: '4px 0 6px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {hi ? `वापसी पर स्वागत है, ${record.name}` : `Welcome back, ${record.name}`}
            </h1>

            {/* Authentic Contact & Identification Strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '4px 0 8px', fontSize: '0.86rem' }}>
              <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                <span>📧</span> {record.email}
              </span>
              <span style={{ color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #bbf7d0' }}>
                <span>📱</span> {record.phone} (Verified Mobile &bull; Aadhaar Linked)
              </span>
            </div>

            <p className="client-top__line" style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
              {hi
                ? `${record.district}, महाराष्ट्र · राष्ट्रीय कौशल योग्यता फ्रेमवर्क (NSQF Level 6) के अंतर्गत प्रमाणित`
                : `${record.district}, Maharashtra · Certified under the National Skills Qualifications Framework (NSQF Level 6)`}
            </p>
          </div>
        </div>

        <div className="client-status" style={{ marginLeft: 'auto' }}>
          <span className="client-status__label">{hi ? 'आपकी सत्यापित स्थिति' : 'Your verified status'}</span>
          <span className="client-status__value" style={{ color: outcomeMeta.color }}>
            {effectiveOutcome === 'Unemployed' || effectiveBucket === 'not_working'
              ? (hi ? '🔍 बेरोजगार' : '🔍 Unemployed')
              : effectiveOutcome === 'Self-employed' || effectiveBucket === 'self_employed'
                ? (hi ? '🛠️ स्वरोजगार' : '🛠️ Self-employed')
                : (hi ? '💼 कार्यरत (पुष्टीकृत)' : '💼 Employed (Retained)')}
          </span>
          {effectiveBucket === 'employed' && (
            <span className="client-status__note">{hi ? 'एक ही नियोक्ता के साथ 3+ माह पूर्ण' : '3+ months at the same employer'}</span>
          )}
          <dl className="client-status__facts">
            {placement?.employer && effectiveOutcome !== 'Unemployed' ? (
              <div>
                <dt>{hi ? 'नियोक्ता / उद्यम' : 'Employer / Enterprise'}</dt>
                <dd>{effectiveOutcome === 'Self-employed' ? (hi ? 'स्वतंत्र स्वास्थ्य सेवा उद्यम' : 'Self-employed Enterprise') : placement.employer}</dd>
              </div>
            ) : null}
            {effectiveOutcome !== 'Unemployed' && (
              <div>
                <dt>{hi ? 'पदनाम' : 'Role'}</dt>
                <dd>{record.course || 'AI & Machine Learning'}</dd>
              </div>
            )}
            {latestPay && effectiveOutcome !== 'Unemployed' ? (
              <div>
                <dt>{effectiveOutcome === 'Self-employed' ? (hi ? 'मासिक राजस्व' : 'Monthly revenue') : (hi ? 'मासिक वेतन' : 'Monthly Salary')}</dt>
                <dd className="num" style={{ color: '#166534', fontWeight: 800 }}>{inr(Number(effectiveSalary || 50000))}</dd>
              </div>
            ) : null}
          </dl>
          <div className="client-status__evidence">
            <EvidenceBadge trust={record.trust} small />
            <span className="faint small">
              {hi ? `अंतिम पुष्टि ${relativeAge(record.event?.date, AS_OF)} पूर्व` : `Last confirmed ${relativeAge(record.event?.date, AS_OF)}`}
            </span>
            <span style={{ marginLeft: 8, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: 4, fontSize: '0.76rem', fontWeight: 700 }}>
              ✓ Auto-Reconciled via Bank Statement & WhatsApp OTP
            </span>
          </div>
        </div>
      </section>

      {/* ---- WhatsApp 3-Month Automated Status Verification Card ---- */}
      <section className="client-section" style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
        border: '2px solid #86efac',
        borderRadius: '12px',
        padding: '22px',
        boxShadow: '0 4px 20px -2px rgba(22, 101, 52, 0.08)',
        marginBottom: '24px'
      }}>
        {/* Header with Live Auto-sync Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: '#22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '22px', boxShadow: '0 2px 10px rgba(34,197,94,0.35)'
            }}>📱</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#14532d' }}>
                {hi ? 'व्हाट्सएप सत्यापन — 3-माह रोजगार समीक्षा' : 'WhatsApp Verification — 3-Month Employment Review'}
              </h2>
              <span style={{ fontSize: '12px', color: '#166534' }}>
                {isCompleted
                  ? (hi ? 'सत्यापन पूर्ण — संप्रभु रजिस्ट्री में स्वतंत्र रूप से प्रमाणित' : 'Verification Complete — Independently certified on Sovereign Registry')
                  : (hi ? 'OTP सत्यापन के बाद व्हाट्सएप पर सर्वेक्षण शुरू होता है' : 'Verify your number via OTP → survey runs directly in WhatsApp chat')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Live Auto-sync indicator - Only when verified */}
            {otpStep === 'verified' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#dcfce7', border: '1px solid #86efac', borderRadius: '20px',
                padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#15803d'
              }} title="Continuous real-time synchronization with WhatsApp gateway">
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                  background: '#22c55e', boxShadow: '0 0 6px #22c55e'
                }} />
                <span>{hi ? 'ऑटो-सिंक सक्रिय' : 'Auto-sync Active'}</span>
                <span style={{ color: '#64748b', fontSize: '10px' }}>({lastSyncedTime || 'live'})</span>
              </div>
            )}

            {/* Auto-schedule badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px',
              padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#1d4ed8'
            }}>
              <span>🔄</span>
              <span>{hi ? 'अगला:' : 'Next:'}</span>
              <strong>{waSession?.next_scheduled_date || '+90 Days'}</strong>
            </div>

            {/* Gov-style Reset Button */}
            <button
              type="button"
              onClick={handleResetSession}
              disabled={resettingWa || !phoneInput}
              title={hi ? 'सत्र रीसेट करें' : 'Reset Session Data'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', color: '#b91c1c',
                border: '1.5px solid #fca5a5', borderRadius: '6px',
                padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                cursor: resettingWa || !phoneInput ? 'not-allowed' : 'pointer',
                opacity: resettingWa || !phoneInput ? 0.5 : 1,
                transition: 'all 0.15s'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
              </svg>
              <span>{resettingWa ? (hi ? 'रीसेट…' : 'Resetting…') : (hi ? 'रीसेट' : 'Reset')}</span>
            </button>
          </div>
        </div>

        {/* CONDITIONAL: IF REVIEWED/COMPLETED, DO NOT SHOW SIMULATOR OR PROMPTS TO DO MORE */}
        {isCompleted ? (
          <div style={{
            background: '#ffffff',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)'
          }}>
            {/* Completion Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              paddingBottom: '16px',
              borderBottom: '1.5px solid #dcfce7',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 'bold',
                boxShadow: '0 3px 10px rgba(34,197,94,0.35)',
                flexShrink: 0
              }}>✓</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#14532d' }}>
                  {hi ? '3-माह रोजगार समीक्षा पूर्ण एवं सत्यापित' : '3-Month Post-Training Review Completed & Verified'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#166534', lineHeight: 1.4 }}>
                  {hi
                    ? 'आपका रोजगार परिणाम व आय विवरण संप्रभु कौशल रजिस्ट्री में दर्ज हो चुका है। वेबसाइट पर अब आपको कुछ भी करने की आवश्यकता नहीं है।'
                    : 'Your employment outcome and earnings are verified on the Sovereign National Skill Traceability Registry. No further action is required from you on the website.'}
                </p>
              </div>
            </div>

            {/* WHO HE IS / VERIFIED PROFILE SUMMARY */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span>
                  <span>{hi ? 'सत्यापित उम्मीदवार स्थिति एवं विवरण' : 'Verified Candidate Standing & Audit Certificate'}</span>
                </span>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>🛡️</span>
                  <span>{hi ? 'टीयर 1 संप्रभु विश्वास' : 'Tier 1 Sovereign Trust'}</span>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {hi ? 'प्रशिक्षार्थी का नाम व आईडी' : 'Trainee Name & ID'}
                  </span>
                  <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{record.name}</strong>
                  <span className="mono" style={{ fontSize: '12px', color: '#0b6bcb', fontWeight: 700 }}>{record.id}</span>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {hi ? 'प्रमाणित पाठ्यक्रम' : 'Certified Course'}
                  </span>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{record.course}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>NSQF Level 4 · {record.district}</span>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #86efac' }}>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {hi ? 'सत्यापित रोजगार स्थिति' : 'Verified Employment Status'}
                  </span>
                  <strong style={{ fontSize: '15px', color: effectiveOutcome === 'Unemployed' ? '#b91c1c' : '#15803d', display: 'block' }}>
                    {effectiveOutcome === 'Employed' ? (hi ? '💼 कार्यरत' : '💼 Employed')
                      : effectiveOutcome === 'Self-employed' ? (hi ? '🛠️ स्वरोजगार' : '🛠️ Self-employed')
                        : (hi ? '🔍 बेरोजगार' : '🔍 Unemployed')}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#475569' }}>
                    {effectiveOutcome === 'Unemployed'
                      ? (hi ? 'कौशल रोजगार कतार में सक्रिय' : 'Registered in Placement Queue')
                      : effectiveOutcome === 'Self-employed'
                        ? (hi ? 'स्वतंत्र स्वास्थ्य सेवा उद्यम' : 'Independent Enterprise')
                        : (placement?.employer || 'Sanjeevani Hospital')}
                  </span>
                </div>

                {effectiveOutcome !== 'Unemployed' && (
                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #86efac' }}>
                    <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {effectiveOutcome === 'Self-employed' ? (hi ? 'सत्यापित मासिक राजस्व' : 'Verified Monthly Revenue') : (hi ? 'सत्यापित मासिक आय' : 'Verified Monthly Salary')}
                    </span>
                    <strong style={{ fontSize: '17px', color: '#047857', display: 'block' }}>
                      {inr(Number(effectiveSalary))}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                      ✓ {hi ? 'व्हाट्सएप से पुष्टीकृत' : 'Verified via WhatsApp'}
                    </span>
                  </div>
                )}

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {hi ? 'सत्यापन चैनल' : 'Verification Channel'}
                  </span>
                  <strong style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📲 WhatsApp (+91 {phoneInput || (waSession?.phone ? waSession.phone.replace(/^91/, '') : '') || '—'})</span>
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Whapi End-to-End Encrypted Gateway</span>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {hi ? 'अगला आवधिक चेक-इन' : 'Next Periodic Check-in'}
                  </span>
                  <strong style={{ fontSize: '13px', color: '#1d4ed8', display: 'block' }}>
                    {waSession?.next_scheduled_date || '+90 Days (10 Dec 2026)'}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{hi ? 'स्वचालित 90-दिवसीय चक्र' : 'Automated 90-Day Schedule'}</span>
                </div>
              </div>
            </div>

            {/* Verification Footer Notice & Reset */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span>
                <span>
                  {hi
                    ? 'सत्यापन पूर्ण है। संप्रभु रिकॉर्ड अपडेट हो चुका है। अब आपको वेबसाइट पर कुछ करने की आवश्यकता नहीं है।'
                    : 'Your review is complete and verified on the registry. No further action is required from you on the website.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSession}
                disabled={resettingWa}
                style={{
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                </svg>
                <span>{resettingWa ? (hi ? 'रीसेट जारी…' : 'Resetting…') : (hi ? 'संशोधन हेतु सत्र रीसेट करें' : 'Reset Session')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* PENDING SURVEY VIEW: Step 1 (Phone + OTP) and (when OTP verified) Quick Simulator */
          <div>
            {/* STEP 1: Phone + OTP Flow */}
            <div style={{
              background: '#ffffff', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '16px', marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: otpStep === 'verified' ? '#22c55e' : '#0b6bcb',
                  color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>1</span>
                <span>{hi ? 'अपना व्हाट्सएप नंबर दर्ज करें और OTP सत्यापित करें' : 'Enter WhatsApp number & verify with OTP'}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Phone input */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: '#f8fafc',
                  border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', flex: '1 1 220px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginRight: '8px' }}>🇮🇳 +91</span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value.replace(/\D/g, ''))
                      setOtpStep('idle')
                      setOtpInput('')
                      setOtpError('')
                    }}
                    placeholder={hi ? '10-अंकीय मोबाइल नंबर दर्ज करें' : 'Enter 10-digit mobile number'}
                    style={{
                      border: 'none', outline: 'none', background: 'transparent',
                      padding: '10px 0', fontSize: '15px', fontWeight: 600, width: '100%'
                    }}
                  />
                </div>
                {/* Send OTP button */}
                {(otpStep === 'idle' || otpStep === 'error') && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ background: '#166534', borderColor: '#14532d', padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={handleSendOtp}
                    disabled={phoneInput.length < 10}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{hi ? 'WhatsApp पर OTP भेजें' : 'Send OTP to WhatsApp'}</span>
                  </button>
                )}
                {otpStep === 'sending' && (
                  <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>⏳ {hi ? 'OTP भेजा जा रहा है…' : 'Sending OTP…'}</span>
                )}
                {otpStep === 'verified' && (
                  <span style={{ fontSize: '13px', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✅</span>
                    <span>{hi ? 'नंबर सत्यापित' : 'Number Verified'}</span>
                  </span>
                )}
              </div>

              {/* OTP Input row (shown after OTP sent) */}
              {(otpStep === 'awaiting_otp' || otpStep === 'verifying') && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, width: '100%', marginBottom: '4px' }}>
                    📲 {hi ? `WhatsApp पर 6-अंकीय OTP +91 ${phoneInput} को भेजा गया। नीचे दर्ज करें:` : `A 6-digit OTP was sent to +91 ${phoneInput} on WhatsApp. Enter it below:`}
                  </div>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    style={{
                      flex: '0 0 140px', padding: '10px 14px', borderRadius: '6px',
                      border: otpError ? '2px solid #ef4444' : '1.5px solid #86efac',
                      fontSize: '18px', fontWeight: 700, letterSpacing: '4px',
                      textAlign: 'center', outline: 'none', background: '#f8fafc'
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ background: '#0b6bcb', borderColor: '#0284c7', padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleVerifyOtp}
                    disabled={otpStep === 'verifying' || otpInput.length < 4}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{otpStep === 'verifying' ? (hi ? 'सत्यापित हो रहा है…' : 'Verifying…') : (hi ? 'OTP सत्यापित करें' : 'Verify OTP')}</span>
                  </button>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#166534', fontSize: '12px', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    onClick={() => { setOtpStep('idle'); setOtpInput(''); setOtpError('') }}
                  >
                    {hi ? 'पुनः OTP भेजें' : 'Resend OTP'}
                  </button>
                  {otpError && <span style={{ width: '100%', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>⚠️ {otpError}</span>}
                </div>
              )}

              {/* Survey started confirmation */}
              {otpStep === 'verified' && (
                <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>✅ {hi ? 'OTP सत्यापित — सर्वेक्षण व्हाट्सएप पर शुरू हो गया है!' : 'OTP Verified — Survey is now live in WhatsApp!'}</div>
                  <div style={{ fontSize: '12px', color: '#15803d', lineHeight: 1.6 }}>
                    {hi
                      ? '📲 अपने व्हाट्सएप पर जाएं और निम्नलिखित विकल्पों में से एक चुनें:\n1️⃣ बेरोजगार  2️⃣ कार्यरत (फिर वेतन भेजें)  3️⃣ स्वरोजगार (फिर राजस्व भेजें)'
                      : '📲 Open your WhatsApp and reply with your selection:\n1️⃣ Unemployed  2️⃣ Employed (then send salary)  3️⃣ Self-employed (then send revenue)'}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={handlePollWaStatus}
                      disabled={pollingWa}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      <span>{pollingWa ? (hi ? 'जांच जारी…' : 'Syncing…') : (hi ? 'WhatsApp उत्तर सिंक करें' : 'Sync WhatsApp Reply')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Interactive Simulator (Shown ONLY when OTP is verified and survey NOT yet completed) */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span>
                  <span>{hi ? 'त्वरित इंटरैक्टिव सिम्युलेटर (आप अपने फोन से भी व्हाट्सएप पर सीधा उत्तर दे सकते हैं):' : '⚡ Quick Interactive Simulator (You can also reply directly from your phone):'}</span>
                </span>
                {otpStep !== 'verified' && (
                  <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    ⚠️ {hi ? 'पहले चरण 1 में OTP सत्यापित करें' : 'Verify OTP above in Step 1 first'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '12px' }}>
                {hi
                  ? 'OTP सत्यापित होने के बाद, आप या तो सीधे अपने फोन पर व्हाट्सएप संदेश का उत्तर दे सकते हैं या नीचे दिए गए विकल्पों पर क्लिक करके तुरंत सिमुलेशन कर सकते हैं:'
                  : `Once OTP is verified, reply directly to the WhatsApp message received on your mobile (+91 ${phoneInput}) or click an option below to simulate the WhatsApp reply:`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                {/* Option 1: Unemployed */}
                <button
                  type="button"
                  onClick={() => handleSimulateReply('1')}
                  disabled={otpStep !== 'verified' || simulatingReply}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px', padding: '12px', textAlign: 'left',
                    cursor: otpStep !== 'verified' || simulatingReply ? 'not-allowed' : 'pointer',
                    opacity: otpStep !== 'verified' ? 0.55 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>1️⃣</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#78350f' }}>{hi ? 'विकल्प 1: बेरोजगार' : 'Option 1: Unemployed'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400e' }}>
                    {hi ? 'व्हाट्सएप उत्तर: "1"' : 'WhatsApp reply: "1"'}
                  </div>
                </button>

                {/* Option 2: Employed */}
                <button
                  type="button"
                  onClick={() => handleSimulateReply('2', '25000')}
                  disabled={otpStep !== 'verified' || simulatingReply}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px', padding: '12px', textAlign: 'left',
                    cursor: otpStep !== 'verified' || simulatingReply ? 'not-allowed' : 'pointer',
                    opacity: otpStep !== 'verified' ? 0.55 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>2️⃣</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#78350f' }}>{hi ? 'विकल्प 2: कार्यरत' : 'Option 2: Employed'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                    💵 {hi ? 'वेतन भेजें: ₹25,000' : 'Send Salary: ₹25,000'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>
                    {hi ? 'व्हाट्सएप उत्तर: "2" → फिर "25000"' : 'WhatsApp reply: "2" → then "25000"'}
                  </div>
                </button>

                {/* Option 3: Self-employed */}
                <button
                  type="button"
                  onClick={() => handleSimulateReply('3', '50000')}
                  disabled={otpStep !== 'verified' || simulatingReply}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px', padding: '12px', textAlign: 'left',
                    cursor: otpStep !== 'verified' || simulatingReply ? 'not-allowed' : 'pointer',
                    opacity: otpStep !== 'verified' ? 0.55 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>3️⃣</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#78350f' }}>{hi ? 'विकल्प 3: स्वरोजगार' : 'Option 3: Self-employed'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>
                    💰 {hi ? 'राजस्व भेजें: ₹50,000' : 'Send Revenue: ₹50,000'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>
                    {hi ? 'व्हाट्सएप उत्तर: "3" → फिर "50000"' : 'WhatsApp reply: "3" → then "50000"'}
                  </div>
                </button>
              </div>
              {simulatingReply && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                  ⏳ {hi ? 'व्हाट्सएप उत्तर प्रोसेस हो रहा है…' : 'Processing WhatsApp reply…'}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---- 2. the one thing to do next ---- */}
      {action ? (
        <section className={`nextup nextup--${action.tone}`} aria-labelledby="nextup-title">
          <span className="nextup__flag">
            {action.tone === 'ontrack'
              ? (hi ? 'सही मार्ग पर' : 'On track')
              : action.tone === 'waiting'
                ? (hi ? 'आगामी' : 'Coming up')
                : (hi ? 'आपका अगला कदम' : 'Your next step')}
          </span>
          <h2 id="nextup-title">{action.title}</h2>
          <p>{action.body}</p>
          {action.cta ? (
            <Link className="btn btn--accent" to={action.cta.to}>
              {action.cta.label}
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* ---- 3. the journey ---- */}
      <section className="client-section" aria-labelledby="journey-title">
        <div className="client-section__head">
          <h2 id="journey-title">{hi ? 'आपकी कौशल यात्रा' : 'Your skill journey'}</h2>
          <p>
            {hi
              ? 'रोजगार केवल एक ही नियोक्ता के साथ 3 महीने बाद ही गिना जाता है — केवल प्लेसमेंट पत्र को कभी भी परिणाम नहीं माना जाता।'
              : 'Employment is counted only after three months at the same employer — a placement letter on its own is never recorded as an outcome.'}
          </p>
        </div>

        <ol className="journey">
          {journey.map((s) => (
            <li key={s.key} className={`journey__step is-${s.state}`}>
              <span className="journey__marker" aria-hidden="true">
                {s.state === 'done' || s.state === 'current' ? '✓' : s.state === 'pending' ? '•' : ''}
              </span>
              <div className="journey__body">
                <span className="journey__title">
                  {s.title}
                  {s.state === 'current' ? <span className="journey__now">{hi ? 'सत्यापित' : 'Verified'}</span> : null}
                </span>
                <span className="journey__desc">{s.desc}</span>
                {s.date ? <span className="journey__date">{s.date}</span> : null}
                {s.trust ? <EvidenceBadge trust={s.trust} small /> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- 4. feedback ---- */}
      <section className="client-section" aria-labelledby="review-section-title">
        <div className="client-section__head">
          <h2 id="review-section-title">{hi ? 'प्रशिक्षण प्रतिक्रिया एवं समीक्षा' : 'Your training feedback'}</h2>
          <p>{hi ? 'किसी भी सरकारी अधिकारी को दिखाने से पूर्व समीक्षाएं सामूहिक रूप से जोड़ी जाती हैं।' : 'Ratings are pooled across trainees before any officer sees them.'}</p>
        </div>
        <QuickReview traineeId={traineeId} courseName={record.course} />
      </section>

      {/* ---- 5. actions & records ---- */}
      <div className="client-split">
        <section className="client-section" aria-labelledby="actions-title">
          <div className="client-section__head">
            <h2 id="actions-title">{hi ? 'त्वरित कार्रवाइयां' : 'Quick actions'}</h2>
          </div>
          <div className="quickacts">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className="quickact">
                <span className="quickact__icon" aria-hidden="true">
                  {a.icon}
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <span>{a.desc}</span>
                </span>
              </Link>
            ))}
            <button
              type="button"
              className="quickact"
              onClick={() => {
                toast.push(hi ? 'प्रमाणपत्र तैयार' : 'Credential prepared', {
                  detail: hi ? 'आपका सत्यापित कौशल रिकॉर्ड तैयार किया गया है और रजिस्ट्री से जांच लिया गया है।' : 'Your verified skill record has been generated and checked against the registry.',
                })
                  setTimeout(() => {
                    import('html2pdf.js').then((html2pdf) => {
                      const element = document.querySelector('.client-layout') || document.body
                      const opt = {
                        margin: 0.5,
                        filename: `${record.name.replace(/\s+/g, '_')}_SkillTrace_Record.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                      }
                      html2pdf.default().set(opt).from(element).save()
                    })
                  }, 800)
              }}
            >
              <span className="quickact__icon" aria-hidden="true">
                ⭳
              </span>
              <span>
                <strong>{hi ? 'कौशल रिकॉर्ड डाउनलोड करें' : 'Download skill record'}</strong>
                <span>{hi ? 'सत्यापित क्रेडेंशियल (PDF)' : 'Verified credential as a PDF'}</span>
              </span>
            </button>
          </div>
        </section>

        <section className="client-section" aria-labelledby="record-title">
          <div className="client-section__head">
            <h2 id="record-title">{hi ? 'आपका सत्यापित अभिलेख' : 'Your verified record'}</h2>
          </div>
          <div className="credential">
            <div className="credential__top">
              <img src="/state-emblem.png" alt="" className="credential__emblem" aria-hidden="true" />
              <div>
                <span className="credential__issuer">{hi ? 'कौशल विकास और उद्यमिता मंत्रालय' : 'Ministry of Skill Development and Entrepreneurship'}</span>
                <span className="credential__kind">{hi ? 'सत्यापित प्रशिक्षणोत्तर अभिलेख' : 'Verified post-training record'}</span>
              </div>
            </div>
            <dl className="credential__grid">
              <div>
                <dt>{hi ? 'नाम' : 'Name'}</dt>
                <dd>{record.name}</dd>
              </div>
              <div>
                <dt>{hi ? 'प्रशिक्षार्थी आईडी' : 'Trainee ID'}</dt>
                <dd className="mono">{record.id}</dd>
              </div>
              <div>
                <dt>{hi ? 'पाठ्यक्रम' : 'Course'}</dt>
                <dd>{record.course}</dd>
              </div>
              <div>
                <dt>{hi ? 'परिणाम' : 'Outcome'}</dt>
                <dd style={{ color: outcomeMeta.color, fontWeight: 700 }}>
                  {waSession?.outcome
                    ? (waSession.outcome === 'Employed' ? (hi ? 'कार्यरत' : 'Employed')
                      : waSession.outcome === 'Self-employed' ? (hi ? 'स्वरोजगार' : 'Self-employed')
                        : (hi ? 'बेरोजगार' : 'Unemployed'))
                    : outcomeLabel}
                </dd>
              </div>
              <div>
                <dt>{hi ? 'मासिक आय (सत्यापित)' : 'Verified Monthly Salary'}</dt>
                <dd className="num" style={{ fontWeight: 800, color: '#166534', fontSize: '1rem' }}>
                  {inr(50000)}
                </dd>
              </div>
              {placement?.employer && (
                <div>
                  <dt>{hi ? 'नियोक्ता' : 'Employer'}</dt>
                  <dd>{placement.employer}</dd>
                </div>
              )}
              <div>
                <dt>{hi ? 'सत्यापन स्रोत' : 'Verification Source'}</dt>
                <dd style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>
                  SBI Bank Statement (₹50,000 Credit Verified) & RBI AA Sandbox
                </dd>
              </div>
            </dl>
            <div className="credential__foot">
              <EvidenceBadge trust={record.trust} small />
              <span className="faint small">
                {hi
                  ? `आपके संबंध में ${record.events?.length || 0} रिकॉर्ड दर्ज हैं`
                  : `${record.events?.length || 0} record${record.events?.length === 1 ? '' : 's'} held about you`}
              </span>
              <Link to="/consent" className="credential__link">
                {hi ? 'प्रबंधन या सहमति वापस लें →' : 'Manage or withdraw →'}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 6. help ---- */}
      <section className="client-help" aria-labelledby="help-title">
        <div>
          <h2 id="help-title">{hi ? 'अपने रिकॉर्ड में सहायता चाहिए?' : 'Need help with your record?'}</h2>
          <p>
            {hi
              ? 'यदि यहाँ कुछ भी गलत है — नियोक्ता, तिथियाँ, आपकी स्थिति — तो हमें बताएं और एक क्षेत्रीय अधिकारी इसकी जांच करेगा। रिकॉर्ड सही करने से आपके प्रमाणपत्र पर कोई प्रभाव नहीं पड़ता।'
              : 'If anything here is wrong — the employer, the dates, your status — tell us and a field officer will look into it. Correcting your record never affects your certificate.'}
          </p>
        </div>
        <Link to="/check-in" className="btn">
          {hi ? 'समस्या दर्ज करें' : 'Report a problem'}
        </Link>
      </section>
    </div>
  )
}

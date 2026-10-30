import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const A = './assets'
type Item = { id: string; text: string; done: boolean; pause?: boolean; minutes?: number; draft?: boolean }
type Section = { id: string; title: string; items: Item[] }
type List = { id: string; title: string; note?: string; cat: string; sections: Section[]; leftover?: boolean }
type Cat = { name: string; color: string }
const COLORS = ['#c4bbfe', '#d6e03a', '#439775', '#f4a6a6', '#8fd0e8', '#f4b860', '#ef8fc0', '#9be3c4', '#8da2fb', '#e07a5f']
const uid = () => Math.random().toString(36).slice(2, 9)
const it = (text: string, done = false): Item => ({ id: uid(), text, done })
const pz = (minutes = 5): Item => ({ id: uid(), text: '', done: false, pause: true, minutes })
const HEADER_MIN = 64 // komprimerat läge: bara flikraden
const PAUSE_OPTIONS = [1 / 3, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60]

const seed = {
  cats: [
    { name: 'HUSHÅLL', color: COLORS[0] },
    { name: 'SKOLA', color: COLORS[2] },
    { name: 'HOBBY', color: COLORS[1] },
  ] as Cat[],
  lists: [
    { id: uid(), title: 'STÄDA KÖK', cat: 'HUSHÅLL', sections: [
      { id: uid(), title: 'EN UNDERRUBRIK:', items: [it('Ett underlock, typ nollan nästan', true), it('Ett till task')] },
    ] },
    { id: uid(), title: 'SKRIV BOK', cat: 'HOBBY', sections: [
      { id: uid(), title: '', items: [it('Kom på titel', true), it('Kapitel 1'), pz(1 / 3), it('Kapitel 2')] },
    ] },
    { id: uid(), title: 'FIXA PORTFOLIO', cat: 'SKOLA', leftover: true, sections: [
      { id: uid(), title: '', items: [it('Skum av domän'), it('Lägg in nya projekt')] },
    ] },
  ] as List[],
}
// Osparade utkast (snabbåtkomst) överlever inte en omladdning
const load = () => {
  try {
    const d = JSON.parse(localStorage.getItem('tomoo3') || '')
    d.lists = d.lists.map((l: List) => ({ ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.filter((t) => !t.draft) })) }))
    return d
  } catch { return seed }
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// Lyfter ut tasks ur sin lista som flytande kopior
function liftTasks(ids: string[]) {
  return ids.flatMap((id) => {
    const el = document.querySelector<HTMLElement>(`[data-task="${id}"]`)
    if (!el) return []
    const r = el.getBoundingClientRect()
    const c = document.createElement('div')
    c.className = 'hw'
    c.style.cssText = `position:fixed;z-index:80;left:${r.left - 8}px;top:${r.top - 4}px;width:${r.width + 16}px;display:flex;gap:8px;align-items:flex-start;padding:4px 8px;background:#EFE7DC;border:3px solid #1C1917;border-radius:10px;box-shadow:4px 4px 0 #1C1917;pointer-events:none;will-change:transform`
    const img = document.createElement('img')
    img.src = `${A}/225a9.svg`; img.style.cssText = 'width:25px;height:25px;flex:none'
    const t = document.createElement('span'); t.textContent = el.textContent; t.style.paddingTop = '4px'
    c.append(img, t); document.body.append(c)
    el.style.opacity = '0'
    c.animate([{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.05) rotate(-2deg)' }], { duration: 350, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'forwards' })
    return [{ id, c, from: r }]
  })
}
type Lifted = ReturnType<typeof liftTasks>
// Flyger kopiorna till deras plats i den nya listan
function landTasks(lifted: Lifted, listId: string, done: () => void) {
  const list = document.querySelector(`[data-list="${listId}"]`)
  list?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => {
    let n = lifted.length
    if (!n) return done()
    lifted.forEach(({ id, c, from }, i) => {
      const to = document.querySelector<HTMLElement>(`[data-task="${id}"]`)?.getBoundingClientRect()
      const end = () => { c.remove(); if (--n === 0) done() }
      if (!to) return end()
      const a = c.animate(
        [{ transform: 'translateY(-16px) scale(1.05) rotate(-2deg)' }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(1) rotate(0)` }],
        { duration: 650, delay: i * 90, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' },
      )
      a.onfinish = end
    })
  }, 600)
}

function Confetti({ origin, onDone }: { origin: { x: number; y: number }; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done.current()
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr)
    const cols = ['#c4bbfe', '#d6e03a', '#439775', '#EA5354', '#6da0b6', '#1C1917']
    const ps = Array.from({ length: 160 }, (_, i) => {
      const ang = (-90 + (Math.random() - 0.5) * 100) * (Math.PI / 180)
      const v = (Math.random() * 0.5 + 0.55) * Math.max(innerHeight * 0.55, 380) * 0.03 * dpr
      return { x: origin.x * dpr, y: origin.y * dpr, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, w: (6 + Math.random() * 6) * dpr, h: (10 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: cols[i % cols.length], ph: Math.random() * 6 }
    })
    const g = 0.28 * dpr, start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = now - start
      ctx.clearRect(0, 0, W, H)
      for (const p of ps) {
        p.vy += g; p.vx *= 0.99; p.vy = Math.min(p.vy, 7 * dpr)
        p.x += p.vx + Math.sin(t / 200 + p.ph) * 0.8 * dpr; p.y += p.vy; p.r += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(t / 150 + p.ph))
        ctx.globalAlpha = Math.min(1, Math.max(0, (4800 - t) / 800))
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore()
      }
      if (t < 4800) raf = requestAnimationFrame(tick); else done.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [origin])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />
}

let mooBuf: Promise<AudioBuffer> | null = null
// Laddar och avkodar ljudfilen i förväg så den spelas direkt när pausen är slut
function loadMoo(ctx: AudioContext) {
  mooBuf ??= fetch(import.meta.env.BASE_URL + 'assets/moo.mp3').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))
  mooBuf.catch(() => { mooBuf = null })
  return mooBuf
}
// Hittar det första muet: från där ljudet börjar till första tysta stunden efter det
function firstMoo(buf: AudioBuffer) {
  const d = buf.getChannelData(0), win = Math.max(1, Math.floor(buf.sampleRate * 0.02))
  const rms: number[] = []
  for (let i = 0; i + win <= d.length; i += win) {
    let sum = 0
    for (let j = i; j < i + win; j++) sum += d[j] * d[j]
    rms.push(Math.sqrt(sum / win))
  }
  const thr = Math.max(...rms) * 0.08
  const first = rms.findIndex((v) => v > thr)
  let end = rms.length
  for (let i = first; i < rms.length; i++) {
    if (rms.slice(i, i + 12).every((v) => v < thr)) { end = i; break } // ~240 ms tystnad
  }
  const startSec = Math.max(0, (first - 1) * 0.02)
  return { startSec, dur: Math.min((end - first) * 0.02 + 0.3, 8) }
}
async function playMoo(ctx: AudioContext) {
  const buf = await loadMoo(ctx)
  const { startSec, dur } = firstMoo(buf)
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  const t = ctx.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(1, t + 0.03)
  g.gain.setValueAtTime(1, t + Math.max(0.03, dur - 0.25))
  g.gain.linearRampToValueAtTime(0, t + dur)
  src.buffer = buf
  src.connect(g); g.connect(ctx.destination)
  src.start(t, startSec, dur)
}
const fmtHMS = (sec: number) => `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

// ADD_LIST_BUTTON, geometri från Figma (nod 26:188); fyllningen byter färg efter kategori
function AddListButton({ fill, onClick }: { fill: string; onClick: () => void }) {
  return (
    <button type="button" aria-label="Skapa ny lista" title="Skapa ny lista" onClick={onClick}
      className="group fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] right-[calc(max(0px,(100vw-36rem)/2)+1rem)] z-40 block cursor-pointer transition-transform duration-200 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:scale-95">
      <svg width="65.0558" height="65.9401" viewBox="0 0 65.0558 65.9401" fill="none" className="a-pop block overflow-visible" aria-hidden>
        {/* Skuggan är en riktig form i stället för ett SVG-filter, så kanterna blir skarpa på alla skärmar */}
        <rect x="4" y="4" width="61.0558" height="61.9401" rx="30.5279" fill="#1C1917" />
        <rect width="61.0558" height="61.9401" rx="30.5279" fill={fill} style={{ transition: 'fill .3s' }} />
        <rect x="1.47547" y="1.47547" width="58.1048" height="58.9891" rx="29.0524" stroke="#1C1917" strokeWidth="2.95093" />
        <path className="origin-center transition-transform duration-300 [transform-box:fill-box] group-hover:rotate-90" d="M15.7321 30.7651C20.8061 30.4485 25.8688 30.2959 30.9201 30.3073M30.9201 30.3073C35.7316 30.3183 40.5327 30.4781 45.3237 30.7867M30.9201 30.3073C30.9015 25.4307 30.6989 20.5723 30.3122 15.7321M30.9201 30.3073C30.9403 35.5862 30.7448 40.8864 30.3338 46.2079" strokeWidth="4.31364" strokeLinecap="round" strokeLinejoin="round" stroke="#1C1917" />
      </svg>
    </button>
  )
}

// Fokus utan att sidan hoppar iväg
const focusNoScroll = (el: HTMLInputElement | null) => el?.focus({ preventScroll: true })

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div data-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 a-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card a-pop w-full max-w-sm max-h-[90dvh] p-4 flex flex-col gap-3" style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>{children}</div>
    </div>
  )
}
const Radio = ({ on, onClick }: { on: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className="size-[25px] shrink-0 cursor-pointer" aria-label="markera">
    <img key={String(on)} src={`${A}/${on ? 'radio-done' : '225a9'}.svg`} alt="" className={`size-full ${on ? 'a-radio' : ''}`} />
  </button>
)

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1C1917" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M2 2l10 10M12 2L2 12" /></svg>
)
const Grip = () => (
  <svg width="12" height="18" viewBox="0 0 12 18" fill="#1C1917" aria-hidden>{[3, 9, 15].flatMap((y) => [3, 9].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />))}</svg>
)
function IconBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-[3px] border-[#1C1917] bg-[#EFE7DC] transition-all duration-150 hover:bg-[#EA5354]/25 active:translate-y-px">
      <XIcon />
    </button>
  )
}
function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="hd text-[length:var(--t-0)]">{label}{hint && <span className="ml-2 font-normal opacity-60">{hint}</span>}</label>
      {children}
      {error && <p role="alert" className="hw a-msg text-[#c0392b]">{error}</p>}
    </div>
  )
}

function Editor({ init, cats, defCat, onSave, onClose, onDelete, onAddCat, justAdded, onAddedHandled }: { init?: List; cats: Cat[]; defCat: string; onSave: (l: List) => void; onClose: () => void; onDelete?: () => void; onAddCat: () => void; justAdded: string | null; onAddedHandled: () => void }) {
  const [l, setL] = useState<List>(init ?? { id: uid(), title: '', note: '', cat: defCat, sections: [{ id: uid(), title: '', items: [it('')] }] })
  const [start] = useState(() => JSON.stringify(l))
  const [ask, setAsk] = useState(false)
  const [errs, setErrs] = useState<{ cat?: string; title?: string }>({})
  const [dragId, setDragId] = useState<string | null>(null)
  useEffect(() => {
    if (!justAdded) return
    setL((p) => ({ ...p, cat: justAdded })); setErrs((e) => ({ ...e, cat: undefined })); onAddedHandled()
  }, [justAdded]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(l) !== start
  const tryClose = () => (dirty ? setAsk(true) : onClose())
  const save = () => {
    const e: { cat?: string; title?: string } = {}
    if (!l.cat) e.cat = 'Välj en kategori.'
    if (!l.title.trim()) e.title = 'Skriv en rubrik.'
    if (e.cat || e.title) {
      setAsk(false); setErrs(e)
      setTimeout(() => document.getElementById(e.cat ? 'f-cat' : 'f-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    onSave({ ...l, sections: l.sections.map((s) => ({ ...s, items: s.items.filter((t) => t.pause || t.text.trim()) })) })
  }
  const upd = (si: number, f: (s: Section) => Section) => setL((p) => ({ ...p, sections: p.sections.map((s, i) => (i === si ? f(s) : s)) }))
  // Autoskroll i formuläret när du drar nära kanten
  const autoscroll = (from: HTMLElement, y0: number) => {
    const sc = from.closest('.overflow-y-auto') as HTMLElement | null
    let y = y0
    const track = (ev: PointerEvent) => { y = ev.clientY }
    addEventListener('pointermove', track)
    const iv = setInterval(() => {
      if (!sc) return
      const r = sc.getBoundingClientRect()
      if (y > r.bottom - 90) sc.scrollTop += 14
      else if (y < r.top + 90) sc.scrollTop -= 14
    }, 16)
    return () => { clearInterval(iv); removeEventListener('pointermove', track) }
  }
  // Dra tasks och pauser upp/ner inom en grupp via handtaget till vänster
  const startDrag = (e: React.PointerEvent<HTMLElement>, si: number, id: string) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragId(id)
    const wrap = e.currentTarget.closest('[data-sec]') as HTMLElement
    const stopScroll = autoscroll(e.currentTarget, e.clientY)
    const move = (ev: PointerEvent) => {
      const rows = Array.from(wrap.querySelectorAll<HTMLElement>('[data-row]')).filter((r) => r.dataset.row !== id)
      let idx = rows.filter((r) => { const b = r.getBoundingClientRect(); return ev.clientY > b.top + b.height / 2 }).length
      setL((prev) => ({
        ...prev,
        sections: prev.sections.map((sec, i) => {
          if (i !== si) return sec
          const cur = sec.items.findIndex((t) => t.id === id)
          if (cur < 0) return sec
          const rest = sec.items.filter((t) => t.id !== id)
          const minIdx = sec.items[cur].pause ? Math.min(1, rest.length) : 0 // pausen kan inte ligga först
          idx = Math.min(Math.max(idx, minIdx), rest.length)
          if (cur === idx) return sec
          return { ...sec, items: [...rest.slice(0, idx), sec.items[cur], ...rest.slice(idx)] }
        }),
      }))
    }
    const up = () => { stopScroll(); setDragId(null); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  // Dra hela underrubriker (grupper) upp/ner
  const [secDragId, setSecDragId] = useState<string | null>(null)
  const startSecDrag = (e: React.PointerEvent<HTMLElement>, id: string) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSecDragId(id)
    const stopScroll = autoscroll(e.currentTarget, e.clientY)
    const move = (ev: PointerEvent) => {
      const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-secid]')).filter((x) => x.dataset.secid !== id)
      const idx = secs.filter((x) => { const b = x.getBoundingClientRect(); return ev.clientY > b.top + b.height / 2 }).length
      setL((prev) => {
        const cur = prev.sections.findIndex((x) => x.id === id)
        if (cur < 0 || cur === idx) return prev
        const rest = prev.sections.filter((x) => x.id !== id)
        return { ...prev, sections: [...rest.slice(0, idx), prev.sections[cur], ...rest.slice(idx)] }
      })
    }
    const up = () => { stopScroll(); setSecDragId(null); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const color = cats.find((c) => c.name === l.cat)?.color ?? '#c4bbfe'
  const field = 'field hw'
  const taskCount = l.sections.reduce((n, s) => n + s.items.filter((t) => !t.pause).length, 0)

  return (
    <div data-overlay className="fixed inset-0 z-50 flex flex-col bg-[#EFE7DC] a-slide">
      {ask && (
        <Modal onClose={() => setAsk(false)}>
          <h2 className="hd text-[length:var(--t-2)]">VILL DU SPARA ÄNDRINGARNA?</h2>
          <p className="hw">Du har gjort ändringar som inte är sparade.</p>
          <button className="btn !bg-[#439775]" onClick={save}>SPARA ÄNDRINGAR</button>
          <button className="btn !bg-[#EA5354]" onClick={onClose}>RADERA ÄNDRINGAR</button>
          <button className="btn" onClick={() => setAsk(false)}>FORTSÄTT REDIGERA</button>
        </Modal>
      )}

      {/* Toppfält */}
      <header className="shrink-0 border-b-4 border-[#1C1917] pt-[max(2rem,calc(env(safe-area-inset-top)+1rem))] transition-colors duration-300" style={{ background: color }}>
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pb-4">
          <button type="button" aria-label="Stäng" onClick={tryClose} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#1C1917] bg-[#EFE7DC] transition-transform hover:rotate-90 active:scale-90"><XIcon /></button>
          <h1 className="hd flex-1 text-[length:var(--t-2)] leading-tight">{init ? 'REDIGERA LISTA' : 'NY LISTA'}</h1>
          <span className="hw hidden text-[length:var(--t-0)] sm:inline">{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
        </div>
      </header>

      {/* Formulär */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <form className="mx-auto flex max-w-xl flex-col gap-6 px-4 pb-10 pt-6" onSubmit={(e) => { e.preventDefault(); save() }}>
          <Field id="f-cat" label="KATEGORI" error={errs.cat}>
            <div id="f-cat" role="radiogroup" aria-label="Kategori" className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = l.cat === c.name
                return (
                  <button key={c.name} type="button" role="radio" aria-checked={on} onClick={() => { setL({ ...l, cat: c.name }); setErrs({ ...errs, cat: undefined }) }}
                    className={`hd flex cursor-pointer items-center gap-2 rounded-full border-[3px] border-[#1C1917] px-3.5 py-1.5 text-[length:var(--t-0)] transition-all duration-200 ${on ? '-translate-x-px -translate-y-px shadow-[3px_3px_0_#1C1917]' : 'bg-[#EFE7DC] hover:-translate-y-px'}`}
                    style={on ? { background: c.color } : undefined}>
                    <span className="size-3 rounded-full border-2 border-[#1C1917]" style={{ background: c.color }} />{c.name}
                  </button>
                )
              })}
              <button type="button" onClick={onAddCat} className="hd flex cursor-pointer items-center gap-2 rounded-full border-[3px] border-dashed border-[#1C1917] px-3.5 py-1.5 text-[length:var(--t-0)] transition-all duration-200 hover:bg-black/5 active:scale-95">+ NY KATEGORI</button>
            </div>
          </Field>

          <Field id="f-title" label="RUBRIK" hint="(obligatorisk)" error={errs.title}>
            <input id="f-title" className={`${field} hd !text-[length:var(--t-3)] uppercase leading-tight ${errs.title ? '!border-[#c0392b]' : ''}`} placeholder="T.EX. STÄDA KÖK" value={l.title} maxLength={60}
              onChange={(e) => { setL({ ...l, title: e.target.value.toUpperCase() }); setErrs({ ...errs, title: undefined }) }} />
          </Field>

          <Field id="f-note" label="ANTECKNING" hint="(valfritt)">
            <textarea id="f-note" rows={2} className={`${field} fs`} placeholder="En kort anteckning om listan" value={l.note ?? ''} onChange={(e) => setL({ ...l, note: e.target.value })} />
          </Field>

          <div className="flex flex-col gap-4">
            <h2 className="hd text-[length:var(--t-0)]">TASKS</h2>
            {l.sections.map((s, si) => (
              <section key={s.id} data-sec data-secid={s.id} aria-label={`Grupp ${si + 1}`} className={`flex flex-col gap-3 rounded-[15px] border-[3px] border-[#1C1917] bg-white/40 p-3 transition-all duration-200 ${secDragId === s.id ? 'scale-[1.02] bg-white/80 shadow-[8px_8px_0_#1C1917]' : 'shadow-[4px_4px_0_#2a2522]'}`}>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Dra gruppen" title="Dra för att flytta gruppen" onPointerDown={(e) => startSecDrag(e, s.id)} className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"><Grip /></button>
                  <input aria-label="Underrubrik" className={`${field} hd !text-[length:var(--t-0)] uppercase`} placeholder="UNDERRUBRIK (VALFRITT)" value={s.title} onChange={(e) => upd(si, (x) => ({ ...x, title: e.target.value.toUpperCase() }))} />
                  {l.sections.length > 1 && <IconBtn label="Ta bort grupp" onClick={() => setL({ ...l, sections: l.sections.filter((_, i) => i !== si) })} />}
                </div>

                {s.items.map((t, ti) =>
                  t.pause ? (
                    <div key={t.id} data-row={t.id} className={`a-fade flex items-center gap-2 rounded-xl border-[3px] border-dashed border-[#1C1917] bg-[#6da0b6]/20 py-1.5 pl-1 pr-2 transition-all duration-200 ${dragId === t.id ? 'scale-[1.02] bg-[#6da0b6]/40 shadow-[3px_3px_0_#1C1917]' : ''}`}>
                      <button type="button" aria-label="Dra pausen" title="Dra för att flytta pausen" onPointerDown={(e) => startDrag(e, si, t.id)} className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"><Grip /></button>
                      <span className="hd text-[length:var(--t-0)]">PAUS</span>
                      <select aria-label="Pausens längd" value={t.minutes ?? 5} onChange={(e) => upd(si, (x) => ({ ...x, items: x.items.map((y, i) => (i === ti ? { ...y, minutes: Number(e.target.value) } : y)) }))} className="field hd ml-auto !w-auto !py-1 text-[length:var(--t-0)]">
                        {PAUSE_OPTIONS.map((m) => <option key={m} value={m}>{m < 1 ? `${Math.round(m * 60)} SEK` : `${m} MIN`}</option>)}
                      </select>
                      <IconBtn label="Ta bort paus" onClick={() => upd(si, (x) => ({ ...x, items: x.items.filter((_, i) => i !== ti) }))} />
                    </div>
                  ) : (
                    <div key={t.id} data-row={t.id} className={`a-fade flex items-center gap-2 rounded-xl transition-all duration-200 ${dragId === t.id ? 'scale-[1.02] bg-[#6da0b6]/25 shadow-[3px_3px_0_#1C1917]' : ''}`}>
                      <button type="button" aria-label="Dra för att flytta task" title="Håll och dra för att flytta" onPointerDown={(e) => startDrag(e, si, t.id)} className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing">
                        <img src={`${A}/9da5b.svg`} alt="" className="size-[25px]" draggable={false} />
                      </button>
                      <input aria-label={`Task ${ti + 1}`} autoFocus={!t.text && ti > 0} className={field} placeholder="Skriv ett task" value={t.text}
                        onChange={(e) => upd(si, (x) => ({ ...x, items: x.items.map((y, i) => (i === ti ? { ...y, text: e.target.value } : y)) }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); upd(si, (x) => ({ ...x, items: [...x.items.slice(0, ti + 1), it(''), ...x.items.slice(ti + 1)] })) } }} />
                      <IconBtn label="Ta bort task" onClick={() => upd(si, (x) => ({ ...x, items: x.items.filter((_, i) => i !== ti) }))} />
                    </div>
                  ),
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" className="btn" onClick={() => upd(si, (x) => ({ ...x, items: [...x.items, it('')] }))}>+ TASK</button>
                  <button type="button" className="btn disabled:cursor-not-allowed disabled:opacity-40" disabled={!s.items.length || !!s.items[s.items.length - 1].pause}
                    title={!s.items.length ? 'Lägg till ett task först' : undefined} onClick={() => upd(si, (x) => ({ ...x, items: [...x.items, pz(), it('')] }))}>+ PAUS</button>
                </div>
              </section>
            ))}
            <button type="button" onClick={() => setL({ ...l, sections: [...l.sections, { id: uid(), title: '', items: [it('')] }] })}
              className="hd cursor-pointer rounded-[15px] border-[3px] border-dashed border-[#1C1917] px-4 py-3 text-[length:var(--t-0)] transition-all duration-200 hover:bg-black/5 active:scale-[.98]">+ LÄGG TILL UNDERRUBRIK</button>
          </div>

          {onDelete && (
            <div className="flex flex-col gap-2 rounded-[15px] border-[3px] border-[#EA5354] p-3">
              <h2 className="hd text-[length:var(--t-0)] text-[#c0392b]">FARLIG ZON</h2>
              <p className="hw">Att radera listan går inte att ångra.</p>
              <button type="button" className="btn !bg-[#EA5354] self-start" onClick={onDelete}>RADERA LISTA</button>
            </div>
          )}
        </form>
      </div>

      {/* Fast åtgärdsfält */}
      <footer className="shrink-0 border-t-4 border-[#1C1917] bg-[#EFE7DC] pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-4">
        <div className="mx-auto flex max-w-xl gap-3 px-4">
          <button type="button" className="btn flex-1 !py-2.5" onClick={tryClose}>AVBRYT</button>
          <button type="button" className="btn flex-[2] !bg-[#439775] !py-2.5" onClick={save}>{init ? 'SPARA ÄNDRINGAR' : 'SKAPA LISTA'}</button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const init = load()
  const [cats, setCats] = useState<Cat[]>(init.cats)
  const [lists, setLists] = useState<List[]>(init.lists)
  const [manual, setManual] = useState<boolean>(init.manual ?? false) // true = egen ordning på ALLT, annars flikordning
  const [tab, setTab] = useState('ALLT')
  const [editor, setEditor] = useState<{ list?: List } | null>(null)
  const [del, setDel] = useState<List | null>(null)
  const [finish, setFinish] = useState<{ list: List; sel: string[] } | null>(null)
  const [suggest, setSuggest] = useState<{ list: List; sel: string[] } | null>(null)
  const [catEdit, setCatEdit] = useState<{ orig: string; name: string; color: string; idx: number; del: boolean; err: string } | null>(null)
  const [addCat, setAddCat] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [addColor, setAddColor] = useState(COLORS[0])
  useEffect(() => { if (addCat !== null) setAddColor(COLORS[cats.length % COLORS.length]) }, [addCat === null]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => localStorage.setItem('tomoo3', JSON.stringify({ cats, lists, manual })), [cats, lists, manual])
  const color = (c: string) => cats.find((x) => x.name === c)?.color ?? COLORS[0]
  // På ALLT sorteras listorna efter kategorins plats i flikarna (stabil sortering behåller skapandeordningen inom en kategori)
  const catRank = (c: string) => cats.findIndex((x) => x.name === c)
  const shown = lists.filter((l) => tab === 'ALLT' || l.cat === tab).sort((a, b) => (tab === 'ALLT' && !manual ? catRank(a.cat) - catRank(b.cat) : 0))
  const active = shown.filter((l) => !l.leftover)
  const left = shown.filter((l) => l.leftover)
  const unfinished = (l: List) => l.sections.flatMap((s) => s.items.filter((t) => !t.done && !t.pause && !t.draft))
  const [arriving, setArriving] = useState<string[]>([])
  const [party, setParty] = useState<{ x: number; y: number } | null>(null)
  const [poof, setPoof] = useState<string | null>(null)
  const poofThen = (id: string, fn: () => void) => { setPoof(id); setTimeout(() => { fn(); setPoof(null) }, 650) }

  const draggingRef = useRef(false)
  // Snabbt lägga till tasks direkt på listan
  const [quickId, setQuickId] = useState<string | null>(null)
  // Headern har samma proportioner som i Figma (1080 × 730); komprimerad i snabbåtkomstläget
  const headerH = quickId ? `calc(${HEADER_MIN}px + var(--hd))` : 'var(--hfull)'
  const [quickText, setQuickText] = useState('')
  const [quickMoving, setQuickMoving] = useState(false)
  const [quickPos, setQuickPos] = useState<{ si: number; ii: number }>({ si: 0, ii: 0 })
  const quickDragging = useRef(false)
  const openQuick = (l: List) => {
    const si = l.sections.length - 1
    setQuickId(l.id); setQuickText(''); setQuickPos({ si, ii: l.sections[si].items.length })
  }
  const addQuick = (listId: string) => {
    const text = quickText.trim()
    if (!text) return
    const { si, ii } = quickPos
    setLists((prev) => prev.map((x) => {
      if (x.id !== listId) return x
      const sections = x.sections.map((sec, i) => (i === si ? { ...sec, items: [...sec.items.slice(0, ii), { ...it(text), draft: true }, ...sec.items.slice(ii)] } : sec))
      return { ...x, sections }
    }))
    setQuickText(''); setQuickPos({ si, ii: ii + 1 }) // nästa task hamnar under det du just lade till
  }
  // Spara: utkasten blir riktiga tasks (även text som är skriven men inte inskickad). Avbryt: utkasten tas bort.
  const finishQuick = (listId: string, save: boolean) => {
    const text = quickText.trim()
    const { si, ii } = quickPos
    setLists((prev) => prev.map((x) => {
      if (x.id !== listId) return x
      const sections = x.sections.map((sec, i) => {
        let items = sec.items
        if (save && text && i === si) items = [...items.slice(0, ii), { ...it(text), draft: true }, ...items.slice(ii)]
        items = save ? items.map((t) => (t.draft ? { ...t, draft: undefined } : t)) : items.filter((t) => !t.draft)
        return { ...sec, items }
      })
      return { ...x, sections }
    }))
    setQuickId(null); setQuickText('')
  }
  // Skrolla så fältet du skriver i syns (ovanför tangentbordet) när läget öppnas och när ett task läggs till
  useEffect(() => {
    if (!quickId || quickDragging.current) return
    const t = setTimeout(() => {
      const row = document.querySelector<HTMLElement>('[data-quickrow]')
      if (!row) return
      const vh = window.visualViewport?.height ?? innerHeight
      const top = row.getBoundingClientRect().top
      const wanted = HEADER_MIN + 40 + (vh - HEADER_MIN) * 0.3 // ungefär en tredjedel ner i den synliga ytan
      if (Math.abs(top - wanted) > 24) scrollBy({ top: top - wanted, behavior: 'smooth' })
    }, 420) // efter att headern hunnit krympa
    return () => clearTimeout(t)
  }, [quickId, quickPos.si, quickPos.ii]) // eslint-disable-line react-hooks/exhaustive-deps
  // Byter du flik avbryts snabbåtkomsten (utkasten tas bort)
  useEffect(() => { if (quickId) finishQuick(quickId, false) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  // Dra det nya tasket (innan det läggs till) upp och ner bland listans rader
  const startQuickDrag = (e: React.PointerEvent<HTMLElement>, l: List) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    quickDragging.current = true
    setQuickMoving(true)
    const card = e.currentTarget.closest('[data-list]') as HTMLElement
    const quickEl = e.currentTarget.closest('[data-quickrow]') as HTMLElement
    const y0 = e.clientY
    const move = (ev: PointerEvent) => {
      const y = ev.clientY
      if (Math.abs(y - y0) < 14) return // dödzon så en vanlig tryckning inte flyttar något
      const rows = Array.from(card.querySelectorAll<HTMLElement>('[data-item]'))
      const qTop = quickEl.getBoundingClientRect().top
      const margin = 12 // måste passera radens mitt med marginal, annars ändras inget (mindre känsligt)
      // låst till den här listan: rader utanför kortet räknas aldrig
      const g = rows.filter((r) => {
        const b = r.getBoundingClientRect(), mid = b.top + b.height / 2
        return b.top < qTop ? y > mid - margin : y > mid + margin
      }).length
      const next = g < rows.length
        ? { si: Number(rows[g].dataset.si), ii: Number(rows[g].dataset.ii) }
        : { si: l.sections.length - 1, ii: l.sections[l.sections.length - 1].items.length }
      setQuickPos((p) => (p.si === next.si && p.ii === next.ii ? p : next))
    }
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      quickDragging.current = false; setQuickMoving(false)
      document.querySelector<HTMLInputElement>('[data-quick-input]')?.focus({ preventScroll: true })
    }
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const [dragId, setDragId] = useState<string | null>(null)
  const prevTops = useRef(new Map<string, number>())
  // FLIP: korten glider mjukt till sin nya plats när ordningen ändras under dragning
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    document.querySelectorAll<HTMLElement>('[data-list]').forEach((el) => {
      const id = el.dataset.list!
      const top = el.getBoundingClientRect().top + scrollY
      if (draggingRef.current && id !== dragId) {
        const prev = prevTops.current.get(id)
        if (prev !== undefined && Math.abs(prev - top) > 2) el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.3,1)' })
      }
      next.set(id, top)
    })
    prevTops.current = next
  })
  // Håll inne på en lista för att dra den till valfri plats
  const startPress = (e: React.PointerEvent<HTMLElement>, l: List) => {
    if (e.button > 0 || (e.target as HTMLElement).closest('button, a, input, textarea, select')) return
    const el = e.currentTarget
    const x0 = e.clientX; let y = e.clientY; const y0 = y
    let started = false, raf = 0, grab = 0, dy = 0, h = 0
    const wasLeft = !!l.leftover
    const block = (ev: TouchEvent) => ev.cancelable && ev.preventDefault()
    const step = () => {
      const r = el.getBoundingClientRect()
      const layoutTop = r.top - dy
      dy = y - grab - layoutTop
      el.style.transform = `translateY(${dy}px) scale(1.03)`
      const center = y - grab + h / 2
      const cur = el.dataset.group
      // En ofärdig lista som dras ovanför OFÄRDIGT-linjen blir en vanlig lista (och tvärtom under samma drag)
      const divider = document.querySelector<HTMLElement>('[data-divider]')
      const target = wasLeft && divider ? (center < divider.getBoundingClientRect().top ? 'main' : 'left') : cur
      const inGroup = Array.from(document.querySelectorAll<HTMLElement>(`[data-list][data-group="${target}"]`))
      const others = inGroup.filter((o) => o !== el)
      const idx = others.filter((o) => { const b = o.getBoundingClientRect(); return center > b.top + b.height / 2 }).length
      if (target !== cur || idx !== inGroup.indexOf(el)) {
        const targetId = others[idx]?.dataset.list, lastId = others[others.length - 1]?.dataset.list
        setLists((prev) => {
          const found = prev.find((x) => x.id === l.id)!
          const item: List = { ...found, leftover: target === 'left' }
          const rest = prev.filter((x) => x.id !== l.id)
          if (targetId) rest.splice(rest.findIndex((x) => x.id === targetId), 0, item)
          else if (lastId) rest.splice(rest.findIndex((x) => x.id === lastId) + 1, 0, item)
          else if (target === 'main') rest.unshift(item)
          else rest.push(item)
          return rest
        })
      }
      if (y > innerHeight - 110) scrollBy(0, 12)
      else if (y < (document.querySelector('header')?.getBoundingClientRect().height ?? 254) + 60) scrollBy(0, -12)
      raf = requestAnimationFrame(step)
    }
    const onMove = (ev: PointerEvent) => {
      y = ev.clientY
      if (!started && Math.hypot(ev.clientX - x0, y - y0) > 8) end(false)
    }
    const end = (wasStarted = started) => {
      clearTimeout(timer); cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      removeEventListener('touchmove', block)
      if (wasStarted) {
        el.style.transition = 'transform .22s cubic-bezier(.2,.8,.3,1)'
        el.style.transform = ''
        setTimeout(() => { el.style.transition = ''; draggingRef.current = false; setDragId(null) }, 240)
      }
    }
    const up = () => end()
    const timer = setTimeout(() => {
      started = true
      draggingRef.current = true
      navigator.vibrate?.(15)
      if (tab === 'ALLT' && !manual) { setLists((p) => [...p].sort((a, b) => catRank(a.cat) - catRank(b.cat))); setManual(true) }
      setDragId(l.id)
      const r = el.getBoundingClientRect()
      grab = y0 - r.top; h = r.height
      addEventListener('touchmove', block, { passive: false })
      raf = requestAnimationFrame(step)
    }, 380)
    addEventListener('pointermove', onMove); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const [tabDrag, setTabDrag] = useState<string | null>(null)
  const justDragged = useRef(false)
  const prevLefts = useRef(new Map<string, number>())
  // FLIP för flikarna när ordningen ändras under dragning
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    document.querySelectorAll<HTMLElement>('nav [data-tab]').forEach((el) => {
      const id = el.dataset.tab!, left = el.offsetLeft
      if (tabDrag && id !== tabDrag) {
        const prev = prevLefts.current.get(id)
        if (prev !== undefined && Math.abs(prev - left) > 2) el.animate([{ transform: `translateX(${prev - left}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.3,1)' })
      }
      next.set(id, left)
    })
    prevLefts.current = next
  })
  // Håll inne på en kategoriflik för att dra den till en ny plats (ALLT ligger alltid först)
  const startTabPress = (e: React.PointerEvent<HTMLElement>, name: string) => {
    if (name === 'ALLT' || e.button > 0) return
    const el = e.currentTarget, nav = el.parentElement as HTMLElement
    const x0 = e.clientX; let x = x0
    let started = false, raf = 0, grab = 0, dx = 0, w = 0, moved = false
    const block = (ev: TouchEvent) => ev.cancelable && ev.preventDefault()
    const step = () => {
      const r = el.getBoundingClientRect()
      dx = x - grab - (r.left - dx)
      el.style.transform = `translateX(${dx}px) translateY(-3px) scale(1.08)`
      const tabs = Array.from(nav.querySelectorAll<HTMLElement>('[data-tab]')).filter((t) => t.dataset.tab !== 'ALLT')
      const others = tabs.filter((t) => t !== el)
      const center = x - grab + w / 2
      const idx = others.filter((t) => { const b = t.getBoundingClientRect(); return center > b.left + b.width / 2 }).length
      if (idx !== tabs.indexOf(el)) {
        moved = true
        setCats((prev) => {
          const item = prev.find((c) => c.name === name)!
          const rest = prev.filter((c) => c.name !== name)
          rest.splice(idx, 0, item)
          return rest
        })
      }
      const nr = nav.getBoundingClientRect()
      if (x > nr.right - 50) nav.scrollLeft += 8
      else if (x < nr.left + 50) nav.scrollLeft -= 8
      raf = requestAnimationFrame(step)
    }
    const onMove = (ev: PointerEvent) => {
      x = ev.clientX
      if (!started && Math.hypot(ev.clientX - x0, ev.clientY - e.clientY) > 8) end(false)
    }
    const end = (wasStarted = started) => {
      clearTimeout(timer); cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      removeEventListener('touchmove', block)
      if (wasStarted) {
        justDragged.current = true
        el.style.transition = 'transform .22s cubic-bezier(.2,.8,.3,1)'
        el.style.transform = ''
        if (moved) setManual(false) // ny flikordning gäller igen på ALLT
        setTimeout(() => { el.style.transition = ''; draggingRef.current = false; setTabDrag(null) }, 240)
        setTimeout(() => { justDragged.current = false }, 350)
      }
    }
    const up = () => end()
    const timer = setTimeout(() => {
      started = true
      draggingRef.current = true
      navigator.vibrate?.(15)
      setTabDrag(name)
      const r = el.getBoundingClientRect()
      grab = x0 - r.left; w = r.width
      el.style.transition = 'none'
      addEventListener('touchmove', block, { passive: false })
      raf = requestAnimationFrame(step)
    }, 380)
    addEventListener('pointermove', onMove); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  // Egen gummiband-effekt så att sidan känns likadan på iOS och Android
  const bandRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = bandRef.current!
    const LIMIT = 130
    let sx = 0, sy = 0, axis: 'x' | 'y' | null = null, pull = 0, last = 0, vel = 0, lastT = 0, active = false, raf = 0, off = 0
    const set = (v: number) => { off = v; el.style.transform = v ? `translate3d(0,${v}px,0)` : '' }
    const rubber = (p: number) => Math.sign(p) * LIMIT * (1 - 1 / (Math.abs(p) / LIMIT + 1))
    const atTop = () => scrollY <= 0
    const atBottom = () => scrollY + innerHeight >= document.documentElement.scrollHeight - 1
    const start = (e: TouchEvent) => {
      cancelAnimationFrame(raf)
      active = !(e.target as HTMLElement).closest('[data-overlay], nav')
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; axis = null
      pull = off ? Math.sign(off) * LIMIT * (Math.abs(off) / (LIMIT - Math.abs(off))) : 0
      last = e.touches[0].clientY; lastT = performance.now(); vel = 0
    }
    const move = (e: TouchEvent) => {
      if (!active || draggingRef.current) return
      if (!axis) {
        // Vänta tills riktningen är tydlig; sidledsdrag (flikarna) lämnas helt åt webbläsaren
        const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        last = e.touches[0].clientY; lastT = performance.now()
      }
      if (axis === 'x') return
      const y = e.touches[0].clientY, d = y - last, now = performance.now()
      last = y
      const next = pull + d
      const ok = (next > 0 && atTop()) || (next < 0 && atBottom())
      if (!ok) { pull = 0; if (off) set(0); return }
      pull = next
      vel = (rubber(pull) - off) / Math.max(now - lastT, 1) * 1000; lastT = now
      set(rubber(pull))
      if (e.cancelable) e.preventDefault()
    }
    const end = () => {
      if (!off) return
      let x = off, v = Math.max(-1500, Math.min(1500, vel)), t0 = performance.now()
      const k = 220, c = 11 // fjäder: lätt gelé-svängning
      const step = (t: number) => {
        const dt = Math.min((t - t0) / 1000, 0.032); t0 = t
        v += (-k * x - c * v) * dt; x += v * dt
        if (Math.abs(x) < 0.4 && Math.abs(v) < 8) return set(0)
        set(x); raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    addEventListener('touchstart', start, { passive: true })
    addEventListener('touchmove', move, { passive: false })
    addEventListener('touchend', end); addEventListener('touchcancel', end)
    return () => { removeEventListener('touchstart', start); removeEventListener('touchmove', move); removeEventListener('touchend', end); removeEventListener('touchcancel', end); cancelAnimationFrame(raf) }
  }, [])
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const tabsRef = useRef({ tab, order: ['ALLT'] as string[] })
  tabsRef.current = { tab, order: ['ALLT', ...cats.map((c) => c.name)] }
  // Centrera aktiv flik i flikraden (även när du byter med svep)
  useEffect(() => {
    const b = document.querySelector<HTMLElement>(`nav [data-tab="${CSS.escape(tab)}"]`)
    const nav = b?.parentElement
    if (b && nav) nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' })
  }, [tab])
  // Svep höger/vänster för att byta kategori
  useEffect(() => {
    let sx = 0, sy = 0, t0 = 0, ok = false
    const start = (e: TouchEvent) => {
      const el = e.target as HTMLElement
      ok = e.touches.length === 1 && !el.closest('[data-overlay], nav, input, textarea, select')
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = performance.now()
    }
    const end = (e: TouchEvent) => {
      if (!ok || draggingRef.current) { ok = false; return }
      ok = false
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || performance.now() - t0 > 700) return
      const { tab: cur, order } = tabsRef.current
      const i = order.indexOf(cur), n = i + (dx < 0 ? 1 : -1)
      if (n < 0 || n >= order.length) return
      setDir(dx < 0 ? 'next' : 'prev'); setTab(order[n])
    }
    addEventListener('touchstart', start, { passive: true }); addEventListener('touchend', end, { passive: true })
    return () => { removeEventListener('touchstart', start); removeEventListener('touchend', end) }
  }, [])
  const origin = useRef({ x: innerWidth / 2, y: innerHeight })
  const [pauseEnd, setPauseEnd] = useState<number | null>(null)
  const [pauseTotal, setPauseTotal] = useState(1)
  const [pauseItem, setPauseItem] = useState<string | null>(null) // vilken paus i en lista som pågår
  const [now, setNow] = useState(() => Date.now())
  const audio = useRef<AudioContext | null>(null)
  const pauseMsg = pauseEnd !== null
  const secondsLeft = pauseEnd === null ? 0 : Math.max(0, Math.ceil((pauseEnd - now) / 1000))
  const toggle = (id: string, tid: string) => {
    setLists(lists.map((l) => (l.id === id ? { ...l, sections: l.sections.map((s) => ({ ...s, items: s.items.map((t) => (t.id === tid ? { ...t, done: !t.done } : t)) })) } : l)))
    const l = lists.find((x) => x.id === id)
    for (const sec of l?.sections ?? []) {
      const i = sec.items.findIndex((t) => t.id === tid)
      if (i >= 0) {
        const goingDone = !sec.items[i].done
        // Första pausen efter tasket; pausen aktiveras när ALLA tasks ovanför den är klara, i vilken ordning som helst
        const j = sec.items.findIndex((t, k) => k > i && t.pause)
        const next = j >= 0 ? sec.items[j] : undefined
        const allAboveDone = j >= 0 && sec.items.slice(0, j).every((t, k) => t.pause || k === i || t.done)
        if (goingDone && next && allAboveDone) {
          // Skapa/väck ljudet nu, medan användaren interagerar, så det får spelas när timern är slut
          try { audio.current ??= new AudioContext(); void audio.current.resume(); void loadMoo(audio.current).catch(() => {}) } catch { /* inget ljud */ }
          setNow(Date.now()); setPauseTotal((next.minutes ?? 5) * 60000); setPauseItem(next.id); setPauseEnd(Date.now() + (next.minutes ?? 5) * 60000)
        } else if (!goingDone) setPauseEnd(null)
      }
    }
  }
  useEffect(() => {
    if (pauseEnd === null) return
    const iv = setInterval(() => {
      const n = Date.now(); setNow(n)
      if (n >= pauseEnd) {
        clearInterval(iv); setPauseEnd(null)
        if (audio.current) { try { void audio.current.resume(); void playMoo(audio.current).catch(() => {}) } catch { /* inget ljud */ } }
      }
    }, 250)
    return () => clearInterval(iv)
  }, [pauseEnd])
  const complete = (l: List, e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    doComplete(l)
    if (!(unfinished(l).length && !l.leftover)) setParty(origin.current)
  }
  const doComplete = (l: List) => (unfinished(l).length && !l.leftover ? setFinish({ list: l, sel: unfinished(l).map((t) => t.id) }) : (poofThen(l.id, () => setLists((p) => p.filter((x) => x.id !== l.id)))))
  const confirmFinish = (save: boolean) => {
    if (!finish) return
    const { list, sel } = finish
    const keep = unfinished(list).filter((t) => sel.includes(t.id))
    const newId = uid()
    const add = () => setLists((p) => {
      const next = p.filter((x) => x.id !== list.id)
      return save && keep.length ? [...next, { id: newId, title: list.title, cat: list.cat, leftover: true, sections: [{ id: uid(), title: '', items: keep }] }] : next
    })
    setFinish(null)
    setParty(origin.current)
    if (!(save && keep.length) || reduced()) return poofThen(list.id, add)
    // 1) plocka ut  2) listan poofar  3) tasks flyger ner till nya listan
    const lifted = liftTasks(keep.map((t) => t.id))
    setArriving(keep.map((t) => t.id))
    setTimeout(() => poofThen(list.id, () => { add(); setTimeout(() => landTasks(lifted, newId, () => setArriving([])), 80) }), 450)
  }
  const saveList = (l: List) => {
    const isNew = !lists.some((x) => x.id === l.id)
    setLists(isNew ? [...lists.filter((x) => true), l] : lists.map((x) => (x.id === l.id ? l : x)))
    setEditor(null)
    if (isNew) {
      const lo = lists.filter((x) => x.leftover && x.cat === l.cat)
      if (lo.length) setSuggest({ list: l, sel: lo.flatMap((x) => x.sections.flatMap((s) => s.items.filter((t) => !t.pause).map((t) => t.id))) })
    }
  }
  const confirmSuggest = (yes: boolean) => {
    if (!suggest) return
    const { list, sel } = suggest
    if (yes && sel.length) {
      const moved: Item[] = []
      const rest = lists.map((x) => {
        if (!(x.leftover && x.cat === list.cat)) return x
        const sections = x.sections.map((s) => ({ ...s, items: s.items.filter((t) => (sel.includes(t.id) ? (moved.push({ ...t, done: false }), false) : true)) }))
        return { ...x, sections }
      }).filter((x) => !x.leftover || x.sections.some((s) => s.items.length))
      setLists(rest.map((x) => (x.id === list.id ? { ...x, sections: [...x.sections, { id: uid(), title: 'OFÄRDIGT FRÅN TIDIGARE:', items: moved }] } : x)))
    }
    setSuggest(null)
  }

  // Raden där det nya tasket skrivs; kan dras upp/ner via cirkeln innan den läggs till
  const quickRow = (l: List, si: number, ii: number) => {
    if (quickId !== l.id || quickPos.si !== si || quickPos.ii !== ii) return null
    return (
      <div key="quick" data-quickrow className={`a-fade flex items-center gap-2 rounded-xl transition-all duration-200 ${quickMoving ? 'scale-[1.02] bg-[#6da0b6]/25 shadow-[3px_3px_0_#1C1917]' : ''}`}>
        <button type="button" aria-label="Dra för att flytta det nya tasket" title="Håll och dra för att flytta" onPointerDown={(e) => startQuickDrag(e, l)} onMouseDown={(e) => e.preventDefault()}
          className="-my-2 flex size-10 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"><img src={`${A}/225a9.svg`} alt="" className="size-[25px] opacity-60" draggable={false} /></button>
        <input data-quick-input ref={focusNoScroll} aria-label="Nytt task" className="field hw !py-1" placeholder="Skriv ett task och tryck Enter" value={quickText} enterKeyHint="done"
          onChange={(e) => setQuickText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuick(l.id) } }} />
        <button type="button" aria-label="Lägg till task" onMouseDown={(e) => e.preventDefault()} onClick={() => addQuick(l.id)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-[3px] border-[#1C1917] bg-[#439775] text-lg font-black leading-none transition-transform active:scale-90">+</button>
      </div>
    )
  }

  const Card = (l: List) => (
    <div key={l.id} data-list={l.id} data-group={l.leftover ? 'left' : 'main'} onPointerDown={(e) => startPress(e, l)} onContextMenu={(e) => dragId && e.preventDefault()}
      className={`relative select-none [-webkit-touch-callout:none] ${dragId === l.id ? 'z-30 [&>.card]:shadow-[14px_14px_0_#2a2522]' : ''}`}>
      <div className={`card a-up flex flex-col gap-4 pb-4 ${poof === l.id ? 'a-poof' : ''}`}>
      <div className="flex items-center justify-between border-b-4 border-[#1C1917] p-4" style={{ background: color(l.cat) }}>
        <span className="hd text-[length:var(--t-1)]">{l.cat}</span>
        <button aria-label="Redigera" className="-m-1 flex size-11 cursor-pointer items-center justify-center transition-transform duration-300 hover:rotate-45 active:scale-90" onClick={() => setEditor({ list: l })}>
          <img src={`${A}/gear.svg`} alt="" className="h-[30px] w-auto" />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-4">
        <h2 className="hd text-[length:var(--t-4)] leading-none break-words">{l.title}</h2>
        {l.note && <p className="hw -mt-2">{l.note}</p>}
        {l.sections.map((s, si) => (
          <div key={s.id} className="flex flex-col gap-2">
            {s.title && (() => { const real = s.items.filter((t) => !t.pause); const all = real.length > 0 && real.every((t) => t.done); return <p className={`hd text-[length:var(--t-1)] transition-colors duration-300 ${all ? 'text-[#9A938B]' : ''}`}>{s.title}</p> })()}
            {[...s.items.flatMap((t, ii) => [quickRow(l, si, ii), t.pause ? (
              <div key={t.id} data-item data-si={si} data-ii={ii} className="flex items-center gap-2"><div className="flex-1 border-t-[3px] border-dashed border-[#1C1917]" />
                {pauseEnd !== null && pauseItem === t.id
                  ? <button className="btn a-pop !bg-[#EA5354] !py-1" onClick={() => setPauseEnd(null)}>AVSLUTA PAUSEN</button>
                  : <span className="hd text-[length:var(--t-0)]">PAUS</span>}
                <div className="flex-1 border-t-[3px] border-dashed border-[#1C1917]" /></div>
            ) : (
              <div key={t.id} data-item data-si={si} data-ii={ii} data-task={t.id} style={{ opacity: arriving.includes(t.id) ? 0 : 1 }} className="a-fade flex items-start gap-2 hw">
                {t.draft ? <img src={`${A}/9da5b.svg`} alt="" className="size-[25px] shrink-0" /> : <Radio on={t.done} onClick={() => toggle(l.id, t.id)} />}
                <span className={`pt-1 transition-colors duration-300 ${t.draft ? 'text-[#46636F]' : t.done ? 'text-[#9A938B] line-through' : ''}`}>{t.text}</span>
              </div>
            )]), quickRow(l, si, s.items.length)]}
          </div>
        ))}
        {quickId === null && (
          <button type="button" onClick={() => openQuick(l)} className="hw group flex cursor-pointer items-start gap-2 self-start text-left text-[#46636F]">
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" className="shrink-0 transition-transform duration-300 group-hover:rotate-90" aria-hidden><path d="M5.5 12.5h14M12.5 5.5v14" stroke="#46636F" strokeWidth="3.4" strokeLinecap="round" /></svg>
            <span className="pt-1 transition-transform duration-200 group-hover:translate-x-0.5">Lägg till task</span>
          </button>
        )}
        {quickId === l.id ? (
          <div className="a-fade flex gap-2">
            <button className="btn !bg-[#439775]" onClick={() => finishQuick(l.id, true)}>SPARA</button>
            <button className="btn" onClick={() => finishQuick(l.id, false)}>AVBRYT</button>
          </div>
        ) : (
          <button className="btn self-start" onClick={(e) => complete(l, e)}>KLAR!</button>
        )}
      </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl overflow-x-clip bg-[#EFE7DC]" style={{ '--hfull': 'calc(min(100vw, 36rem) * 0.6759)', '--hd': 'max(2.25rem, calc(env(safe-area-inset-top) + 0.75rem))' } as React.CSSProperties}>
      <header className="sticky top-0 z-30 overflow-hidden bg-[#6da0b6] transition-[height] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] [container-type:inline-size]" style={{ height: headerH }}>
        <div className="absolute inset-x-0 top-0 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ height: 'var(--hfull)', transform: quickId ? `translateY(calc(${HEADER_MIN}px + var(--hd) - var(--hfull)))` : 'translateY(var(--hd))' }}>
        <div className="absolute inset-x-0 bottom-0 bg-[#a8ab5a]" style={{ top: '38.49cqw' }} />
        <div className="pointer-events-none absolute" style={{ left: '-5.79cqw', top: '21.33cqw', width: '110.15cqw' }}>
          <img src={import.meta.env.BASE_URL + 'assets/grass.png'} alt="" className="block w-full" />
          <img src={import.meta.env.BASE_URL + 'assets/cow-base-v4.png'} alt="" className={`absolute inset-0 block w-full transition-opacity duration-500 ${pauseMsg ? 'opacity-0' : 'opacity-100'}`} />
          <img src={import.meta.env.BASE_URL + 'assets/cow.png'} alt="" aria-hidden className={`ear absolute inset-0 block w-full transition-opacity duration-500 ${pauseMsg ? 'opacity-0' : 'opacity-100'}`} style={{ clipPath: 'polygon(53.9% 22.7%,54.6% 18.4%,56.2% 15.3%,58.2% 14.2%,58.2% 22.4%,56.4% 24.4%,54.8% 25.5%)' }} />
          <img src={import.meta.env.BASE_URL + 'assets/cow.png'} alt="" aria-hidden className={`ear2 absolute inset-0 block w-full transition-opacity duration-500 ${pauseMsg ? 'opacity-0' : 'opacity-100'}`} style={{ clipPath: 'polygon(66.2% 22.4%,66.7% 18.7%,67.7% 18.7%,68.8% 21.5%,69.9% 24.9%,70.7% 27.8%,70.5% 30.0%,69.3% 30.6%,68.1% 28.6%,66.8% 25.8%,66.2% 24.1%)' }} />
          {!pauseMsg && (
            <svg viewBox="0 0 1200 353" className="blink absolute inset-0 block w-full" aria-hidden>
              {[[703.2, 85.8], [763.8, 93.8]].map(([x, y]) => (
                <g key={x}>
                  <circle cx={x} cy={y} r="9" fill="#EFE7DC" />
                  <path d={`M${x - 8} ${y - 1} q8 7 16 0`} fill="none" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
                </g>
              ))}
            </svg>
          )}
          <img src={import.meta.env.BASE_URL + 'assets/cow-eating-v5.png'} alt="" className={`absolute inset-0 block w-full transition-opacity duration-500 ${pauseMsg ? 'opacity-100' : 'opacity-0'}`} />
          <img src={import.meta.env.BASE_URL + 'assets/cow-mouth-v2.png'} alt="" aria-hidden className={`chew absolute inset-0 block w-full transition-opacity duration-500 ${pauseMsg ? 'opacity-100' : 'opacity-0'}`} />
          <img src={import.meta.env.BASE_URL + 'assets/cow.png'} alt="" aria-hidden className="tail absolute inset-0 block w-full" style={{ clipPath: 'polygon(87.42% 26.35%,94.58% 26.35%,94.58% 75.07%,88.17% 75.07%,88.17% 31.44%,87.42% 31.44%)' }} />
        </div>
        {!pauseMsg ? (
          <div key="bubble-default" className="a-msg absolute inset-0">
            {/* Svansen ligger bakom bubblan så den aldrig skymmer texten */}
            <div className="absolute flex items-center justify-center" style={{ left: '40.926cqw', top: '16.667cqw', width: '15.73cqw', height: '15.025cqw' }}>
              <div className="flex-none rotate-[27.26deg]">
                <div className="relative" style={{ width: '12.235cqw', height: '10.598cqw' }}>
                  <div className="absolute inset-[-21.05%_-7.23%_-11.2%_-18.36%]"><img src={`${A}/bubble-tail.svg`} alt="" className="block size-full max-w-none" /></div>
                </div>
              </div>
            </div>
            <img src={`${A}/bubble-default.svg`} alt="" className="absolute max-w-none" style={{ left: '9.15cqw', top: '10.909cqw', width: '44.2cqw', height: '11.515cqw' }} />
            <span className="sr-only">LET'S GET MOOVING!</span>
          </div>
        ) : (
          <div key="bubble-pause" className="a-msg absolute inset-0">
            <div className="absolute overflow-hidden rounded-full bg-[#EFE7DC]" style={{ left: '4.259cqw', top: '4.907cqw', width: '93.056cqw', height: '3.981cqw' }}>
              <div className="h-full rounded-full bg-[#1C1917] transition-[width] duration-300 ease-linear" style={{ width: `max(3.981cqw, ${Math.min(100, Math.max(0, (1 - (((pauseEnd ?? now) - now) / pauseTotal)) * 100))}%)` }} />
            </div>
            <p className="hw absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[#1e1e1e] tabular-nums" style={{ top: '9.167cqw', fontSize: '4.444cqw' }} aria-live="off">{fmtHMS(secondsLeft)}</p>
            {/* Svansen ritas som egen bild bakom bubblan; svansen inbyggd i bubble-pause.svg klipps bort av sitt filter */}
            <div className="absolute flex items-center justify-center" style={{ left: '40.926cqw', top: '26.796cqw', width: '15.73cqw', height: '15.025cqw' }}>
              <div className="flex-none rotate-[27.26deg]">
                <div className="relative" style={{ width: '12.235cqw', height: '10.598cqw' }}>
                  <div className="absolute inset-[-30.27%_-7.23%_-13.33%_-26.64%]"><img src={`${A}/bubble-tail-pause.svg`} alt="" className="block size-full max-w-none" /></div>
                </div>
              </div>
            </div>
            <img src={`${A}/bubble-pause.svg`} alt="" className="absolute max-w-none" style={{ left: '3.872cqw', top: '21.039cqw', width: '56.515cqw', height: '21.226cqw' }} />
            <span className="sr-only">EN PAUS OM DAGEN HÅLLER KORNA I HAGEN.</span>
          </div>
        )}
        </div>
        <nav className="absolute inset-x-0 bottom-0 flex snap-x snap-proximity gap-1 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pt-3 [scroll-padding-inline:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['ALLT', ...cats.map((c) => c.name)].map((n) => (
            <button key={n} data-tab={n} onPointerDown={(e) => startTabPress(e, n)} onContextMenu={(e) => e.preventDefault()} onClick={(e) => { if (justDragged.current) return; setDir(cats.findIndex((c) => c.name === n) > cats.findIndex((c) => c.name === tab) ? 'next' : 'prev'); setTab(n); const b = e.currentTarget, nav = b.parentElement!; nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' }) }} className={`tab hd shrink-0 select-none [-webkit-touch-callout:none] origin-bottom snap-start rounded-t-lg ${tabDrag === n ? 'relative z-10' : ''} active:scale-95 border-x-[3px] border-t-[3px] border-[#1C1917] px-3 py-1 text-[length:var(--t-0)] ${tab === n ? 'bg-[#EFE7DC] pb-1.5 pt-1.5' : 'translate-y-[3px] bg-[#1C1917] text-[#EFE7DC] hover:translate-y-0'}`}>{n}</button>
          ))}
          <button aria-label="Ny kategori" onClick={() => setAddCat('')} className="tab hd shrink-0 origin-bottom snap-start rounded-t-lg border-[3px] border-b-0 transition-transform active:scale-95 hover:translate-y-[1px] border-[#1C1917] bg-[#1C1917] px-3 text-[#EFE7DC]">+</button>
        </nav>
      </header>
      <div aria-hidden className="pointer-events-none sticky z-40 -mb-5 h-[23px] bg-[linear-gradient(to_bottom,#EFE7DC_0,#EFE7DC_3px,rgba(239,231,220,0)_100%)] transition-[top] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ top: `calc(${headerH} - 3px)` }} />
      <main ref={bandRef} className={`will-change-transform flex flex-col gap-8 rounded-t-lg px-4 pt-8 ${quickId ? 'pb-[55dvh]' : 'pb-32'}`}>
        <div key={tab} className={`flex flex-col gap-8 ${dir === 'next' ? 'a-in-r' : 'a-in-l'}`}>
        {active.length === 0 && (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="hw">Här verkar det vara tomt! :)</p>
          </div>
        )}
        {[...active.map(Card), ...(left.length > 0 ? [<div key="divider" data-divider className="flex items-center gap-2"><div className="flex-1 border-t-[3px] border-dashed border-[#1C1917]" /><span className="hd text-[length:var(--t-0)]">OFÄRDIGT</span><div className="flex-1 border-t-[3px] border-dashed border-[#1C1917]" /></div>, ...left.map(Card)] : [])]}
        {tab !== 'ALLT' && (
          <button className="btn a-fade self-center" style={{ background: color(tab) }} onClick={() => { const c = cats.find((x) => x.name === tab); if (c) setCatEdit({ orig: c.name, name: c.name, color: c.color, idx: cats.indexOf(c), del: false, err: '' }) }}><img src={`${A}/gear.svg`} alt="" className="mr-2 inline-block h-[1.25em] w-auto align-[-0.2em]" />REDIGERA KATEGORI</button>
        )}
        </div>
      </main>

      {quickId === null && <AddListButton fill={tab === 'ALLT' ? '#6DA0B6' : color(tab)} onClick={() => setEditor({})} />}
      {party && <Confetti origin={party} onDone={() => setParty(null)} />}
      {editor && <Editor justAdded={justAdded} onAddedHandled={() => setJustAdded(null)} onAddCat={() => setAddCat('')} init={editor.list} cats={cats} defCat={tab === 'ALLT' ? cats[0]?.name : tab} onSave={saveList} onClose={() => setEditor(null)} onDelete={editor.list ? () => { setDel(editor.list!); setEditor(null) } : undefined} />}
      {del && (
        <Modal onClose={() => setDel(null)}>
          <h2 className="hd text-[length:var(--t-2)]">RADERA "{del.title}"?</h2>
          <p className="hw">Listan tas bort permanent.</p>
          <div className="flex gap-2">
            <button className="btn !bg-[#EA5354]" onClick={() => { setLists(lists.filter((x) => x.id !== del.id)); setDel(null) }}>JA, RADERA</button>
            <button className="btn" onClick={() => setDel(null)}>AVBRYT</button>
          </div>
        </Modal>
      )}
      {finish && (
        <Modal onClose={() => setFinish(null)}>
          <h2 className="hd text-[length:var(--t-2)]">VILL DU SPARA DINA OFÄRDIGA TASKS?</h2>
          <p className="hw">Markerade tasks sparas under "Ofärdigt".</p>
          <div className="-mx-1 flex max-h-[42dvh] flex-col gap-3 overflow-y-auto overscroll-contain px-1 py-1">
          {unfinished(finish.list).map((t) => (
            <button key={t.id} type="button" onClick={() => setFinish({ ...finish, sel: finish.sel.includes(t.id) ? finish.sel.filter((x) => x !== t.id) : [...finish.sel, t.id] })} className={`hw flex items-center gap-2 rounded-lg border-[3px] px-2 py-1 text-left transition-all duration-200 ${finish.sel.includes(t.id) ? 'border-[#1C1917] bg-white/40' : 'border-transparent opacity-50'}`}>
              <img src={`${A}/225a9.svg`} alt="" className="size-[25px] shrink-0" />{t.text}
            </button>
          ))}
          </div>
          <button className="btn !bg-[#439775]" onClick={() => confirmFinish(true)}>JA, SPARA TASKS!</button>
          <button className="btn !bg-[#EA5354]" onClick={() => confirmFinish(false)}>NEJ, RADERA TASKS.</button>
        </Modal>
      )}
      {suggest && (
        <Modal onClose={() => confirmSuggest(false)}>
          <h2 className="hd text-[length:var(--t-2)]">LÄGG TILL OFÄRDIGA TASKS?</h2>
          <p className="hw">Du har ofärdiga tasks i {suggest.list.cat}. Vill du lägga till dem i "{suggest.list.title}"?</p>
          <div className="-mx-1 flex max-h-[42dvh] flex-col gap-3 overflow-y-auto overscroll-contain px-1 py-1">
          {lists.filter((x) => x.leftover && x.cat === suggest.list.cat).flatMap((x) => x.sections.flatMap((s) => s.items.filter((t) => !t.pause))).map((t) => (
            <button key={t.id} type="button" onClick={() => setSuggest({ ...suggest, sel: suggest.sel.includes(t.id) ? suggest.sel.filter((x) => x !== t.id) : [...suggest.sel, t.id] })} className={`hw flex items-center gap-2 rounded-lg border-[3px] px-2 py-1 text-left transition-all duration-200 ${suggest.sel.includes(t.id) ? 'border-[#1C1917] bg-white/40' : 'border-transparent opacity-50'}`}>
              <img src={`${A}/225a9.svg`} alt="" className="size-[25px] shrink-0" />{t.text}
            </button>
          ))}
          </div>
          <button className="btn !bg-[#439775]" onClick={() => confirmSuggest(true)}>JA, LÄGG TILL!</button>
          <button className="btn" onClick={() => confirmSuggest(false)}>NEJ TACK</button>
        </Modal>
      )}
      {catEdit && (() => {
        const ce = catEdit
        const n = lists.filter((l) => l.cat === ce.orig).length
        const close = () => setCatEdit(null)
        const save = () => {
          const name = ce.name.trim().toUpperCase()
          if (!name) return setCatEdit({ ...ce, err: 'Kategorin behöver ett namn.' })
          if (name !== ce.orig && cats.some((c) => c.name === name)) return setCatEdit({ ...ce, err: 'Det finns redan en kategori med det namnet.' })
          const rest = cats.filter((c) => c.name !== ce.orig)
          if (ce.idx !== cats.findIndex((c) => c.name === ce.orig)) setManual(false) // ny flikordning gäller igen på ALLT
          rest.splice(Math.min(ce.idx, rest.length), 0, { name, color: ce.color })
          setCats(rest)
          setLists(lists.map((l) => (l.cat === ce.orig ? { ...l, cat: name } : l)))
          setTab(name); close()
        }
        if (ce.del)
          return (
            <Modal onClose={() => setCatEdit({ ...ce, del: false })}>
              <h2 className="hd text-[length:var(--t-2)]">RADERA "{ce.orig}"?</h2>
              <p className="hw">{n > 0 ? `Kategorin och ${n} ${n === 1 ? 'lista' : 'listor'} i den raderas permanent.` : 'Kategorin raderas permanent.'}</p>
              <button className="btn !bg-[#EA5354]" onClick={() => { setCats(cats.filter((c) => c.name !== ce.orig)); setLists(lists.filter((l) => l.cat !== ce.orig)); setTab('ALLT'); close() }}>JA, RADERA</button>
              <button className="btn" onClick={() => setCatEdit({ ...ce, del: false })}>AVBRYT</button>
            </Modal>
          )
        return (
          <Modal onClose={close}>
            <h2 className="hd text-[length:var(--t-2)]">REDIGERA KATEGORI</h2>
            <label className="hd text-[length:var(--t-0)]">NAMN
              <input className="hw mt-1 w-full rounded-md border-[3px] border-[#1C1917] bg-white/60 px-2 py-1 uppercase outline-none transition-shadow focus:shadow-[3px_3px_0_#1C1917]" value={ce.name} onChange={(e) => setCatEdit({ ...ce, name: e.target.value.toUpperCase(), err: '' })} />
            </label>
            <div>
              <p className="hd text-[length:var(--t-0)]">FÄRG</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} aria-label={`Färg ${c}`} onClick={() => setCatEdit({ ...ce, color: c })} className={`size-9 rounded-full border-[3px] border-[#1C1917] transition-transform duration-200 ${ce.color === c ? 'scale-110 shadow-[3px_3px_0_#1C1917]' : 'hover:scale-105'}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <p className="hd text-[length:var(--t-0)]">PLACERING I FLIKARNA ({ce.idx + 1} AV {cats.length})</p>
              <div className="mt-1 flex gap-2">
                <button className="btn disabled:opacity-40" disabled={ce.idx === 0} onClick={() => setCatEdit({ ...ce, idx: ce.idx - 1 })}>FLYTTA VÄNSTER</button>
                <button className="btn disabled:opacity-40" disabled={ce.idx >= cats.length - 1} onClick={() => setCatEdit({ ...ce, idx: ce.idx + 1 })}>FLYTTA HÖGER</button>
              </div>
            </div>
            {ce.err && <p className="hw a-msg text-[#EA5354]">{ce.err}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn !bg-[#439775]" onClick={save}>SPARA</button>
              <button className="btn" onClick={close}>AVBRYT</button>
              <button className="btn !bg-[#EA5354]" onClick={() => setCatEdit({ ...ce, del: true })}>RADERA KATEGORI</button>
            </div>
          </Modal>
        )
      })()}
      {addCat !== null && (
        <Modal onClose={() => setAddCat(null)}>
          <h2 className="hd text-[length:var(--t-2)]">NY KATEGORI</h2>
          <label className="hd text-[length:var(--t-0)]">NAMN
            <input autoFocus className="field hw mt-1 uppercase" value={addCat} onChange={(e) => setAddCat(e.target.value.toUpperCase())} />
          </label>
          <div>
            <p className="hd text-[length:var(--t-0)]">FÄRG</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Färg ${c}`} aria-pressed={addColor === c} onClick={() => setAddColor(c)} className={`size-9 cursor-pointer rounded-full border-[3px] border-[#1C1917] transition-transform duration-200 ${addColor === c ? 'scale-110 shadow-[3px_3px_0_#1C1917]' : 'hover:scale-105'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn !bg-[#439775]" onClick={() => { const n = addCat.trim(); if (n && !cats.some((c) => c.name === n)) { setCats([...cats, { name: n, color: addColor }]); if (editor) setJustAdded(n); else setTab(n) } setAddCat(null) }}>SKAPA</button>
            <button className="btn" onClick={() => setAddCat(null)}>AVBRYT</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

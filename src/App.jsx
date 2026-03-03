import React, { useState, useRef, useCallback, useEffect } from 'react'
import { toPng, toJpeg } from 'html-to-image'
import {
  AlignLeft, AlignCenter, AlignRight, Download, Loader2,
  AlignVerticalJustifyCenter, AlignStartVertical, ChevronDown,
  ImageIcon, Bold, Italic, SlidersHorizontal, X, Save, FolderOpen,
  Layers, Trash2, SquareDashed, Type, Settings2, Palette,
} from 'lucide-react'

// ─── UI Primitives (NEW) ──────────────────────────────────────────────────────

function SectionLabelNew({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-400">{children}</span>
      <div className="flex-1 border-t border-zinc-100" />
    </div>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      {label && <span className="text-[10px] font-medium text-zinc-400 block mb-1.5">{label}</span>}
      <label className="flex items-center gap-2.5 px-3 py-2 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-300 transition-colors">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent p-0 shrink-0" />
        <span className="text-xs font-mono text-zinc-500 tracking-wider">{value}</span>
      </label>
    </div>
  )
}

function SegmentControl({ options, value, onChange }) {
  return (
    <div className="flex bg-zinc-100 rounded-xl p-0.5 gap-0.5">
      {options.map((opt) => (
        <button key={opt.value ?? opt} onClick={() => onChange(opt.value ?? opt)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            (opt.value ?? opt) === value
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}>
          {opt.label ?? opt}
        </button>
      ))}
    </div>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '1:1', sublabel: 'Square', width: 1080, height: 1080 },
  { label: '4:5', sublabel: 'Portrait', width: 1080, height: 1350 },
  { label: '9:16', sublabel: 'Story', width: 1080, height: 1920 },
]

const FONTS = [
  {
    label: 'Modern',
    value: 'Inter',
    family: "'Inter', sans-serif",
    description: 'Clean & geometric',
  },
  {
    label: 'Elegant',
    value: 'Playfair Display',
    family: "'Playfair Display', serif",
    description: 'Literary & refined',
  },
  {
    label: 'Classic',
    value: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    description: 'Precise & rhythmic',
  },
]

const THEMES = [
  { label: 'Poem',  bg: '#ffffff', text: '#000000', desc: 'White · Black' },
  { label: 'Night', bg: '#000000', text: '#ffffff', desc: 'Black · White' },
  { label: 'Dusk',  bg: '#1a1a2e', text: '#e0e0ff', desc: 'Navy · Lavender' },
  { label: 'Parch', bg: '#f5f0e8', text: '#2c2416', desc: 'Cream · Sepia' },
]

const GRAD_PRESETS = [
  { label: 'Violet', c1: '#667eea', c2: '#764ba2', angle: 135 },
  { label: 'Sunset', c1: '#f093fb', c2: '#f5576c', angle: 135 },
  { label: 'Ocean',  c1: '#4facfe', c2: '#00f2fe', angle: 135 },
  { label: 'Forest', c1: '#43e97b', c2: '#38f9d7', angle: 135 },
  { label: 'Ember',  c1: '#fa709a', c2: '#fee140', angle: 45  },
  { label: 'Slate',  c1: '#30cfd0', c2: '#330867', angle: 135 },
]

const FRAME_STYLES = [
  { value: 'none',   label: 'None'   },
  { value: 'solid',  label: 'Line'   },
  { value: 'double', label: 'Double' },
  { value: 'inset',  label: 'Inset'  },
  { value: 'corner', label: 'Corner' },
  { value: 'thick',  label: 'Thick'  },
]

const MOBILE_TABS = [
  { id: 'text',     icon: Type,         label: 'Text'  },
  { id: 'style',    icon: Palette,      label: 'Style' },
  { id: 'frame',    icon: SquareDashed, label: 'Frame' },
  { id: 'settings', icon: Settings2,    label: 'More'  },
]

const DEFAULT_POEM = `In the hush of dusk\nthe poem finds its shape—\nnot in the words\nbut in the silence\nbetween them.`

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Retained UI helpers ────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-zinc-100 my-6" />
}
function IconBtn({ active, onClick, title, children, size = 'md' }) {
  const pad = size === 'sm' ? 'p-1.5' : 'p-2'
  return (
    <button title={title} onClick={onClick}
      className={`${pad} rounded-lg transition-all duration-150 ${
        active
          ? 'bg-zinc-900 text-white shadow-sm'
          : 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100'
      }`}>
      {children}
    </button>
  )
}
function SliderRow({ label, min, max, step = 1, value, onChange, display }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-zinc-500">{label}</span>
        <span className="text-[11px] font-semibold text-zinc-700 tabular-nums bg-zinc-100 px-2 py-0.5 rounded-full">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

// ─── Frame overlay ────────────────────────────────────────────────────────────
function FrameOverlay({ style, color, width, gap, radius, scale }) {
  const w = Math.round(width * scale)
  const g = Math.round(gap * scale)
  if (style === 'none') return null
  if (style === 'solid') return <div className="absolute inset-0 pointer-events-none" style={{ border: `${w}px solid ${color}`, borderRadius: radius }} />
  if (style === 'thick') return <div className="absolute inset-0 pointer-events-none" style={{ border: `${Math.round(w * 2)}px solid ${color}`, borderRadius: radius }} />
  if (style === 'double') return (<>
    <div className="absolute inset-0 pointer-events-none" style={{ border: `${w}px solid ${color}`, borderRadius: radius }} />
    <div className="absolute pointer-events-none" style={{ inset: g, border: `${w}px solid ${color}`, borderRadius: Math.max(0, radius - 4) }} />
  </>)
  if (style === 'inset') return <div className="absolute pointer-events-none" style={{ inset: g, border: `${w}px solid ${color}`, borderRadius: radius }} />
  if (style === 'corner') {
    const cSize = Math.round(32 * scale)
    const cW = Math.round(w * 1.5)
    const corners = [
      { top: g, left: g,     borderTop: `${cW}px solid ${color}`, borderLeft:  `${cW}px solid ${color}` },
      { top: g, right: g,    borderTop: `${cW}px solid ${color}`, borderRight: `${cW}px solid ${color}` },
      { bottom: g, left: g,  borderBottom: `${cW}px solid ${color}`, borderLeft:  `${cW}px solid ${color}` },
      { bottom: g, right: g, borderBottom: `${cW}px solid ${color}`, borderRight: `${cW}px solid ${color}` },
    ]
    return <>{corners.map((s, i) => <div key={i} className="absolute pointer-events-none" style={{ ...s, width: cSize, height: cSize }} />)}</>
  }
  return null
}

// ─── Watermark ────────────────────────────────────────────────────────────────
function WatermarkBar({ text, fontFamily, color, size, align, padding, scale }) {
  if (!text) return null
  const fs = Math.round(size * scale)
  const pb = Math.round(padding * scale * 0.6)
  const px = Math.round(padding * scale * 0.8)
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ paddingBottom: pb, paddingLeft: px, paddingRight: px }}>
      <p style={{ fontFamily, fontSize: fs, color, textAlign: align, margin: 0, opacity: 0.7 }}>{text}</p>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function App() {
  // Text
  const [poem, setPoem]                   = useState(DEFAULT_POEM)
  const [isBold, setIsBold]               = useState(false)
  const [isItalic, setIsItalic]           = useState(false)
  const [isUppercase, setIsUppercase]     = useState(false)
  const [fontSize, setFontSize]           = useState(38)
  const [lineHeight, setLineHeight]       = useState(1.5)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [align, setAlign]                 = useState('center')
  const [vCenter, setVCenter]             = useState(true)
  const [font, setFont]                   = useState(FONTS[0])
  const [textColor, setTextColor]         = useState('#000000')
  const [padding, setPadding]             = useState(80)
  // Background
  const [bgType, setBgType]               = useState('solid')
  const [bgColor, setBgColor]             = useState('#ffffff')
  const [gradColor1, setGradColor1]       = useState('#667eea')
  const [gradColor2, setGradColor2]       = useState('#764ba2')
  const [gradAngle, setGradAngle]         = useState(135)
  // Watermark
  const [watermark, setWatermark]         = useState('')
  const [watermarkSize, setWatermarkSize] = useState(18)
  const [watermarkAlign, setWatermarkAlign] = useState('center')
  // Frame
  const [frameStyle, setFrameStyle]       = useState('none')
  const [frameColor, setFrameColor]       = useState('#000000')
  const [frameWidth, setFrameWidth]       = useState(6)
  const [frameGap, setFrameGap]           = useState(20)
  const [frameRadius, setFrameRadius]     = useState(0)
  // Canvas & preset
  const [preset, setPreset]               = useState(PRESETS[0])
  // Export
  const [exporting, setExporting]         = useState(false)
  const [batchExporting, setBatchExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [exportFormat, setExportFormat]   = useState('png')
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  // Saved presets
  const [savedPresets, setSavedPresets]   = useState([])
  const [presetName, setPresetName]       = useState('')
  // Mobile
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [activeTab, setActiveTab]         = useState('text')

  const canvasRef  = useRef(null)
  const wrapperRef = useRef(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ w: 0, h: 0 })

  // ── Load saved presets ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem('poetry-canvas-presets')
      if (stored) setSavedPresets(JSON.parse(stored))
    } catch (_) {}
  }, [])

  // ── Responsive canvas sizing ──
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return
      const { width, height } = wrapperRef.current.getBoundingClientRect()
      const ratio = preset.height / preset.width
      const maxW = width - 40
      const maxH = height - 40
      let w = maxW
      let h = w * ratio
      if (h > maxH) { h = maxH; w = h / ratio }
      setCanvasDisplaySize({ w: Math.floor(w), h: Math.floor(h) })
    }
    update()
    const ro = new ResizeObserver(update)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [preset])

  // ── Save / Load presets ──
  const collectState = () => ({
    poem, isBold, isItalic, isUppercase, fontSize, lineHeight, letterSpacing,
    align, vCenter, font: font.value, textColor, padding,
    bgType, bgColor, gradColor1, gradColor2, gradAngle,
    watermark, watermarkSize, watermarkAlign,
    frameStyle, frameColor, frameWidth, frameGap, frameRadius,
    preset: preset.label,
  })

  const applyState = (s) => {
    if (s.poem !== undefined)           setPoem(s.poem)
    if (s.isBold !== undefined)         setIsBold(s.isBold)
    if (s.isItalic !== undefined)       setIsItalic(s.isItalic)
    if (s.isUppercase !== undefined)    setIsUppercase(s.isUppercase)
    if (s.fontSize !== undefined)       setFontSize(s.fontSize)
    if (s.lineHeight !== undefined)     setLineHeight(s.lineHeight)
    if (s.letterSpacing !== undefined)  setLetterSpacing(s.letterSpacing)
    if (s.align !== undefined)          setAlign(s.align)
    if (s.vCenter !== undefined)        setVCenter(s.vCenter)
    if (s.font !== undefined)           setFont(FONTS.find(f => f.value === s.font) || FONTS[0])
    if (s.textColor !== undefined)      setTextColor(s.textColor)
    if (s.padding !== undefined)        setPadding(s.padding)
    if (s.bgType !== undefined)         setBgType(s.bgType)
    if (s.bgColor !== undefined)        setBgColor(s.bgColor)
    if (s.gradColor1 !== undefined)     setGradColor1(s.gradColor1)
    if (s.gradColor2 !== undefined)     setGradColor2(s.gradColor2)
    if (s.gradAngle !== undefined)      setGradAngle(s.gradAngle)
    if (s.watermark !== undefined)      setWatermark(s.watermark)
    if (s.watermarkSize !== undefined)  setWatermarkSize(s.watermarkSize)
    if (s.watermarkAlign !== undefined) setWatermarkAlign(s.watermarkAlign)
    if (s.frameStyle !== undefined)     setFrameStyle(s.frameStyle)
    if (s.frameColor !== undefined)     setFrameColor(s.frameColor)
    if (s.frameWidth !== undefined)     setFrameWidth(s.frameWidth)
    if (s.frameGap !== undefined)       setFrameGap(s.frameGap)
    if (s.frameRadius !== undefined)    setFrameRadius(s.frameRadius)
    if (s.preset !== undefined)         setPreset(PRESETS.find(p => p.label === s.preset) || PRESETS[0])
  }

  const saveCurrentPreset = () => {
    const name = presetName.trim() || `Preset ${savedPresets.length + 1}`
    const next = [...savedPresets, { id: Date.now(), name, state: collectState() }]
    setSavedPresets(next)
    localStorage.setItem('poetry-canvas-presets', JSON.stringify(next))
    setPresetName('')
  }
  const deletePreset = (id) => {
    const next = savedPresets.filter(p => p.id !== id)
    setSavedPresets(next)
    localStorage.setItem('poetry-canvas-presets', JSON.stringify(next))
  }

  // ── Export ──
  const buildOpts = (targetPreset, displayW, displayH) => ({
    cacheBust: true,
    width: targetPreset.width,
    height: targetPreset.height,
    style: {
      transform: `scale(${targetPreset.width / displayW}, ${targetPreset.height / displayH})`,
      transformOrigin: 'top left',
      width: `${displayW}px`,
      height: `${displayH}px`,
    },
  })

  const doDownload = async (node, opts, fmt, filename) => {
    const url = fmt === 'jpeg' ? await toJpeg(node, { ...opts, quality: 0.96 }) : await toPng(node, opts)
    const a = document.createElement('a')
    a.download = filename; a.href = url; a.click()
  }

  const handleExport = useCallback(async (fmt) => {
    if (!canvasRef.current) return
    setExporting(true); setShowFormatMenu(false)
    try {
      const node = canvasRef.current
      await doDownload(node, buildOpts(preset, node.offsetWidth, node.offsetHeight), fmt,
        `poetry-${preset.label.replace(':', '-')}-${Date.now()}.${fmt}`)
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }, [preset])

  const handleBatchExport = useCallback(async () => {
    if (!canvasRef.current) return
    setBatchExporting(true); setBatchProgress(0)
    const node = canvasRef.current
    const dW = node.offsetWidth, dH = node.offsetHeight
    try {
      for (let i = 0; i < PRESETS.length; i++) {
        const p = PRESETS[i]
        await doDownload(node, buildOpts(p, dW, dH), exportFormat, `poetry-${p.label.replace(':', '-')}.${exportFormat}`)
        setBatchProgress(i + 1)
        await delay(400)
      }
    } catch (e) { console.error(e) }
    finally { setBatchExporting(false); setBatchProgress(0) }
  }, [exportFormat])

  const applyTheme = (t) => { setBgColor(t.bg); setTextColor(t.text); setBgType('solid') }

  // ── Derived values ──
  const scaleFactor     = canvasDisplaySize.w > 0 ? canvasDisplaySize.w / preset.width : 1
  const displayFontSize = Math.round(fontSize * scaleFactor)
  const displayPadding  = Math.round(padding * scaleFactor)
  const bgStyle = bgType === 'gradient'
    ? { background: `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})` }
    : { backgroundColor: bgColor }

  // ══════════════════════════════════════════════════════════════════
  //  TAB PANELS
  // ══════════════════════════════════════════════════════════════════

  const PanelText = () => (
    <div>
      <SectionLabelNew>Poem</SectionLabelNew>
      <textarea value={poem} onChange={(e) => setPoem(e.target.value)}
        placeholder="Write your poem here…" rows={7}
        className="w-full text-sm text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:bg-white transition-all placeholder:text-zinc-300 resize-none mb-6"
        style={{ fontFamily: font.family }}
      />

      <SectionLabelNew>Formatting</SectionLabelNew>
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex bg-zinc-100 rounded-xl p-0.5 gap-0.5">
          <IconBtn active={isBold}      onClick={() => setIsBold(v => !v)}      title="Bold"      size="sm"><Bold size={13} /></IconBtn>
          <IconBtn active={isItalic}    onClick={() => setIsItalic(v => !v)}    title="Italic"    size="sm"><Italic size={13} /></IconBtn>
          <IconBtn active={isUppercase} onClick={() => setIsUppercase(v => !v)} title="Uppercase" size="sm">
            <span className="text-[11px] font-bold leading-none select-none">AG</span>
          </IconBtn>
        </div>
        <div className="flex bg-zinc-100 rounded-xl p-0.5 gap-0.5">
          <IconBtn active={align === 'left'}   onClick={() => setAlign('left')}   title="Align Left"   size="sm"><AlignLeft size={13} /></IconBtn>
          <IconBtn active={align === 'center'} onClick={() => setAlign('center')} title="Align Center" size="sm"><AlignCenter size={13} /></IconBtn>
          <IconBtn active={align === 'right'}  onClick={() => setAlign('right')}  title="Align Right"  size="sm"><AlignRight size={13} /></IconBtn>
        </div>
        <div className="flex bg-zinc-100 rounded-xl p-0.5 gap-0.5">
          <IconBtn active={vCenter}  onClick={() => setVCenter(true)}  title="Center vertically" size="sm"><AlignVerticalJustifyCenter size={13} /></IconBtn>
          <IconBtn active={!vCenter} onClick={() => setVCenter(false)} title="Align top"         size="sm"><AlignStartVertical size={13} /></IconBtn>
        </div>
      </div>

      <SectionLabelNew>Typeface</SectionLabelNew>
      <div className="space-y-2 mb-6">
        {FONTS.map((f) => (
          <button key={f.value} onClick={() => setFont(f)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all duration-150 ${
              font.value === f.value
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
            }`}>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ fontFamily: f.family }}>{f.label}</p>
              <p className="text-[10px] mt-1 text-zinc-400">{f.description}</p>
            </div>
            <span className={`text-xl italic select-none ${font.value === f.value ? 'text-zinc-400' : 'text-zinc-300'}`}
              style={{ fontFamily: f.family }}>Aa</span>
          </button>
        ))}
      </div>

      <SectionLabelNew>Typography</SectionLabelNew>
      <SliderRow label="Font Size"      min={12}  max={120} value={fontSize}   onChange={setFontSize}   display={`${fontSize}px`} />
      <SliderRow label="Line Height"    min={10}  max={30}  value={Math.round(lineHeight * 10)} onChange={v => setLineHeight(v / 10)} display={lineHeight.toFixed(1)} />
      <SliderRow label="Letter Spacing" min={-5}  max={20}  value={letterSpacing} onChange={setLetterSpacing} display={`${letterSpacing > 0 ? '+' : ''}${letterSpacing}px`} />
      <SliderRow label="Padding"        min={0}   max={240} step={8} value={padding} onChange={setPadding} display={`${padding}px`} />
    </div>
  )

  const PanelStyle = () => (
    <div>
      <SectionLabelNew>Canvas Format</SectionLabelNew>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => setPreset(p)}
            className={`flex flex-col items-center py-3 rounded-2xl border transition-all duration-150 ${
              preset.label === p.label
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
            }`}>
            <span className="text-sm font-bold">{p.label}</span>
            <span className={`text-[10px] mt-0.5 font-medium ${preset.label === p.label ? 'text-zinc-400' : 'text-zinc-400'}`}>{p.sublabel}</span>
          </button>
        ))}
      </div>

      <Divider />

      <SectionLabelNew>Quick Theme</SectionLabelNew>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {THEMES.map((t) => {
          const isActive = bgType === 'solid' && bgColor === t.bg && textColor === t.text
          return (
            <button key={t.label} onClick={() => applyTheme(t)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-150 ${
                isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}>
              <span className="w-5 h-5 rounded-lg border border-zinc-300 shrink-0 shadow-sm" style={{ background: t.bg }} />
              <div className="text-left">
                <p className="text-xs font-semibold leading-none">{t.label}</p>
                <p className={`text-[10px] mt-0.5 ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>{t.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      <Divider />

      <SectionLabelNew>Background</SectionLabelNew>
      <SegmentControl
        options={[{ label: 'Solid', value: 'solid' }, { label: 'Gradient', value: 'gradient' }]}
        value={bgType}
        onChange={setBgType}
      />

      {bgType === 'solid' ? (
        <div className="mt-4 grid grid-cols-2 gap-3 mb-6">
          <ColorInput label="Background" value={bgColor} onChange={setBgColor} />
          <ColorInput label="Text" value={textColor} onChange={setTextColor} />
        </div>
      ) : (
        <div className="mt-4 mb-6">
          <span className="text-[10px] font-medium text-zinc-400 block mb-2">Gradient Presets</span>
          <div className="grid grid-cols-6 gap-1.5 mb-4">
            {GRAD_PRESETS.map((g) => (
              <button key={g.label} onClick={() => { setGradColor1(g.c1); setGradColor2(g.c2); setGradAngle(g.angle) }}
                title={g.label}
                className="aspect-square rounded-xl border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ background: `linear-gradient(${g.angle}deg, ${g.c1}, ${g.c2})` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <ColorInput label="Color 1" value={gradColor1} onChange={setGradColor1} />
            <ColorInput label="Color 2" value={gradColor2} onChange={setGradColor2} />
          </div>
          <SliderRow label="Angle" min={0} max={360} value={gradAngle} onChange={setGradAngle} display={`${gradAngle}°`} />
          <ColorInput label="Text" value={textColor} onChange={setTextColor} />
        </div>
      )}

      <Divider />

      <SectionLabelNew>Author / Watermark</SectionLabelNew>
      <input type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)}
        placeholder="— @your_handle"
        className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:bg-white transition-all placeholder:text-zinc-300"
      />
      {watermark && (
        <div className="mt-4">
          <SliderRow label="Size" min={10} max={48} value={watermarkSize} onChange={setWatermarkSize} display={`${watermarkSize}px`} />
          <div className="mb-5">
            <span className="text-[11px] font-medium text-zinc-500 block mb-2">Alignment</span>
            <SegmentControl
              options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]}
              value={watermarkAlign}
              onChange={setWatermarkAlign}
            />
          </div>
        </div>
      )}
    </div>
  )

  const PanelFrame = () => (
    <div>
      <SectionLabelNew>Border Style</SectionLabelNew>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {FRAME_STYLES.map((f) => (
          <button key={f.value} onClick={() => setFrameStyle(f.value)}
            className={`py-2.5 rounded-2xl border text-xs font-semibold transition-all duration-150 ${
              frameStyle === f.value
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>
      {frameStyle !== 'none' && (
        <>
          <SectionLabelNew>Frame Color</SectionLabelNew>
          <div className="mb-3">
            <ColorInput label="" value={frameColor} onChange={setFrameColor} />
          </div>
          <div className="flex gap-2 flex-wrap mb-6">
            {['#000000','#ffffff','#c9a96e','#a0c4a1','#b4a7d6','#e8b4b8'].map(c => (
              <button key={c} onClick={() => setFrameColor(c)}
                className={`w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 ${
                  frameColor === c ? 'border-zinc-600 scale-110 shadow-sm' : 'border-zinc-200'
                }`}
                style={{ background: c }} />
            ))}
          </div>
          <SectionLabelNew>Frame Options</SectionLabelNew>
          <SliderRow label="Frame Width" min={1} max={30} value={frameWidth} onChange={setFrameWidth} display={`${frameWidth}px`} />
          {(frameStyle === 'double' || frameStyle === 'inset' || frameStyle === 'corner') && (
            <SliderRow label="Gap / Inset" min={4} max={80} value={frameGap} onChange={setFrameGap} display={`${frameGap}px`} />
          )}
          {(frameStyle === 'solid' || frameStyle === 'thick' || frameStyle === 'double') && (
            <SliderRow label="Corner Radius" min={0} max={60} value={frameRadius} onChange={setFrameRadius} display={`${frameRadius}px`} />
          )}
        </>
      )}
    </div>
  )

  const PanelSettings = () => (
    <div>
      <SectionLabelNew>Save Preset</SectionLabelNew>
      <div className="flex gap-2 mb-6">
        <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
          placeholder="Name this preset…"
          className="flex-1 text-sm bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:bg-white transition-all placeholder:text-zinc-300"
        />
        <button onClick={saveCurrentPreset}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
          <Save size={12} /> Save
        </button>
      </div>

      {savedPresets.length > 0 && (
        <>
          <SectionLabelNew>Saved · {savedPresets.length}</SectionLabelNew>
          <div className="space-y-1.5 max-h-52 overflow-y-auto mb-6">
            {savedPresets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 group">
                <button onClick={() => applyState(p.state)}
                  className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs text-zinc-700 font-medium transition-all text-left">
                  <FolderOpen size={12} className="text-zinc-300 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
                <button onClick={() => deletePreset(p.id)}
                  className="p-1.5 rounded-lg text-zinc-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Divider />

      <SectionLabelNew>Batch Export</SectionLabelNew>
      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
        Downloads <span className="font-semibold text-zinc-500">1:1</span>, <span className="font-semibold text-zinc-500">4:5</span> and <span className="font-semibold text-zinc-500">9:16</span> at 1080px — three files at once.
      </p>
      <button onClick={handleBatchExport} disabled={batchExporting || exporting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all shadow-sm">
        {batchExporting ? (
          <><Loader2 size={14} className="animate-spin" /> Exporting {batchProgress} / {PRESETS.length}…</>
        ) : (
          <><Layers size={14} /> Export All 3 Ratios</>
        )}
      </button>
    </div>
  )

  const renderPanel = () => {
    if (activeTab === 'text')     return <PanelText />
    if (activeTab === 'style')    return <PanelStyle />
    if (activeTab === 'frame')    return <PanelFrame />
    if (activeTab === 'settings') return <PanelSettings />
    return <PanelText />
  }

  // ── Shared tab nav ──
  const TabNav = ({ mobile = false }) => (
    <div className={`flex gap-1 ${mobile ? '' : ''}`}>
      {MOBILE_TABS.map((t) => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold tracking-wide transition-all duration-150 ${
              isActive
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}>
            <Icon size={13} />{t.label}
          </button>
        )
      })}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="h-[100dvh] flex flex-col bg-zinc-100 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <header className="shrink-0 h-14 bg-white border-b border-zinc-200 flex items-center px-4 md:px-5 gap-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
            <ImageIcon size={13} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-zinc-900">Poetry Canvas</span>
            <span className="hidden sm:inline text-xs text-zinc-300 ml-2 font-normal">for Instagram</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Format picker */}
          <div className="relative">
            <button onClick={() => setShowFormatMenu(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
              {exportFormat}<ChevronDown size={10} />
            </button>
            {showFormatMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFormatMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden min-w-[72px]">
                  {['png','jpeg'].map(f => (
                    <button key={f} onClick={() => { setExportFormat(f); setShowFormatMenu(false) }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-widest transition-colors ${
                        exportFormat === f ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export button */}
          <button onClick={() => handleExport(exportFormat)} disabled={exporting || batchExporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex w-72 shrink-0 bg-white border-r border-zinc-100 flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-zinc-100">
            <TabNav />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {renderPanel()}
          </div>
          <div className="shrink-0 px-5 py-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] text-zinc-300 font-medium tabular-nums">{preset.width} × {preset.height}px</span>
            <span className="text-[10px] text-zinc-300 font-medium">{preset.sublabel}</span>
          </div>
        </aside>

        {/* ── Canvas ── */}
        <main ref={wrapperRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{
            background: '#e8e8ec',
            backgroundImage: 'radial-gradient(circle, #d1d1d8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}>
          {canvasDisplaySize.w > 0 && (
            <div
              style={{
                width: canvasDisplaySize.w,
                height: canvasDisplaySize.h,
                boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
                borderRadius: 4,
              }}
              className="relative">

              {/* Captured node */}
              <div ref={canvasRef}
                style={{
                  ...bgStyle,
                  width: canvasDisplaySize.w,
                  height: canvasDisplaySize.h,
                  padding: displayPadding,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: vCenter ? 'center' : 'flex-start',
                  alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                <pre style={{
                  fontFamily: font.family,
                  fontSize: displayFontSize,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing * scaleFactor}px`,
                  color: textColor,
                  textAlign: align,
                  margin: 0, padding: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  width: '100%',
                  background: 'transparent',
                  fontWeight: isBold ? 700 : 400,
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textTransform: isUppercase ? 'uppercase' : 'none',
                }}>
                  {poem}
                </pre>
                <WatermarkBar text={watermark} fontFamily={font.family} color={textColor}
                  size={watermarkSize} align={watermarkAlign} padding={padding} scale={scaleFactor} />
                <FrameOverlay style={frameStyle} color={frameColor} width={frameWidth}
                  gap={frameGap} radius={frameRadius} scale={scaleFactor} />
              </div>

              {/* Export overlay */}
              {(exporting || batchExporting) && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2.5 bg-white shadow-xl rounded-2xl px-5 py-3 border border-zinc-100">
                    <Loader2 size={14} className="animate-spin text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-700">
                      {batchExporting ? `Exporting ${batchProgress + 1} / ${PRESETS.length}…` : `Rendering at ${preset.width}px…`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ══ Mobile bottom sheet backdrop ══ */}
      <div
        className={`md:hidden fixed inset-0 bg-black/30 z-30 transition-opacity duration-300 ${mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* ══ Mobile bottom sheet ══ */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${mobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '86dvh' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-200 rounded-full" />
        </div>

        {/* Tabs + close */}
        <div className="flex items-center gap-2 px-3 pb-2 border-b border-zinc-100">
          <div className="flex-1">
            <TabNav mobile />
          </div>
          <button onClick={() => setMobileDrawerOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Panel content */}
        <div className="overflow-y-auto px-5 pt-5 pb-8" style={{ maxHeight: 'calc(86dvh - 110px)' }}>
          {renderPanel()}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setMobileDrawerOpen(true)}
        className="md:hidden fixed bottom-6 right-5 z-20 flex items-center gap-2 px-5 py-3.5 bg-zinc-900 text-white text-sm font-bold rounded-2xl shadow-2xl hover:bg-zinc-700 active:scale-95 transition-all">
        <SlidersHorizontal size={15} />
        <span>Edit</span>
      </button>
    </div>
  )
}

